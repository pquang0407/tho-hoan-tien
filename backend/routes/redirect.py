import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from config.database import db

router = APIRouter()

SHORT_URL_CACHE = {}

def build_no_referrer_html(target_url: str) -> str:
    escaped_url = json.dumps(target_url)
    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="referrer" content="no-referrer">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="0;url={target_url}">
    <title>Đang chuyển hướng an toàn...</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            background: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            color: #334155;
        }}
        .card {{
            text-align: center;
            padding: 32px;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.06);
            max-width: 380px;
            width: 90%;
        }}
        .spinner {{
            width: 36px;
            height: 36px;
            border: 3px solid #e2e8f0;
            border-top: 3px solid #ff5722;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
            margin: 0 auto 16px;
        }}
        @keyframes spin {{ 0% {{ transform: rotate(0deg); }} 100% {{ transform: rotate(360deg); }} }}
        .text {{ font-size: 15px; font-weight: 500; }}
    </style>
</head>
<body>
    <div class="card">
        <div class="spinner"></div>
        <div class="text">Đang chuyển hướng tới sàn...</div>
    </div>
    <script>
        (function() {{
            var dest = {escaped_url};
            if (window.location.replace) {{
                window.location.replace(dest);
            }} else {{
                window.location.href = dest;
            }}
        }})();
    </script>
</body>
</html>"""

@router.get("/r/{code}")
@router.get("/thohoantien-sp/{code}")
@router.get("/thohoantien-tik/{code}")
@router.get("/thohoantien-laz/{code}")
def redirect_short_url(code: str):
    long_url = SHORT_URL_CACHE.get(code)
    if not long_url:
        doc_ref = db.collection("short_urls").document(code).get()
        if not doc_ref.exists:
            raise HTTPException(status_code=404, detail="Đường liên kết không tồn tại hoặc đã hết hạn.")
        data = doc_ref.to_dict()
        long_url = data.get("long_url")
        if long_url:
            SHORT_URL_CACHE[code] = long_url

    if not long_url:
        raise HTTPException(status_code=404, detail="Không tìm thấy liên kết đích.")

    headers = {
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache"
    }
    return HTMLResponse(content=build_no_referrer_html(long_url), headers=headers)
