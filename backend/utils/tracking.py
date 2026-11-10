import hashlib
from firebase_admin import firestore, auth as firebase_auth
from config.database import db

# In-memory cache to avoid redundant Firestore writes and lookups
TRACKING_CODE_CACHE = {}

def get_user_tracking_code(email: str) -> str:
    """
    Generate a deterministic, compact, non-PII campaign tracking ID for any user email.
    Format: vid_<10-char-hex> (e.g., vid_9a4f8c2e1b)
    Guaranteed 1-to-1 consistency regardless of email casing or whitespace.
    """
    if not email:
        return ""
    clean_email = email.strip().lower()
    h = hashlib.sha256(f"thosandeal_uid_v1_{clean_email}".encode("utf-8")).hexdigest()[:10]
    return f"vid_{h}"

def save_tracking_code_mapping(email: str) -> str:
    """
    Compute the tracking code for an email and persist the mapping in Firestore
    collection 'tracking_codes' (cached in memory so repeated calls don't hit DB).
    """
    if not email:
        return ""
    clean_email = email.strip().lower()
    code = get_user_tracking_code(clean_email)
    if code not in TRACKING_CODE_CACHE:
        TRACKING_CODE_CACHE[code] = clean_email
        try:
            db.collection("tracking_codes").document(code).set({
                "email": clean_email,
                "updated_at": firestore.SERVER_TIMESTAMP
            }, merge=True)
        except Exception as e:
            print(f"Warning: failed to save tracking code mapping for {code}: {e}")
    return code

def build_tracking_code_lookup_map() -> dict:
    """
    Build a complete reverse-lookup map {tracking_code: email} from all authoritative sources:
    1. Firestore 'tracking_codes' collection (exact persisted mappings, incl. Zalo bots)
    2. Firestore 'users' collection (all registered users)
    3. Firebase Auth users (even if not yet synced to Firestore)
    """
    code_map = dict(TRACKING_CODE_CACHE)

    # 1. tracking_codes collection
    try:
        for doc in db.collection("tracking_codes").stream():
            data = doc.to_dict()
            email = (data.get("email") or "").strip().lower()
            if email:
                code_map[doc.id] = email
                TRACKING_CODE_CACHE[doc.id] = email
    except Exception as e:
        print(f"Error reading tracking_codes collection: {e}")

    # 2. users collection
    try:
        for doc in db.collection("users").stream():
            data = doc.to_dict()
            email = (data.get("email") or "").strip().lower()
            if email:
                code = get_user_tracking_code(email)
                if code not in code_map:
                    code_map[code] = email
                    TRACKING_CODE_CACHE[code] = email
    except Exception as e:
        print(f"Error reading users collection for tracking map: {e}")

    # 3. Firebase Auth (catches users not yet synced to Firestore)
    try:
        for user_record in firebase_auth.list_users().iterate_all():
            email = (user_record.email or "").strip().lower()
            if email:
                code = get_user_tracking_code(email)
                if code not in code_map:
                    code_map[code] = email
                    TRACKING_CODE_CACHE[code] = email
    except Exception as e:
        print(f"Error reading Firebase Auth users for tracking map: {e}")

    return code_map

def resolve_tracking_code_single(code: str) -> str:
    """
    Fallback lookup for a single tracking code (e.g. if not found in bulk map).
    """
    if not code:
        return ""
    if code in TRACKING_CODE_CACHE:
        return TRACKING_CODE_CACHE[code]
    try:
        doc = db.collection("tracking_codes").document(code).get()
        if doc.exists:
            email = (doc.to_dict().get("email") or "").strip().lower()
            if email:
                TRACKING_CODE_CACHE[code] = email
                return email
    except Exception as e:
        print(f"Error resolving single tracking code {code}: {e}")
    return ""
