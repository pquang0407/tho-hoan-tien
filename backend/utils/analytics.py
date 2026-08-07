from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from config.database import db
from middleware.auth import get_user_ratios

def get_firebase_summary():
    try:
        generated_links = db.collection("conversions").count().get()[0][0].value
    except Exception as e:
        print(f"Error counting conversions: {e}")
        generated_links = 0
        
    try:
        logs_count = db.collection("logs").count().get()[0][0].value
    except Exception as e:
        print(f"Error counting logs: {e}")
        logs_count = 0
        
    try:
        users_count = db.collection("users").count().get()[0][0].value
    except Exception as e:
        print(f"Error counting users: {e}")
        users_count = 0
        
    return {
        "generated_links": generated_links,
        "logs": logs_count,
        "users": users_count
    }

def get_dashboard_analytics(orders):
    today = datetime.now(timezone.utc) + timedelta(hours=7)
    today_date = today.date()
    week_ago = today_date - timedelta(days=6)
    
    # 1. Chỉ tải dữ liệu conversions trong vòng 30 ngày qua thay vì tải toàn bộ
    thirty_days_ago_dt = datetime.now(timezone.utc) - timedelta(days=30)
    conversions = [
        doc.to_dict() 
        for doc in db.collection("conversions")
        .where("created_at", ">=", thirty_days_ago_dt)
        .stream()
    ]
    
    daily_links = defaultdict(int)
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
            
        product = item.get("product_name")
        platform = item.get("platform", "tiktok")
        if product: product_counter[(product, platform)] += 1

    for order in orders:
        email = order.get("utm_source")
        if not email:
            continue

        confirmed = int(order.get("confirmed", 0))
        if confirmed != 1:
            continue

        reward = float(order.get("reward", 0))
        u_ratio, _, _ = get_user_ratios(email)
        user_cashback[email] += reward * u_ratio
    
    # 2. Đếm số lượng user mới đăng ký trong 7 ngày qua từ bảng users bằng lệnh COUNT
    try:
        week_ago_ms = int((datetime.now(timezone.utc) - timedelta(days=7)).timestamp() * 1000)
        new_users = db.collection("users").where("createdAt", ">=", week_ago_ms).count().get()[0][0].value
    except Exception as e:
        print(f"Error counting new users: {e}")
        new_users = 0
        
    chart = [{"date": (week_ago + timedelta(days=i)).strftime("%d/%m"), "count": daily_links.get(str(week_ago + timedelta(days=i)), 0)} for i in range(7)]
        
    return {
        "daily_links": chart,
        "top_users": [{"email": k, "cashback": round(v)} for k, v in sorted(user_cashback.items(), key=lambda x: x[1], reverse=True)[:10]],
        "top_products": [{"name": k[0], "platform": k[1], "count": v} for k, v in product_counter.most_common(10)],
        "new_users": new_users,
        "today_links": today_links
    }
