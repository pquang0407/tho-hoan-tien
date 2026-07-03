import os
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta, timezone
from firebase_admin import auth as firebase_auth
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi import Request
from slowapi import _rate_limit_exceeded_handler
from collections import Counter, defaultdict

# 1. Load cấu hình
load_dotenv()
AT_API_KEY = os.getenv("ACCESSTRADE_API_KEY")

# Campaign IDs
TIKTOK_CAMPAIGN_ID = "6648523843406889655"
SHOPEE_CAMPAIGN_ID = ""
LAZADA_CAMPAIGN_ID = ""

# Tài khoản admin
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
cashback_percent = 80
REPORT_DAYS = 30
REQUEST_TIMEOUT = 15

# 2. Khởi tạo Firebase Admin
try:
    cred = credentials.Certificate(
        os.path.join(os.path.dirname(__file__), "firebase-key.json")
    )
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Kết nối Firebase thành công!")
except Exception as e:
    print(f"Lỗi khởi tạo Firebase: {e}")

# 3. Khởi tạo FastAPI
app = FastAPI()

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://tho-hoan-tien.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LinkRequest(BaseModel):
    user_email: str
    original_url: str
    platform: str

@app.post("/api/convert")
@limiter.limit("10/minute")
async def convert_link(request: Request, body: LinkRequest):
    if body.platform != "tiktok":
        raise HTTPException(status_code=400, detail="Hiện tại chỉ hỗ trợ TikTok Shop")

    headers = {
        "Authorization": f"Token {AT_API_KEY}",
        "Content-Type": "application/json",
        "accept": "application/json"
    }

    payload = {
        "product_url": body.original_url,
        "utm_source": body.user_email,
        "utm_medium": body.platform,
        "utm_campaign": "cashback"
    }

    response = requests.post(
        "https://api.accesstrade.vn/v2/tiktokshop_product_feeds/create_link",
        headers=headers,
        json=payload
    )

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Không thể kết nối AccessTrade")

    response_data = response.json()

    if not response_data.get("status"):
        msg = body.get("message", "Không thể tạo link")
        if msg == "invalid params":
            msg = "Link sản phẩm không hợp lệ hoặc hiện chưa hỗ trợ hoàn tiền."
        elif "campaign" in msg.lower():
            msg = "Sản phẩm này hiện chưa tham gia chương trình hoàn tiền."
        elif "not found" in msg.lower():
            msg = "Không tìm thấy sản phẩm."
        raise HTTPException(status_code=400, detail=msg)

    data = response_data["data"]
    aff_link = data["aff_url"]
    short_link = data["aff_short_url"]
    product_name = data["product_name"]
    product_image = data["product_image"]
    
    price_info = data.get("product_price", {})
    product_price = float(price_info.get("maximum_amount") or price_info.get("minimum_amount") or 0)
    
    commission_info = data.get("product_commission", {})
    commission = float(commission_info.get("amount", 0))

    cashback = round(commission * 0.8)
    publisher_income = round(commission * 0.2)
    client_ip = request.client.host

    db.collection("logs").add({
        "ip": client_ip,
        "email": body.user_email,
        "platform": body.platform,
        "url": body.original_url,
        "product_name": product_name,
        "created_at": datetime.now()
    })

    db.collection("conversions").add({
        "user_email": body.user_email,
        "original_url": body.original_url,
        "platform": body.platform,
        "product_name": product_name,
        "product_price": product_price,
        "commission": commission,
        "cashback": cashback,
        "publisher_income": publisher_income,
        "short_link": short_link,
        "aff_link": aff_link,
        "created_at": datetime.now()
    })

    return {
        "success": True,
        "product": {"name": product_name, "image": product_image, "price": product_price},
        "commission": {"amount": commission, "cashback_percent": cashback_percent, "cashback": cashback, "publisher_income": publisher_income},
        "links": {"short": short_link, "affiliate": aff_link}
    }

def verify_admin(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth_header.replace("Bearer ", "")
    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    email = decoded.get("email")
    if email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Forbidden")
    return decoded

def get_firebase_summary():
    conversions = list(db.collection("conversions").stream())
    logs = list(db.collection("logs").stream())
    emails = set()
    for doc in conversions:
        data = doc.to_dict()
        email = data.get("user_email")
        if email:
            emails.add(email)
    return {
        "generated_links": len(conversions),
        "logs": len(logs),
        "users": len(emails)
    }

def get_dashboard_analytics():
    conversions = [doc.to_dict() for doc in db.collection("conversions").stream()]
    today = datetime.now().date()
    week_ago = today - timedelta(days=6)
    
    # ===== Biến lưu trữ =====
    daily_links = defaultdict(int)
    user_cashback = defaultdict(float)
    product_counter = Counter()
    first_seen = {}
    today_links = 0
    
    for item in conversions:
        created = item.get("created_at")
        if created is None:
            continue
        
        # Parse datetime nếu cần
        if hasattr(created, 'date'):
            created = created.date()
        elif isinstance(created, str):
            try:
                created = datetime.fromisoformat(created[:10]).date()
            except:
                continue
                
        # Link theo ngày
        if created >= week_ago:
            daily_links[str(created)] += 1
        # Link hôm nay
        if created == today:
            today_links += 1
            
        email = item.get("user_email")
        if email:
            user_cashback[email] += item.get("cashback", 0)
            if email not in first_seen or created < first_seen[email]:
                first_seen[email] = created
                
        product = item.get("product_name")
        platform = item.get("platform", "shopee") # Lấy platform để gán icon
        if product:
            product_counter[(product, platform)] += 1

    # User mới tuần này
    new_users = sum(1 for d in first_seen.values() if d >= week_ago)
    
    # 7 ngày đầy đủ cho Bar Chart
    chart = []
    for i in range(7):
        d = week_ago + timedelta(days=i)
        chart.append({
            "date": d.strftime("%d/%m"),
            "count": daily_links.get(str(d), 0)
        })
        
    return {
        "daily_links": chart,
        "top_users": [
            {"email": k, "cashback": round(v)}
            for k, v in sorted(user_cashback.items(), key=lambda x: x[1], reverse=True)[:10]
        ],
        "top_products": [
            {"name": k[0], "platform": k[1], "count": v}
            for k, v in product_counter.most_common(10)
        ],
        "new_users": new_users,
        "today_links": today_links
    }

def get_at_orders():
    headers = {"Authorization": f"Token {AT_API_KEY}"}
    until = datetime.now(timezone.utc)
    since = until - timedelta(days=REPORT_DAYS)
    params = {
        "since": since.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "until": until.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "limit": 100
    }
    response = requests.get(
        "https://api.accesstrade.vn/v1/order-list",
        headers=headers,
        params=params,
        timeout=REQUEST_TIMEOUT
    )
    try:
        response.raise_for_status()
    except requests.RequestException:
        raise HTTPException(status_code=500, detail="Không lấy được dữ liệu AccessTrade")
    return response.json()

@app.get("/api/admin/at-reports")
@limiter.limit("5/minute")
def admin_reports(request: Request):
    verify_admin(request)
    report = get_at_orders()
    firebase = get_firebase_summary()
    analytics = get_dashboard_analytics()

    orders = report.get("data", [])
    total_orders = len(orders)
    total_commission = 0
    net_profit = 0
    result = []
    
    approved_count = 0
    pending_count = 0
    reject_count = 0

    for item in orders:
        commission = float(item.get("pub_commission", 0))
        approved = item["order_approved"] > 0

        if approved:
            total_commission += commission
            net_profit += commission * 0.2

        if item["order_approved"] > 0:
            status = 1
            approved_count += 1
        elif item["order_reject"] > 0:
            status = 2
            reject_count += 1
        else:
            status = 0
            pending_count += 1

        result.append({
            "order_id": item["order_id"],
            "order_time": item["sales_time"],
            "campaign_name": item["merchant"],
            "sales_amount": item["billing"],
            "pub_commission": commission,
            "order_status": status
        })
        
    result.sort(key=lambda x: x["order_time"], reverse=True)

    return {
        "success": True,
        "summary": {
            "conversions": total_orders,
            "total_commission": round(total_commission),
            "net_profit": round(net_profit),
            "generated_links": firebase["generated_links"],
            "users": firebase["users"],
            "logs": firebase["logs"]
        },
        "analytics": {
            **analytics,
            "order_status": {
                "approved": approved_count,
                "pending": pending_count,
                "rejected": reject_count
            }
        },
        "orders": result[:30]
    }

@app.get("/campaigns")
def get_campaigns():
    headers = {"Authorization": f"Token {AT_API_KEY}"}
    response = requests.get("https://api.accesstrade.vn/v1/campaigns", headers=headers)
    return {"status": response.status_code, "body": response.json()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
