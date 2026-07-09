from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from config.database import db
from middleware.auth import get_user_ratios

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
        if not email:
            continue

        confirmed = int(order.get("confirmed", 0))
        if confirmed != 1:
            continue

        reward = float(order.get("reward", 0))
        u_ratio, _, _ = get_user_ratios(email)
        user_cashback[email] += reward * u_ratio
    
    new_users = sum(1 for d in first_seen.values() if d >= week_ago)
    chart = [{"date": (week_ago + timedelta(days=i)).strftime("%d/%m"), "count": daily_links.get(str(week_ago + timedelta(days=i)), 0)} for i in range(7)]
        
    return {
        "daily_links": chart,
        "top_users": [{"email": k, "cashback": round(v)} for k, v in sorted(user_cashback.items(), key=lambda x: x[1], reverse=True)[:10]],
        "top_products": [{"name": k[0], "platform": k[1], "count": v} for k, v in product_counter.most_common(10)],
        "new_users": new_users,
        "today_links": today_links
    }
