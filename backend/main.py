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
from fastapi import Request
# 1. Load cấu hình
load_dotenv()
AT_API_KEY = os.getenv("ACCESSTRADE_API_KEY")

# Campaign IDs
TIKTOK_CAMPAIGN_ID = "6648523843406889655"
SHOPEE_CAMPAIGN_ID = ""
LAZADA_CAMPAIGN_ID = ""

# Tài khoản admin
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
ADMIN_EMAIL2 = os.getenv("ADMIN_EMAIL2")
cashback_percent = 70
user_ratio = 0.7
admin_ratio = 0.3
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
        "https://www.tho-hoantien.com",
        "https://tho-hoantien.com",
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

# ==========================================
# ENDPOINT: NHẬN WEBHOOK TỪ ACCESSTRADE
# ==========================================
@app.api_route("/api/postback", methods=["GET", "POST"])
async def accesstrade_postback(request: Request):
    # 1. Quét sạch dữ liệu dù AT gửi bằng GET (URL) hay POST (JSON Body)
    p = dict(request.query_params)
    if request.method == "POST":
        try:
            body_json = await request.json()
            p.update(body_json)
        except Exception:
            pass

    # Nếu không có transaction_id -> AT đang ping test endpoint
    transaction_id = p.get("transaction_id")
    if not transaction_id:
        return {"success": True, "message": "endpoint ok"}
    
    # 2. Các hàm "Bọc thép" chống crash khi AT gửi chuỗi rỗng "" hoặc null
    def safe_float(val):
        try:
            return float(val) if val else 0.0
        except ValueError:
            return 0.0
            
    def safe_int(val):
        try:
            return int(val) if val else 0
        except ValueError:
            return 0

    # 3. Chuẩn hóa chuỗi thời gian để React không bị lỗi Invalid Date
    sales_time_str = str(p.get("sales_time", ""))
    if sales_time_str:
        sales_time_str = sales_time_str.replace(" ", "T")

    # 4. Ghi đè vào Firebase một cách an toàn
    db.collection("orders").document(str(transaction_id)).set({
        "transaction_id": str(transaction_id),
        "order_id": str(p.get("order_id", "")),
        "campaign_id": str(p.get("campaign_id", "")),
        "product_id": str(p.get("product_id", "")),
        "quantity": safe_int(p.get("quantity")),
        "product_price": safe_float(p.get("product_price")),
        "reward": safe_float(p.get("reward")), # Tiền hoa hồng
        "sales_time": sales_time_str,          # Giờ đã chuẩn hóa "T"
        "status": safe_int(p.get("status")),
        "confirmed": safe_int(p.get("is_confirmed")),
        "utm_source": str(p.get("utm_source", "")),
        "utm_campaign": str(p.get("utm_campaign", "")),
        "utm_medium": str(p.get("utm_medium", "")),
        "utm_content": str(p.get("utm_content", "")),
        "browser": str(p.get("browser", "")),
        "platform": str(p.get("conversion_platform", "")),
        "ip": str(p.get("ip", "")),
        "created_at": firestore.SERVER_TIMESTAMP,
        "raw": p
    }, merge=True)

    return {"success": True}

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
    if email != ADMIN_EMAIL and email != ADMIN_EMAIL2:
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
    conversions = [doc.to_dict() for doc in db.collection("conversions").stream()]
    today = datetime.now(timezone.utc) + timedelta(hours=7)
    today_date = today.date()
    week_ago = today_date - timedelta(days=6)
    
    daily_links = defaultdict(int)
    first_seen = {}
    product_counter = Counter()
    user_cashback = defaultdict(float)
    today_links = 0
    
    for item in conversions:
        created = item.get("created_at")
        doc_date = None
        if created:
            if hasattr(created, "timestamp"):
                doc_date = (datetime.fromtimestamp(created.timestamp(), tz=timezone.utc) + timedelta(hours=7)).date()
            elif isinstance(created, str):
                try: doc_date = datetime.fromisoformat(created[:19]).date()
                except: pass
                
        if not doc_date: continue
        if doc_date >= week_ago: daily_links[str(doc_date)] += 1
        if doc_date == today_date: today_links += 1
            
        email = item.get("user_email")
        if email and (email not in first_seen or doc_date < first_seen[email]):
            first_seen[email] = doc_date
            
        product = item.get("product_name")
        platform = item.get("platform", "tiktok")
        if product: product_counter[(product, platform)] += 1

    for order in orders:
        email = order.get("utm_source")
        if not email: continue
        cashback = float(order.get("reward",0)) * user_ratio
        user_cashback[email] += cashback
    
    new_users = sum(1 for d in first_seen.values() if d >= week_ago)
    chart = [{"date": (week_ago + timedelta(days=i)).strftime("%d/%m"), "count": daily_links.get(str(week_ago + timedelta(days=i)), 0)} for i in range(7)]
        
    return {
        "daily_links": chart,
        "top_users": [{"email": k, "cashback": round(v)} for k, v in sorted(user_cashback.items(), key=lambda x: x[1], reverse=True)[:10]],
        "top_products": [{"name": k[0], "platform": k[1], "count": v} for k, v in product_counter.most_common(10)],
        "new_users": new_users,
        "today_links": today_links
    }


# ==========================================
# ENDPOINT: LẤY THÔNG TIN VÍ
# ==========================================
# GHI CHÚ QUAN TRỌNG: Hàm này đã được thêm `request: Request` để không bị lỗi SlowAPI.
@app.get("/api/user/wallet")
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
        cashback = float(order.get("reward", 0)) * user_ratio

        print("==============")
        print(order)
        print("confirmed =", confirmed)
        print("status =", status)
        print("cashback =", cashback)

        if confirmed == 1:
            print("=> APPROVED")
            total_approved += cashback
        elif status != 2:
            print("=> PENDING")
            total_pending += cashback

    print("approved =", total_approved)
    print("pending =", total_pending)

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
    print([doc.to_dict() for doc in db.collection("orders").where("utm_source", "==", email).stream()])
    return {
        "success": True,
        "balance": round(available),
        "pending": round(total_pending),
        "withdrawn": round(approved_withdraw)
    }


# ==========================================
# ENDPOINT: RÚT GỌN LINK
# ==========================================
@app.post("/api/convert")
@limiter.limit("30/minute") 
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
    cashback = round(commission * user_ratio)
    publisher_income = round(commission * admin_ratio)
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
    return {
        "success": True,
        "product": {"name": product_name, "image": product_image, "price": product_price},
        "commission": {"amount": commission, "cashback_percent": cashback_percent, "cashback": cashback, "publisher_income": publisher_income},
        "links": {"short": short_link, "affiliate": aff_link}
    }

# ==========================================
# ENDPOINTS: ADMIN BÁO CÁO
# ==========================================
@app.get("/api/admin/at-reports")
@limiter.limit("30/minute")
def admin_reports(request: Request):
    verify_admin(request)
    orders = [
        doc.to_dict()
        for doc in db.collection("orders").stream()
    ]
    firebase = get_firebase_summary()
    analytics = get_dashboard_analytics(orders)
    
    total_orders = len(orders)
    total_commission = 0
    total_sales = 0
    net_profit = 0
    result = []
    
    approved_count = pending_count = reject_count = 0
    
    for item in orders:
        commission = float(item.get("reward",0))
        sales = float(item.get("product_price",0))
        
        total_commission += commission 
        total_sales += sales
        net_profit += commission * admin_ratio 
        
        if item.get("confirmed") == 1:
            status = 1
            approved_count += 1

        elif item.get("status") == 2:
            status = 2
            reject_count += 1

        else:
            status = 0
            pending_count += 1
            
        result.append({
            "order_id": item.get("order_id"),
            "order_time": item.get("sales_time"),
            "campaign_name": item.get("campaign_id"),
            "sales_amount": sales,
            "pub_commission": commission,
            "order_status": status,
            "utm_source": item.get("utm_source", "")
        })
        
    result.sort(key=lambda x: x["order_time"], reverse=True)
    return {
        "success": True,
        "summary": {
            "conversions": total_orders,
            "total_commission": round(total_commission),
            "total_sales": round(total_sales),
            "net_profit": round(net_profit),
            "generated_links": firebase["generated_links"],
            "users": firebase["users"], "logs": firebase["logs"]
        },
        "analytics": {**analytics, "order_status": {"approved": approved_count, "pending": pending_count, "rejected": reject_count}},
        "orders": result[:30]
    }

# ==========================================
# ENDPOINTS: RÚT TIỀN (WITHDRAWALS)
# ==========================================
@app.post("/api/withdrawals")
@limiter.limit("30/minute") 
async def create_withdrawal(request: Request, body: WithdrawalRequest):
    # ĐÃ FIX LỖI: Truyền object request vào hàm get_user_wallet
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

@app.get("/api/admin/withdrawals")
@limiter.limit("30/minute")
def get_withdrawals(request: Request):
    """Admin lấy danh sách yêu cầu rút tiền"""
    verify_admin(request)
    docs = db.collection("withdrawals").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    
    result = []
    for doc in docs:
        data = doc.to_dict()
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
@limiter.limit("30/minute")
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

# ==========================================
# ENDPOINT: USER LẤY LỊCH SỬ RÚT TIỀN 
# ==========================================
@app.get("/api/user/withdrawals/history")
@limiter.limit("30/minute")
def get_user_withdrawals_history(email: str, request: Request):
    # Lấy dữ liệu và tự sắp xếp để tránh lỗi Index của Firebase
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
        
    # Sắp xếp danh sách dựa vào timestamp (mới nhất lên đầu)
    result.sort(key=lambda x: x["time_val"], reverse=True)
    
    # Dọn dẹp dữ liệu thừa
    for r in result:
        del r["time_val"]
        
    return {"success": True, "data": result}

# Lấy lịch sử đơn hàng của 1 user
@app.get("/api/user/history")
@limiter.limit("30/minute")
def get_user_history(email:str, request: Request):
    orders = db.collection("orders")\
        .where("utm_source","==",email)\
        .stream()
    result=[]
    for doc in orders:
        order = doc.to_dict()
        if order.get("utm_source")!=email:
            continue
        cashback = float(order["reward"]) * user_ratio
        if order.get("confirmed")==1:
            status="approved"

        elif order.get("status")==2:
            status="rejected"

        else:
            status="pending"
        result.append({

            "order_id": order["order_id"],

            "merchant": order.get("campaign_id"),

            "amount": order.get("product_price",0),

            "cashback": round(cashback),

            "status": status,

            "time": order.get("sales_time")

        })
    result.sort(key=lambda x:x["time"], reverse=True)
    return {"success":True, "orders":result}

# ==========================================
# ENDPOINT: QUẢN LÝ NGƯỜI DÙNG (ADMIN)
# ==========================================
@app.get("/api/admin/users")
@limiter.limit("30/minute")
def get_admin_users(request: Request, start_date: str = None, end_date: str = None):
    """Admin lấy danh sách chi tiết hành vi người dùng có lọc theo ngày chuẩn xác"""
    verify_admin(request)
    
    conversions = db.collection("conversions").stream()
    user_data = defaultdict(lambda: {"email": "", "total_links": 0, "recent_links": []})
    
    # Ép kiểu thẳng về chuẩn Date (YYYY-MM-DD) để so sánh, bỏ qua timezone
    start_d = None
    end_d = None
    if start_date:
        try: start_d = datetime.strptime(start_date, "%Y-%m-%d").date()
        except: pass
    if end_date:
        try: end_d = datetime.strptime(end_date, "%Y-%m-%d").date()
        except: pass

    for doc in conversions:
        data = doc.to_dict()
        email = data.get("user_email")
        if not email:
            continue
            
        created_at = data.get("created_at")
        time_str = "N/A"
        time_val = 0
        doc_d = None
        
        if created_at:
            try:
                # Cộng 7 tiếng để về chuẩn giờ Việt Nam
                if hasattr(created_at, "timestamp"):
                    time_val = created_at.timestamp()
                    dt_vn = datetime.fromtimestamp(time_val, tz=timezone.utc) + timedelta(hours=7)
                    doc_d = dt_vn.date()
                    time_str = dt_vn.strftime("%d/%m/%Y %H:%M")
                elif isinstance(created_at, str):
                    dt_obj = datetime.fromisoformat(created_at[:19])
                    doc_d = dt_obj.date()
                    time_val = dt_obj.timestamp()
                    time_str = dt_obj.strftime("%d/%m/%Y %H:%M")
            except Exception:
                pass

        # NẾU CÓ BỘ LỌC NGÀY NHƯNG DỮ LIỆU KHÔNG PARSE ĐƯỢC NGÀY -> BỎ QUA LUÔN
        if (start_d or end_d) and not doc_d:
            continue
            
        # NẾU KHÔNG NẰM TRONG KHOẢNG NGÀY -> BỎ QUA
        if doc_d:
            if start_d and doc_d < start_d:
                continue
            if end_d and doc_d > end_d:
                continue

        user_data[email]["email"] = email
        user_data[email]["total_links"] += 1
        
        user_data[email]["recent_links"].append({
            "product_name": data.get("product_name", "N/A"),
            "platform": data.get("platform", "N/A"),
            "short_link": data.get("short_link", "N/A"),
            "time_str": time_str,
            "time_val": time_val
        })
        
    result = []
    for email, info in user_data.items():
        info["recent_links"].sort(key=lambda x: x["time_val"], reverse=True)
        recent = info["recent_links"]
        for r in recent:
            del r["time_val"]
        # CHỈ THÊM USER NÀO CÓ TẠO LINK TRONG KHOẢNG THỜI GIAN ĐÃ LỌC
        if info["total_links"] > 0:
            result.append({
                "email": email,
                "total_links": info["total_links"],
                "recent_links": recent
            })
            
    result.sort(key=lambda x: x["total_links"], reverse=True)
    return {"success": True, "data": result}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
