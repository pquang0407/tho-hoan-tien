import os
import time
import json
import hashlib
import requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler
from urllib.parse import quote

# 1. Load cấu hình từ .env
load_dotenv()

SHOPEE_AFFILIATE_ID = os.getenv("SHOPEE_AFFILIATE_ID", "17367900164")

# Dự phòng
AT_API_KEY = os.getenv("ACCESSTRADE_API_KEY", "")
LAZADA_CAMPAIGN_ID = os.getenv("LAZADA_CAMPAIGN_ID", "")

# Tỷ lệ chia sẻ hoa hồng mặc định
cashback_percent = 70
user_ratio = 0.7
admin_ratio = 0.3

def get_user_ratios(email: str):
    """
    Trả về (user_ratio, admin_ratio, cashback_percent) động theo email.
    Đối với daonam5696@gmail.com được hưởng trọn 100% hoa hồng.
    """
    if email and email.strip().lower() == "daonam5696@gmail.com":
        return 1.0, 0.0, 100
    return user_ratio, admin_ratio, cashback_percent

# 2. Khởi tạo Firebase Admin
try:
    firebase_creds_json = os.getenv("FIREBASE_CREDENTIALS")
    if firebase_creds_json:
        creds_dict = json.loads(firebase_creds_json)
        cred = credentials.Certificate(creds_dict)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Firebase connected successfully via Env Var (Official Shopee API Backend)!")
    else:
        cred = credentials.Certificate(
            os.path.join(os.path.dirname(__file__), "firebase-key.json")
        )
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Firebase connected successfully via Local File (Official Shopee API Backend)!")
except Exception as e:
    print(f"Firebase initialization error: {e}")

# 3. Khởi tạo FastAPI
app = FastAPI(title="Official Shopee Affiliate API Backend")
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

# Models
class LinkRequest(BaseModel):
    user_email: str
    original_url: str
    platform: str

# HEALTH CHECK
@app.get("/")
def read_root():
    return {
        "status": "online",
        "backend": "shopee-official-api-integration",
        "affiliate_id_configured": len(SHOPEE_AFFILIATE_ID) > 0
    }

# Hàm sinh chữ ký Authorization của Shopee
def build_shopee_authorization(app_id: str, secret: str, payload: str, timestamp: int) -> str:
    signature_base = f"{app_id}{timestamp}{payload}{secret}"
    signature = hashlib.sha256(signature_base.encode('utf-8')).hexdigest()
    return f"SHA256 Credential={app_id}, Timestamp={timestamp}, Signature={signature}"

# CONVERSION ENDPOINT
@app.post("/api/convert")
@limiter.limit("20/minute")
async def convert_link(request: Request, body: LinkRequest):
    if body.platform not in ["shopee", "lazada", "tiktok"]:
        raise HTTPException(status_code=400, detail="Nền tảng không hợp lệ")

    product_name = f"Sản phẩm {body.platform.title()}"
    product_image = ""
    product_price = 0.0
    commission = 0.0
    aff_link = ""
    short_link = ""

    # ==========================================
    # PLATFORM: SHOPEE
    # ==========================================
    if body.platform == "shopee":
        # 1. Gọi Product Data API của addlivetag để lấy thông tin sản phẩm và hoa hồng chi tiết
        try:
            data_api_url = f"https://data.addlivetag.com/product-data/product-data.php?url={quote(body.original_url)}"
            response_data = requests.get(data_api_url, timeout=15)
            if response_data.status_code == 200:
                res_json = response_data.json()
                if res_json.get("status") == "success" and res_json.get("productInfo"):
                    p_info = res_json["productInfo"]
                    product_name = p_info.get("productName", product_name)
                    product_price = float(p_info.get("price", 0.0))
                    product_image = p_info.get("imageUrl", "")
                    # commission này là tổng hoa hồng ước tính từ Shopee + Seller cho sản phẩm
                    commission = float(p_info.get("commission", 0.0))
        except Exception as e:
            print(f"Shopee Product Data API error: {e}")

        if not product_image:
            product_image = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Shopee.svg/375px-Shopee.svg.png"

        # 2. Tạo link affiliate Shopee trực tiếp qua định dạng an_redir (không cần gọi API, không sợ WAF)
        if SHOPEE_AFFILIATE_ID:
            sanitized_email = body.user_email.replace("-", "_").replace("@", "_at_").replace(".", "_")
            sub_id = f"hangthocashback-{sanitized_email}"
            
            encoded_url = quote(body.original_url, safe="")
            aff_link = f"https://s.shopee.vn/an_redir?origin_link={encoded_url}&affiliate_id={SHOPEE_AFFILIATE_ID}&sub_id={sub_id}"
            short_link = aff_link

        # Fallback nếu chưa cấu hình Shopee Affiliate ID
        if not short_link:
            short_link = body.original_url
            aff_link = body.original_url

    # ==========================================
    # PLATFORM: LAZADA (FALLBACK ACCESS TRADE)
    # ==========================================
    elif body.platform == "lazada":
        product_image = "https://upload.wikimedia.org/wikipedia/commons/0/06/Lazada_Logo.png"
        
        if "lazada.vn/products/" in body.original_url:
            try:
                parts = body.original_url.split("lazada.vn/products/")[1].split("?")[0].split(".html")[0].split("-")
                if len(parts) > 0:
                    product_name = " ".join(parts[:-1])
            except Exception:
                pass

        if AT_API_KEY and LAZADA_CAMPAIGN_ID:
            headers_at = {"Authorization": f"Token {AT_API_KEY}", "Content-Type": "application/json"}
            payload_at = {
                "campaign_id": LAZADA_CAMPAIGN_ID,
                "urls": [body.original_url],
                "utm_source": body.user_email,
                "utm_medium": body.platform,
                "utm_campaign": "cashback"
            }
            try:
                response = requests.post(
                    "https://api.accesstrade.vn/v1/product_link/create",
                    headers=headers_at,
                    json=payload_at,
                    timeout=10
                )
                if response.status_code == 200:
                    res_data = response.json()
                    if res_data.get("success") and res_data.get("data", {}).get("success_link"):
                        link_data = res_data["data"]["success_link"][0]
                        aff_link = link_data["aff_link"]
                        short_link = link_data["short_link"]
            except Exception:
                pass

        if not short_link:
            short_link = body.original_url
            aff_link = body.original_url

    # ==========================================
    # PLATFORM: TIKTOK
    # ==========================================
    elif body.platform == "tiktok":
        short_link = body.original_url
        aff_link = body.original_url
        product_image = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/TikTok_logo.svg/256px-TikTok_logo.svg.png"

    # Lấy tỷ lệ chia hoa hồng của người dùng
    u_ratio, a_ratio, c_percent = get_user_ratios(body.user_email)
    cashback = round(commission * u_ratio)
    publisher_income = round(commission * a_ratio)

    # Lưu log vào Firebase
    try:
        client_ip = request.client.host
        db.collection("logs").add({
            "ip": client_ip, 
            "email": body.user_email, 
            "platform": body.platform,
            "url": body.original_url, 
            "product_name": product_name, 
            "created_at": firestore.SERVER_TIMESTAMP,
            "source_backend": "shopee-official-api"
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
            "status": "link_created",
            "source_backend": "shopee-official-api"
        })
    except Exception as fe:
        print(f"Firebase logging error: {fe}")

    return {
        "success": True,
        "product": {"name": product_name, "image": product_image, "price": product_price},
        "commission": {"amount": commission, "cashback_percent": c_percent, "cashback": cashback, "publisher_income": publisher_income},
        "links": {"short": short_link, "affiliate": aff_link}
    }
