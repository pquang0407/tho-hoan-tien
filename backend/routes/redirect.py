from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from config.database import db

router = APIRouter()

SHORT_URL_CACHE = {}

@router.get("/r/{code}")
@router.get("/thohoantien-sp/{code}")
@router.get("/thohoantien-tik/{code}")
@router.get("/thohoantien-laz/{code}")
def redirect_short_url(code: str):
    if code in SHORT_URL_CACHE:
        return RedirectResponse(url=SHORT_URL_CACHE[code], status_code=307)

    doc_ref = db.collection("short_urls").document(code).get()
    if not doc_ref.exists:
        raise HTTPException(status_code=404, detail="Đường liên kết không tồn tại hoặc đã hết hạn.")
    data = doc_ref.to_dict()
    long_url = data.get("long_url")
    if long_url:
        SHORT_URL_CACHE[code] = long_url
    return RedirectResponse(url=long_url, status_code=307)
