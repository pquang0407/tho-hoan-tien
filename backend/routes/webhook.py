from fastapi import APIRouter, Request
from firebase_admin import firestore
from config.database import db

router = APIRouter()

@router.api_route("/api/postback", methods=["GET", "POST"])
async def global_postback(request: Request):
    p = dict(request.query_params)
    if request.method == "POST":
        try:
            body_json = await request.json()
            p.update(body_json)
        except Exception:
            pass

    def safe_float(val):
        try: return float(val) if val else 0.0
        except ValueError: return 0.0
        
    def safe_int(val):
        try: return int(val) if val else 0
        except ValueError: return 0

    # --- ACCESSTRADE WEBHOOK ---
    transaction_id = p.get("transaction_id")
    if not transaction_id:
        return {"success": True, "message": "AccessTrade ping ok"}

    sales_time_str = str(p.get("sales_time", ""))
    if sales_time_str:
        sales_time_str = sales_time_str.replace(" ", "T")

    db.collection("orders").document(str(transaction_id)).set({
        "transaction_id": str(transaction_id),
        "order_id": str(p.get("order_id", "")),
        "campaign_id": str(p.get("campaign_id", "")),
        "product_id": str(p.get("product_id", "")),
        "quantity": safe_int(p.get("quantity")),
        "product_price": safe_float(p.get("product_price")),
        "reward": safe_float(p.get("reward")),
        "sales_time": sales_time_str,
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
