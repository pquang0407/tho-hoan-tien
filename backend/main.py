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

# 4. Models
class LinkRequest(BaseModel):
    user_email: str
    original_url: str
    platform: str

class WithdrawalRequest(BaseModel):
    user_email: str
    amount: float
    bank_info: str

class WithdrawalUpdate(BaseModel):
    request_id: str
    status: str # "approved" hoặc "rejected"

# ==========================================
# CÁC HÀM TIỆN ÍCH (UTILS)
# ==========================================
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

def get_dashboard_analytics(orders):

    conversions = [
        doc.to_dict()
        for doc in db.collection("conversions").stream()
    ]

    report = get_at_orders()
    orders = report["data"]

    today = datetime.now().date()
    week_ago = today - timedelta(days=6)

    daily_links = defaultdict(int)
    first_seen = {}
    product_counter = Counter()

    user_cashback = defaultdict(float)

    today_links = 0
    
    for item in conversions:
        created = item.get("created_at")
        if created is None:
            continue
        
        # Xử lý parse date an toàn
        if hasattr(created, 'date'):
            created = created.date()
        elif isinstance(created, str):
            try:
                created = datetime.fromisoformat(created[:10]).date()
            except:
                continue
                
        # Thống kê 7 ngày
        if created >= week_ago:
            daily_links[str(created)] += 1

        if created == today:
            today_links += 1

        email = item.get("user_email")

        if email:

            if email not in first_seen or created < first_seen[email]:
                first_seen[email] = created

        product = item.get("product_name")

        platform = item.get("platform","tiktok")

        if product:
            product_counter[(product,platform)] += 1

    for order in orders:

        if order["order_approved"] <= 0:
            continue

        email = order.get("utm_source")

        if not email:
            continue

        cashback = float(order["pub_commission"]) * 0.8

        user_cashback[email] += cashback
    
    new_users = sum(
        1
        for d in first_seen.values()
        if d >= week_ago
    )
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

# ==========================================
# ENDPOINT: RÚT GỌN LINK
# ==========================================
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
        headers=headers, json=payload
    )

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Không thể kết nối AccessTrade")

    response_data = response.json()
    if not response_data.get("status"):
        msg = body.get("message", "Không thể tạo link")
        if msg == "invalid params": msg = "Link không hợp lệ hoặc chưa hỗ trợ hoàn tiền."
        elif "campaign" in msg.lower(): msg = "Sản phẩm chưa tham gia hoàn tiền."
        elif "not found" in msg.lower(): msg = "Không tìm thấy sản phẩm."
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
        "ip": client_ip, "email": body.user_email, "platform": body.platform,
        "url": body.original_url, "product_name": product_name, "created_at": datetime.now()
    })

    db.collection("conversions").add({
        "user_email": body.user_email,
        "original_url": body.original_url,
        "platform": body.platform,

        "product_name": product_name,
        "product_price": product_price,

        "short_link": short_link,
        "aff_link": aff_link,

        "created_at": datetime.now(),

        # chỉ để hiển thị lúc chưa có order
        "status": "link_created"
    })
    return {
        "success": True,
        "product": {"name": product_name, "image": product_image, "price": product_price},
        "commission": {"amount": commission, "cashback_percent": cashback_percent, "cashback": cashback, "publisher_income": publisher_income},
        "links": {"short": short_link, "affiliate": aff_link}
    }

# ==========================================
# ENDPOINTS: ADMIN & QUẢN LÝ
# ==========================================
@app.get("/api/admin/at-reports")
@limiter.limit("5/minute")
def admin_reports(request: Request):
    verify_admin(request)
    report = get_at_orders()
    firebase = get_firebase_summary()
    analytics = get_dashboard_analytics(orders)

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

# ==========================================
# ENDPOINTS: RÚT TIỀN (WITHDRAWALS)
# ==========================================
@app.post("/api/withdrawals")
@limiter.limit("5/minute")
async def create_withdrawal(request: Request, body: WithdrawalRequest):
    wallet = get_user_wallet(body.user_email)
    pending_request = db.collection("withdrawals")\
    .where("user_email","==",body.user_email)\
    .where("status","==","pending")\
    .stream()

    pending_amount = sum(
        w.to_dict()["amount"]
        for w in pending_request
    )

    if body.amount > wallet["balance"] - pending_amount:

        raise HTTPException(
            status_code=400,
            detail="Số dư khả dụng không đủ."
        )

    if body.amount < 100000:

        raise HTTPException(
            status_code=400,
            detail="Rút tối thiểu 100.000đ"
        )
    """User gửi yêu cầu rút tiền"""
    db.collection("withdrawals").add({

        "user_email": body.user_email,

        "amount": body.amount,

        "bank_info": body.bank_info,

        "status": "pending",

        "available_balance": wallet["balance"],

        "created_at": datetime.now()

    })
    return {"success": True, "message": "Yêu cầu rút tiền đã được gửi thành công!"}

@app.get("/api/admin/withdrawals")
def get_withdrawals(request: Request):
    """Admin lấy danh sách yêu cầu rút tiền"""
    verify_admin(request)
    docs = db.collection("withdrawals").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    
    result = []
    for doc in docs:
        data = doc.to_dict()
        # Parse date an toàn
        created_time = ""
        if "created_at" in data and data["created_at"]:
            try:
                created_time = data["created_at"].strftime("%d/%m/%Y %H:%M")
            except:
                created_time = str(data["created_at"])

        result.append({
            "id": doc.id,
            "email": data.get("user_email", "N/A"),
            "amount": data.get("amount", 0),
            "bank": data.get("bank_info", "N/A"),
            "status": data.get("status", "pending"),
            "date": created_time
        })
    return {"success": True, "data": result}

@app.post("/api/admin/withdrawals/update")
def update_withdrawal(request: Request, body: WithdrawalUpdate):
    """Admin cập nhật trạng thái yêu cầu rút tiền"""
    verify_admin(request)
    doc_ref = db.collection("withdrawals").document(body.request_id)
    
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu rút tiền này")
        
    doc_ref.update({
        "status": body.status,
        "updated_at": datetime.now()
    })
    return {"success": True, "message": "Cập nhật trạng thái thành công"}

# Lấy lịch sử đơn hàng của 1 user
@app.get("/api/user/history")
def get_user_history(email:str):

    report = get_at_orders()

    result=[]

    for order in report["data"]:

        if order.get("utm_source")!=email:
            continue

        cashback=float(order["pub_commission"])*0.8

        if order["order_approved"]>0:

            status="approved"

        elif order["order_reject"]>0:

            status="rejected"

        else:

            status="pending"

        result.append({

            "order_id":order["order_id"],

            "merchant":order["merchant"],

            "amount":order["billing"],

            "cashback":round(cashback),

            "status":status,

            "time":order["sales_time"]

        })

    result.sort(
        key=lambda x:x["time"],
        reverse=True
    )

    return{

        "success":True,

        "orders":result
    }

# Lấy thông tin ví của 1 user
@app.get("/api/user/wallet")
def get_user_wallet(email: str):

    report = get_at_orders()

    balance = 0

    pending = 0

    withdrawn = 0

    for order in report["data"]:

        if order.get("utm_source") != email:
            continue

        cashback = float(order["pub_commission"]) * 0.8

        if order["order_approved"] > 0:

            balance += cashback

        elif order["order_reject"] > 0:

            pass

        else:

            pending += cashback

    withdrawals = db.collection("withdrawals")\
        .where("user_email","==",email)\
        .where("status","==","approved")\
        .stream()

    for w in withdrawals:
        withdrawn += w.to_dict()["amount"]

    balance -= withdrawn
    balance = max(balance, 0)

    return {

        "success":True,

        "balance":round(balance),

        "pending":round(pending),

        "withdrawn":round(withdrawn)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
