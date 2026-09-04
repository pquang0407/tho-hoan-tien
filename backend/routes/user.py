import os
import time
import hashlib
import hmac
import requests
from datetime import datetime
from collections import defaultdict
from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException
from firebase_admin import firestore
from urllib.parse import quote
import re

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
from routes.redirect import SHORT_URL_CACHE
from middleware.auth import get_user_ratios
from utils.shortener import generate_short_code
from utils.url_cleaner import clean_shopee_url, clean_lazada_url

# Thông tin cấu hình Lazada Affiliate API chính thức
LAZADA_APP_KEY = os.getenv("LAZADA_APP_KEY")
LAZADA_APP_SECRET = os.getenv("LAZADA_APP_SECRET")
LAZADA_USER_TOKEN = os.getenv("LAZADA_USER_TOKEN")

def generate_lazada_sign(api_path: str, params: dict, app_secret: str) -> str:
    """Tính toán chữ ký HMAC-SHA256 theo tiêu chuẩn của Lazada Open Platform"""
    sorted_params = sorted(params.items())
    query_str = api_path
    for key, val in sorted_params:
        query_str += f"{key}{val}"
    sign = hmac.new(
        app_secret.encode("utf-8"),
        query_str.encode("utf-8"),
        hashlib.sha256
    ).hexdigest().upper()
    return sign

router = APIRouter()

class LinkRequest(BaseModel):
    user_email: str
    original_url: str
    platform: str

class WithdrawalRequest(BaseModel):
    user_email: str
    amount: float
    bank_info: str

def get_email_variants(email: str) -> list:
    if not email:
        return []
    e_clean = email.strip().lower()
    variants = set([e_clean])
    if "@" in e_clean:
        username, domain = e_clean.split("@", 1)
        u_vars = [username, username.replace("-", "_"), username.replace("_", "-")]
        d_vars = [domain, domain.replace("-", "."), domain.replace(".", "-"), domain.replace("_", ".")]
        for u in u_vars:
            for d in d_vars:
                variants.add(f"{u}@{d}")
    else:
        variants.add(e_clean.replace("-", "_"))
        variants.add(e_clean.replace("_", "-"))
    return list(variants)

USER_WALLETS_CACHE = {}
USER_HISTORY_CACHE = {}

@router.get("/api/user/wallet")
@limiter.limit("30/minute")
def get_user_wallet(email: str, request: Request):
    import time
    now = time.time()
    email_clean = email.strip().lower() if email else ""
    if email_clean in USER_WALLETS_CACHE:
        cached = USER_WALLETS_CACHE[email_clean]
        if now - cached["last_updated"] < 180:
            return cached["data"]

    variants = get_email_variants(email)
    orders = db.collection("orders") \
        .where("utm_source", "in", variants) \
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
        .where("user_email", "in", variants)
        .where("status", "==", "approved")
        .stream()
    )

    pending_withdraw = sum(
        d.to_dict().get("amount", 0)
        for d in db.collection("withdrawals")
        .where("user_email", "in", variants)
        .where("status", "==", "pending")
        .stream()
    )

    available = max(
        total_approved - approved_withdraw - pending_withdraw,
        0
    )
    res_data = {
        "success": True,
        "balance": round(available),
        "pending": round(total_pending),
        "withdrawn": round(approved_withdraw)
    }
    if email_clean:
        USER_WALLETS_CACHE[email_clean] = {"data": res_data, "last_updated": now}
    return res_data

@router.post("/api/convert")
@limiter.limit("30/minute") 
async def convert_link(request: Request, body: LinkRequest):
    headers = {
        "Authorization": f"Token {AT_API_KEY}",
        "Content-Type": "application/json",
        "accept": "application/json"
    }

    is_estimated_price = False

    # Trích xuất URL thực tế, tên sản phẩm và giá bán từ văn bản dán thô
    raw_text = body.original_url
    url_match = re.search(r'(https?://[^\s|]+)', raw_text)
    original_url = url_match.group(1) if url_match else raw_text.strip()
    
    # Loại bỏ URL khỏi văn bản trước khi tìm giá và tiêu đề để tránh khớp nhầm các ký tự/mã số trong URL (ví dụ .4.29d...)
    clean_text = raw_text.replace(original_url, "").strip()
    clean_text = re.sub(r'\|\s*$', '', clean_text).strip()
    clean_text = re.sub(r'Mua ngay trên Lazada.*$', '', clean_text, flags=re.IGNORECASE).strip()
    
    # Tìm giá bán nếu có (đặc biệt hữu ích khi người dùng copy cả tin từ app Lazada)
    pasted_price = 0.0
    price_match = re.search(r'([\d.,]+)\s*(?:đ|₫|VND|vnd|d)', clean_text)
    if price_match:
        price_str = price_match.group(1).replace(".", "").replace(",", "")
        try:
            pasted_price = float(price_str)
        except ValueError:
            pass

    # Tìm tiêu đề sản phẩm nếu có
    pasted_title = ""
    if clean_text:
        if price_match:
            title_part = clean_text.split(price_match.group(0))[0].strip()
            title_part = re.sub(r'^\[.*?\]\s*', '', title_part)
            title_part = re.sub(r'[\s|,-]+$', '', title_part).strip()
            if title_part:
                pasted_title = title_part
        else:
            title_part = re.sub(r'^\[.*?\]\s*', '', clean_text)
            title_part = re.sub(r'[\s|,-]+$', '', title_part).strip()
            if title_part:
                pasted_title = title_part

    if body.platform == "tiktok":
        payload = {
            "product_url": original_url,
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
        SHORT_URL_CACHE[short_code] = aff_link
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

        cleaned_url = clean_shopee_url(original_url)

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
        sub_id = f"hangtho-{sanitized_email}"
        encoded_url = quote(cleaned_url, safe="")
        aff_link = f"https://s.shopee.vn/an_redir?origin_link={encoded_url}&affiliate_id={SHOPEE_AFFILIATE_ID}&sub_id={sub_id}"

        # Tạo short code và định dạng link theo subdomain của bạn
        short_code = generate_short_code()
        db.collection("short_urls").document(short_code).set({
            "long_url": aff_link,
            "created_at": firestore.SERVER_TIMESTAMP
        })
        SHORT_URL_CACHE[short_code] = aff_link
        short_link = f"https://shopee.{BASE_DOMAIN}/{short_code}"

        u_ratio, a_ratio, c_percent = get_user_ratios(body.user_email)
        cashback = round(commission * u_ratio)
        publisher_income = round(commission * a_ratio)

    elif body.platform == "lazada":
        if not LAZADA_APP_KEY or not LAZADA_APP_SECRET or not LAZADA_USER_TOKEN:
            raise HTTPException(
                status_code=500,
                detail="Chưa cấu hình đầy đủ các biến môi trường LAZADA_APP_KEY, LAZADA_APP_SECRET, hoặc LAZADA_USER_TOKEN trên máy chủ."
            )
        # 1. Giải mã link rút gọn Lazada nếu có
        cleaned_url = clean_lazada_url(original_url)

        # 2. Gọi API chính thức Lazada /marketing/getlink để tạo link affiliate và lấy productId
        base_url = "https://api.lazada.vn/rest"
        api_path = "/marketing/getlink"
        
        params = {
            "app_key": LAZADA_APP_KEY,
            "timestamp": str(int(time.time() * 1000)),
            "sign_method": "sha256",
            "inputType": "url",
            "inputValue": cleaned_url,
            "userToken": LAZADA_USER_TOKEN
        }
        
        # Gắn Sub ID theo email để hỗ trợ đối soát đơn hàng sau này
        sanitized_email = body.user_email.replace("-", "_").replace("@", "_at_").replace(".", "_")
        params["subId1"] = sanitized_email
        
        params["sign"] = generate_lazada_sign(api_path, params, LAZADA_APP_SECRET)
        
        try:
            response = requests.get(f"{base_url}{api_path}", params=params, timeout=REQUEST_TIMEOUT)
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Không thể kết nối API Lazada ({response.status_code})")
                
            res_data = response.json()
            result = res_data.get("result", {})
            success = result.get("success")
            info_list = result.get("data", {}).get("urlBatchGetLinkInfoList", [])
            
            if not success or not info_list:
                error_msg = result.get("error_msg") or "Tạo link thất bại từ Lazada API"
                raise HTTPException(status_code=400, detail=error_msg)
                
            prod_info = info_list[0]
            product_id = prod_info.get("productId")
            aff_link = prod_info.get("regularPromotionLink")
            product_name = prod_info.get("productName") or pasted_title or "Sản phẩm Lazada"
            
            # Tính toán tỷ lệ hoa hồng mặc định nếu không lấy được chi tiết sản phẩm
            reg_commission_str = prod_info.get("regularCommission") or "7%"
            try:
                commission_rate = float(reg_commission_str.replace("%", "").strip()) / 100.0
            except Exception:
                commission_rate = 0.07
                
        except HTTPException as he:
            raise he
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lỗi hệ thống khi gọi API Lazada: {str(e)}")

        # 3. Tạo short code và định dạng link theo subdomain của bạn
        short_code = generate_short_code()
        db.collection("short_urls").document(short_code).set({
            "long_url": aff_link,
            "created_at": firestore.SERVER_TIMESTAMP
        })
        SHORT_URL_CACHE[short_code] = aff_link
        short_link = f"https://lazada.{BASE_DOMAIN}/{short_code}"

        # 4. Gọi tiếp API /marketing/product/feed để lấy ảnh thật và giá bán thật của sản phẩm
        product_price = pasted_price
        product_image = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Lazada_Logo.svg/512px-Lazada_Logo.svg.png"
        is_estimated_price = True
        
        if product_id:
            feed_api_path = "/marketing/product/feed"
            feed_params = {
                "app_key": LAZADA_APP_KEY,
                "timestamp": str(int(time.time() * 1000)),
                "sign_method": "sha256",
                "offerType": "1", # Regular offer
                "productIds": f"[{product_id}]",
                "userToken": LAZADA_USER_TOKEN,
                "page": "1",
                "limit": "1"
            }
            feed_params["sign"] = generate_lazada_sign(feed_api_path, feed_params, LAZADA_APP_SECRET)
            
            try:
                feed_response = requests.get(f"{base_url}{feed_api_path}", params=feed_params, timeout=REQUEST_TIMEOUT)
                if feed_response.status_code == 200:
                    feed_data = feed_response.json()
                    feed_result = feed_data.get("result", {})
                    feed_list = feed_result.get("data", [])
                    if feed_result.get("success") and feed_list:
                        feed_info = feed_list[0]
                        product_name = feed_info.get("productName", product_name)
                        
                        # Cập nhật ảnh thật từ API
                        pictures = feed_info.get("pictures", [])
                        if pictures:
                            product_image = pictures[0]
                            
                        # Cập nhật giá bán thật từ API
                        discount_price = feed_info.get("discountPrice")
                        if discount_price is not None:
                            product_price = float(discount_price)
                            is_estimated_price = False
                            
                        # Cập nhật tỷ lệ hoa hồng chính xác từ API
                        rate = feed_info.get("totalCommissionRate")
                        if rate is not None:
                            commission_rate = float(rate)
            except Exception as e:
                print(f"Lazada Product Feed API error: {e}")

        # Tính toán tiền hoàn lại
        if product_price <= 0:
            product_price = 150000.0
            is_estimated_price = True
            
        commission = product_price * commission_rate
        
        u_ratio, a_ratio, c_percent = get_user_ratios(body.user_email)
        cashback = round(commission * u_ratio)
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
        "product": {"name": product_name, "image": product_image, "price": product_price, "is_estimated_price": is_estimated_price},
        "commission": {"amount": commission, "cashback_percent": c_percent, "cashback": cashback, "publisher_income": publisher_income},
        "links": {"short": short_link, "affiliate": aff_link}
    }

@router.post("/api/withdrawals")
@limiter.limit("30/minute") 
async def create_withdrawal(request: Request, body: WithdrawalRequest):
    wallet = get_user_wallet(body.user_email, request)
    variants = get_email_variants(body.user_email)
    
    pending_request = db.collection("withdrawals")\
        .where("user_email", "in", variants)\
        .where("status", "==", "pending")\
        .stream()
    
    pending_amount = sum(w.to_dict()["amount"] for w in pending_request)
    
    if body.amount > wallet["balance"] - pending_amount:
        raise HTTPException(status_code=400, detail="Số dư khả dụng không đủ.")
        
    if body.amount < 30000:
        raise HTTPException(status_code=400, detail="Rút tối thiểu 30.000đ")
        
    db.collection("withdrawals").add({
        "user_email": body.user_email,
        "amount": body.amount,
        "bank_info": body.bank_info,
        "status": "pending",
        "balance_at_request": wallet["balance"],
        "created_at": firestore.SERVER_TIMESTAMP
    })

    # Xóa cache ví của người dùng để cập nhật ngay
    email_clean = body.user_email.strip().lower() if body.user_email else ""
    USER_WALLETS_CACHE.pop(email_clean, None)
    USER_HISTORY_CACHE.pop(email_clean, None)
    return {"success": True, "message": "Yêu cầu rút tiền đã được gửi thành công!"}

@router.get("/api/user/withdrawals/history")
@limiter.limit("30/minute")
def get_user_withdrawals_history(email: str, request: Request):
    variants = get_email_variants(email)
    docs = db.collection("withdrawals").where("user_email", "in", variants).stream()
    
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
    import time
    now = time.time()
    email_clean = email.strip().lower() if email else ""
    if email_clean in USER_HISTORY_CACHE:
        cached = USER_HISTORY_CACHE[email_clean]
        if now - cached["last_updated"] < 180:
            return cached["data"]

    variants = get_email_variants(email)
    orders = db.collection("orders")\
        .where("utm_source", "in", variants)\
        .stream()
    result = []
    for doc in orders:
        order = doc.to_dict()
        if order.get("utm_source") not in variants:
            continue
        u_ratio, _, _ = get_user_ratios(email)
        cashback = float(order.get("reward", 0)) * u_ratio
        if order.get("confirmed") == 1:
            status = "approved"
        elif order.get("status") == 2:
            status = "rejected"
        else:
            status = "pending"
        result.append({
            "order_id": order.get("order_id", ""),
            "merchant": order.get("campaign_id"),
            "amount": order.get("product_price", 0),
            "cashback": round(cashback),
            "status": status,
            "time": order.get("sales_time")
        })
    result.sort(key=lambda x: x["time"] if x.get("time") else "", reverse=True)
    res_data = {"success": True, "orders": result}
    if email_clean:
        USER_HISTORY_CACHE[email_clean] = {"data": res_data, "last_updated": now}
    return res_data

LEADERBOARD_CACHE = {
    "ranking": None,
    "last_updated": 0
}

@router.get("/api/leaderboard")
def leaderboard():
    import time
    global LEADERBOARD_CACHE
    now = time.time()
    
    # Nếu đã có cache và chưa quá 1 tiếng (3600 giây) thì trả về ngay lập tức
    if LEADERBOARD_CACHE["ranking"] is not None and now - LEADERBOARD_CACHE["last_updated"] < 3600:
        return {
            "success": True,
            "data": LEADERBOARD_CACHE["ranking"]
        }

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

    sorted_emails = sorted(ranking.items(), key=lambda x: x[1], reverse=True)[:10]
    result = []
    for email, total in sorted_emails:
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

    top_ten = result
    
    # Lưu vào bộ nhớ đệm
    LEADERBOARD_CACHE["ranking"] = top_ten
    LEADERBOARD_CACHE["last_updated"] = now
    
    return {
        "success": True,
        "data": top_ten
    }
