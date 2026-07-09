from fastapi import Request, HTTPException
from firebase_admin import auth as firebase_auth
from config.settings import ADMIN_EMAIL, ADMIN_EMAIL2, user_ratio, admin_ratio, cashback_percent

def get_user_ratios(email: str):
    """
    Trả về (user_ratio, admin_ratio, cashback_percent) động theo email.
    Đối với daonam5696@gmail.com được hưởng trọn 100% hoa hồng.
    """
    if email and email.strip().lower() == "daonam5696@gmail.com":
        return 1.0, 0.0, 100
    return user_ratio, admin_ratio, cashback_percent

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
