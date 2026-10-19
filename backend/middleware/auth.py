from fastapi import Request, HTTPException
from firebase_admin import auth as firebase_auth
from config.settings import ADMIN_EMAIL, ADMIN_EMAIL2, ADMIN_EMAIL3, ADMIN_EMAIL4, user_ratio, admin_ratio, cashback_percent

def get_user_ratios(email: str):
    """
    Trả về (user_ratio, admin_ratio, cashback_percent) động theo email.
    Các tài khoản Admin (ADMIN_EMAIL, ADMIN_EMAIL2, ADMIN_EMAIL3, ADMIN_EMAIL4) được hưởng trọn 100% hoa hồng.
    """
    if email:
        email_clean = email.strip().lower()
        admin_list = {
            adm.strip().lower()
            for adm in [ADMIN_EMAIL, ADMIN_EMAIL2, ADMIN_EMAIL3, ADMIN_EMAIL4]
            if adm
        }
        if email_clean in admin_list:
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
    if not email:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    email_clean = email.strip().lower()
    allowed_admins = []
    for adm in [ADMIN_EMAIL, ADMIN_EMAIL2, ADMIN_EMAIL3, ADMIN_EMAIL4]:
        if adm:
            allowed_admins.append(adm.strip().lower())
            
    if email_clean not in allowed_admins:
        raise HTTPException(status_code=403, detail="Forbidden")
    return decoded
