import requests
from datetime import datetime
from collections import defaultdict
from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException
from firebase_admin import firestore
from urllib.parse import quote

from config.database import db
from config.limiter import limiter
from config.settings import (
    BASE_DOMAIN,
    SHOPEE_AFFILIATE_ID,
    ENABLE_SHOPEE,
    AT_API_KEY,
    TIKTOK_CAMPAIGN_ID,
    LAZADA_CAMPAIGN_ID,
    REQUEST_TIMEOUT,
    ECOMOBI_TOKEN
)
from middleware.auth import get_user_ratios
from utils.shortener import generate_short_code
from utils.url_cleaner import clean_shopee_url

router = APIRouter()

class LinkRequest(BaseModel):
    user_email: str
    original_url: str
    platform: str

class WithdrawalRequest(BaseModel):
    user_email: str
    amount: float
    bank_info: str

@router.get("/api/user/wallet")
@limiter.limit("30/minute")
def get_user_wallet(email: str, request: Request):
    orders = db.collection("orders") \
        .where("utm_source", "==", email) \
        .stream()

    total_approved = 0
    total_pending = 0
    for doc in orders:
        order = doc.to_dict()
        confirmed = int(order.get("confirmed", 0))
        status = int(order.get("status", 0))
        u_ratio, _, _ = get_user_ratios(email)
        cashback = float(order.get("reward", 0)) * u_ratio

        if confirmed == 1:
            total_approved += cashback
        elif status != 2:
            total_pending += cashback

    approved_withdraw = sum(
        d.to_dict().get("amount", 0)
        for d in db.collection("withdrawals")
        .where("user_email", "==", email)
        .where("status", "==", "approved")
        .stream()
    )

    pending_withdraw = sum(
        d.to_dict().get("amount", 0)
        for d in db.collection("withdrawals")
        .where("user_email", "==", email)
        .where("status", "==", "pending")
        .stream()
    )

    available = max(
        total_approved - approved_withdraw - pending_withdraw,
        0
    )
    return {
        "success": True,
        "balance": round(available),
        "pending": round(total_pending),
        "withdrawn": round(approved_withdraw)
    }

@router.post("/api/convert")
@limiter.limit("30/minute") 
async def convert_link(request: Request, body: LinkRequest):
    headers = {
        "Authorization": f"Token {AT_API_KEY}",
        "Content-Type": "application/json",
        "accept": "application/json"
    }

    if body.platform == "tiktok":
        payload = {
            "product_url": body.original_url,
            "utm_source": body.user_email,
            "utm_medium": body.platform,
            "utm_campaign": "cashback"
        }
        response = requests.post(
            "https://api.accesstrade.vn/v2/tiktokshop_product_feeds/create_link",
            headers=headers,
            json=payload,
            timeout=REQUEST_TIMEOUT
        )
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Không thể kết nối AccessTrade")
        response_data = response.json()
        if not response_data.get("status"):
            msg = response_data.get("message", "Không thể tạo link")
            if msg == "invalid params": msg = "Link không hợp lệ hoặc chưa hỗ trợ hoàn tiền."
            elif "campaign" in msg.lower(): msg = "Sản phẩm chưa tham gia hoàn tiền."
            elif "not found" in msg.lower(): msg = "Không tìm thấy sản phẩm."
            elif "policy" in msg.lower() or "failed to be processed" in msg.lower(): 
                msg = "Sản phẩm này không hỗ trợ hoàn tiền đâu nè (do vi phạm chính sách sản phẩm của sàn) 🐰"
            raise HTTPException(status_code=400, detail=msg)
        data = response_data["data"]
        aff_link = data["aff_url"]
        
        # Tạo short code cho link TikTok
        short_code = generate_short_code()
        db.collection("short_urls").document(short_code).set({
            "long_url": aff_link,
            "created_at": firestore.SERVER_TIMESTAMP
        })
        short_link = f"https://tiktok.{BASE_DOMAIN}/{short_code}"
        
        product_name = data["product_name"]
        product_image = data["product_image"]
        
        price_info = data.get("product_price", {})
        product_price = float(price_info.get("maximum_amount") or price_info.get("minimum_amount") or 0)
        
        commission_info = data.get("product_commission", {})
        commission = float(commission_info.get("amount", 0))
        u_ratio, a_ratio, c_percent = get_user_ratios(body.user_email)
        cashback = round(commission * u_ratio)
        publisher_income = round(commission * a_ratio)

    elif body.platform == "shopee":
        if not ENABLE_SHOPEE:
            raise HTTPException(
                status_code=400,
                detail="Hoàn tiền Shopee đang được chuẩn bị và sẽ ra mắt sớm! Hiện tại bạn hãy trải nghiệm mua sắm qua TikTok Shop nhé 🐰"
            )
        product_name = f"Sản phẩm Shopee"
        product_image = ""
        product_price = 0.0
        commission = 0.0

        cleaned_url = clean_shopee_url(body.original_url)

        try:
            data_api_url = f"https://data.addlivetag.com/product-data/product-data.php?url={quote(cleaned_url)}"
            response_data = requests.get(data_api_url, timeout=REQUEST_TIMEOUT)
            if response_data.status_code == 200:
                res_json = response_data.json()
                if res_json.get("status") == "success" and res_json.get("productInfo"):
                    p_info = res_json["productInfo"]
                    product_name = p_info.get("productName", product_name)
                    product_price = float(p_info.get("price", 0.0))
                    product_image = p_info.get("imageUrl", "")
                    commission = float(p_info.get("commission", 0.0))
        except Exception as e:
            print(f"Shopee Product Data API error: {e}")

        if not product_image:
            product_image = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Shopee.svg/375px-Shopee.svg.png"

        sanitized_email = body.user_email.replace("-", "_").replace("@", "_at_").replace(".", "_")
        sub_id = f"hangthocashback-{sanitized_email}"
        encoded_url = quote(cleaned_url, safe="")
        aff_link = f"https://s.shopee.vn/an_redir?origin_link={encoded_url}&affiliate_id={SHOPEE_AFFILIATE_ID}&sub_id={sub_id}"

        # Tạo short code và định dạng link theo subdomain của bạn
        short_code = generate_short_code()
        db.collection("short_urls").document(short_code).set({
            "long_url": aff_link,
            "created_at": firestore.SERVER_TIMESTAMP
        })
        short_link = f"https://shopee.{BASE_DOMAIN}/{short_code}"

        u_ratio, a_ratio, c_percent = get_user_ratios(body.user_email)
        cashback = round(commission * u_ratio)
        publisher_income = round(commission * a_ratio)

    elif body.platform == "lazada":
        campaign_id = LAZADA_CAMPAIGN_ID
        if not campaign_id:
            raise HTTPException(
                status_code=400, 
                detail="Hoàn tiền Lazada đang được chuẩn bị và sẽ ra mắt sớm! Hiện tại bạn hãy trải nghiệm mua sắm qua TikTok Shop nhé 🐰"
            )

        payload = {
            "campaign_id": campaign_id,
            "urls": [body.original_url],
            "utm_source": body.user_email,
            "utm_medium": body.platform,
            "utm_campaign": "cashback"
        }
        response = requests.post(
            "https://api.accesstrade.vn/v1/product_link/create",
            headers=headers,
            json=payload,
            timeout=REQUEST_TIMEOUT
        )
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Không thể kết nối AccessTrade ({response.status_code})")
        
        response_data = response.json()
        if not response_data.get("success"):
            raise HTTPException(status_code=400, detail="Không thể tạo link liên kết cho sản phẩm này.")
            
        success_links = response_data.get("data", {}).get("success_link", [])
        if not success_links:
            raise HTTPException(status_code=400, detail="Tạo link thất bại. Vui lòng kiểm tra lại liên kết sản phẩm.")
            
        link_data = success_links[0]
        aff_link = link_data["aff_link"]
        
        # Tạo short code và định dạng link theo subdomain của bạn
        short_code = generate_short_code()
        db.collection("short_urls").document(short_code).set({
            "long_url": aff_link,
            "created_at": firestore.SERVER_TIMESTAMP
        })
        short_link = f"https://lazada.{BASE_DOMAIN}/{short_code}"
        
        product_name = f"Sản phẩm Lazada"
        if "lazada.vn/products/" in body.original_url:
            try:
                parts = body.original_url.split("lazada.vn/products/")[1].split("?")[0].split(".html")[0].split("-")
                if len(parts) > 0:
                    product_name = " ".join(parts[:-1])
            except Exception:
                pass
                
        product_image = "https://upload.wikimedia.org/wikipedia/commons/0/06/Lazada_Logo.png"
            
        product_price = 0.0
        commission = 0.0
        cashback = 0.0
        u_ratio, a_ratio, c_percent = get_user_ratios(body.user_email)
        publisher_income = round(commission * a_ratio)
    else:
        raise HTTPException(status_code=400, detail="Nền tảng không hợp lệ")

    client_ip = request.client.host

    db.collection("logs").add({
        "ip": client_ip, "email": body.user_email, "platform": body.platform,
        "url": body.original_url, "product_name": product_name, "created_at": firestore.SERVER_TIMESTAMP
    })
    db.collection("conversions").add({
        "user_email": body.user_email,
        "original_url": body.original_url,
        "platform": body.platform,
        "product_name": product_name,
        "product_price": product_price,
        "short_link": short_link,
        "aff_link": aff_link,
        "created_at": firestore.SERVER_TIMESTAMP,
        "status": "link_created"
    })
    
    _, _, c_percent = get_user_ratios(body.user_email)
    
    return {
        "success": True,
        "product": {"name": product_name, "image": product_image, "price": product_price},
        "commission": {"amount": commission, "cashback_percent": c_percent, "cashback": cashback, "publisher_income": publisher_income},
        "links": {"short": short_link, "affiliate": aff_link}
    }

@router.post("/api/withdrawals")
@limiter.limit("30/minute") 
async def create_withdrawal(request: Request, body: WithdrawalRequest):
    wallet = get_user_wallet(body.user_email, request)
    
    pending_request = db.collection("withdrawals")\
        .where("user_email","==",body.user_email)\
        .where("status","==","pending")\
        .stream()
    
    pending_amount = sum(w.to_dict()["amount"] for w in pending_request)
    
    if body.amount > wallet["balance"] - pending_amount:
        raise HTTPException(status_code=400, detail="Số dư khả dụng không đủ.")
        
    if body.amount < 100000:
        raise HTTPException(status_code=400, detail="Rút tối thiểu 100.000đ")
        
    db.collection("withdrawals").add({
        "user_email": body.user_email,
        "amount": body.amount,
        "bank_info": body.bank_info,
        "status": "pending",
        "balance_at_request": wallet["balance"],
        "created_at": firestore.SERVER_TIMESTAMP
    })
    return {"success": True, "message": "Yêu cầu rút tiền đã được gửi thành công!"}

@router.get("/api/user/withdrawals/history")
@limiter.limit("30/minute")
def get_user_withdrawals_history(email: str, request: Request):
    docs = db.collection("withdrawals").where("user_email", "==", email).stream()
    
    result = []
    for doc in docs:
        data = doc.to_dict()
        created_time = ""
        time_val = 0
        
        if "created_at" in data and data["created_at"]:
            try:
                if hasattr(data["created_at"], "timestamp"):
                    time_val = data["created_at"].timestamp()
                    created_time = data["created_at"].strftime("%d/%m/%Y %H:%M")
                elif isinstance(data["created_at"], str):
                    dt = datetime.fromisoformat(data["created_at"][:19])
                    time_val = dt.timestamp()
                    created_time = dt.strftime("%d/%m/%Y %H:%M")
            except:
                created_time = str(data["created_at"])
                
        result.append({
            "id": doc.id,
            "amount": data.get("amount", 0),
            "bank": data.get("bank_info", "N/A"),
            "status": data.get("status", "pending"),
            "date": created_time,
            "time_val": time_val
        })
        
    result.sort(key=lambda x: x["time_val"], reverse=True)
    for r in result:
        del r["time_val"]
        
    return {"success": True, "data": result}

@router.get("/api/user/history")
@limiter.limit("30/minute")
def get_user_history(email: str, request: Request):
    orders = db.collection("orders")\
        .where("utm_source","==",email)\
        .stream()
    result = []
    for doc in orders:
        order = doc.to_dict()
        if order.get("utm_source") != email:
            continue
        u_ratio, _, _ = get_user_ratios(email)
        cashback = float(order["reward"]) * u_ratio
        if order.get("confirmed") == 1:
            status = "approved"
        elif order.get("status") == 2:
            status = "rejected"
        else:
            status = "pending"
        result.append({
            "order_id": order["order_id"],
            "merchant": order.get("campaign_id"),
            "amount": order.get("product_price", 0),
            "cashback": round(cashback),
            "status": status,
            "time": order.get("sales_time")
        })
    result.sort(key=lambda x: x["time"], reverse=True)
    return {"success": True, "orders": result}

@router.get("/api/leaderboard")
def leaderboard():
    orders = db.collection("orders").stream()
    ranking = defaultdict(float)

    for doc in orders:
        order = doc.to_dict()
        email = order.get("utm_source")
        if not email:
            continue
        if int(order.get("confirmed", 0)) != 1:
            continue

        reward = float(order.get("reward", 0))
        u_ratio, _, _ = get_user_ratios(email)
        ranking[email] += reward * u_ratio

    result = []
    for email, total in ranking.items():
        user_doc = db.collection("users").document(email).get()
        avatar = ""
        name = email.split("@")[0]

        if user_doc.exists:
            user_data = user_doc.to_dict()
            avatar = user_data.get("photoURL", "") or user_data.get("avatar", "")
            if user_data.get("displayName"):
                name = user_data["displayName"]

        result.append({
            "email": email,
            "name": name,
            "avatar": avatar,
            "cashback": round(total)
        })

    result.sort(key=lambda x: x["cashback"], reverse=True)
    return {
        "success": True,
        "data": result[:3]
    }
