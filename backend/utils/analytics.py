from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from firebase_admin import firestore
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
    vn_tz = timezone(timedelta(hours=7))
    today = datetime.now(vn_tz)
    today_date = today.date()
    week_ago = today_date - timedelta(days=6)
    
    # 1. Đếm số link mỗi ngày trong 7 ngày gần nhất bằng COUNT Aggregation (chỉ tốn ~1 read / 1000 docs thay vì tải hàng chục ngàn docs)
    daily_links = {}
    today_links = 0
    for i in range(7):
        d = week_ago + timedelta(days=i)
        day_start_vn = datetime.combine(d, datetime.min.time(), tzinfo=vn_tz)
        day_end_vn = day_start_vn + timedelta(days=1)
        day_start_utc = day_start_vn.astimezone(timezone.utc)
        day_end_utc = day_end_vn.astimezone(timezone.utc)
        try:
            cnt = (
                db.collection("conversions")
                .where("created_at", ">=", day_start_utc)
                .where("created_at", "<", day_end_utc)
                .count()
                .get()[0][0]
                .value
            )
        except Exception as e:
            print(f"Error counting conversions for {d}: {e}")
            cnt = 0
        daily_links[str(d)] = cnt
        if d == today_date:
            today_links = cnt

    # 2. Chỉ lấy mẫu 300 link gần nhất để thống kê Top Sản Phẩm (tiết kiệm >98% lượt đọc Firestore)
    product_counter = Counter()
    try:
        recent_conversions = (
            db.collection("conversions")
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .limit(300)
            .stream()
        )
        for doc in recent_conversions:
            item = doc.to_dict()
            product = item.get("product_name")
            platform = item.get("platform", "tiktok")
            if product:
                product_counter[(product, platform)] += 1
    except Exception as e:
        print(f"Error sampling recent conversions for top products: {e}")

    user_cashback = defaultdict(float)
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
    
    # 3. Đếm số lượng user mới đăng ký trong 7 ngày qua từ bảng users bằng lệnh COUNT
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
