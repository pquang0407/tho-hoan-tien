import re
import json
import html
import random
import secrets
import requests
from urllib.parse import urlparse, parse_qs, quote, unquote
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from config.database import db
from config.settings import SHOPEE_AFFILIATE_ID
from utils.tracking import generate_dynamic_sub_id
from utils.url_cleaner import normalize_shopee_product_url

router = APIRouter()

SHORT_URL_CACHE = {}

# Danh sách chữ ký User-Agent của các Bot cào preview (Facebook, Zalo, Google, Telegram, v.v.)
BOT_UA_KEYWORDS = [
    "facebookexternalhit",
    "facebot",
    "twitterbot",
    "telegrambot",
    "discordbot",
    "whatsapp",
    "slackbot",
    "linkedinbot",
    "pinterest",
    "googlebot",
    "adsbot-google",
    "apis-google",
    "mediapartners-google",
    "bingbot",
    "yandex",
    "baiduspider",
    "duckduckbot",
    "applebot",
    "semrushbot",
    "ahrefsbot",
    "mj12bot",
    "petalbot",
    "bytespider",
    "gptbot",
    "claudebot",
    "ccbot",
    "dotbot",
    "rogerbot",
    "embedly",
    "quora link preview",
    "showyoubot",
    "outbrain",
    "vkshare",
    "w3c_validator",
    "redditbot",
    "skypeuripreview",
    "nuzzel",
    "flipboard",
    "tumblr",
    "bitlybot",
    "viber",
    "kakaotalk-scrap",
    "line-poker",
    "headlesschrome",
    "phantomjs",
    "selenium",
    "puppeteer",
    "playwright",
    "curl/",
    "wget/",
    "python-requests",
    "python-urllib",
    "go-http-client",
    "java/",
    "libwww-perl",
    "okhttp",
    "axios/",
    "node-fetch",
    "postmanruntime",
    "insomnia",
    " preview",
    "crawler",
    "spider",
    "scraper",
]


def is_crawler_or_bot(request: Request) -> bool:
    """
    Phát hiện các Bot cào link preview của Facebook, Zalo, Google, Telegram...
    Nếu là Bot -> chỉ trả về trang HTML tĩnh chứa ảnh/tiêu đề OpenGraph, tuyệt đối không sinh sub_id và không gọi Shopee.
    """
    if request.method.upper() == "HEAD":
        return True

    ua = (request.headers.get("user-agent") or "").strip()
    if not ua or len(ua) < 15:
        return True

    ua_lower = ua.lower()
    for kw in BOT_UA_KEYWORDS:
        if kw in ua_lower:
            return True

    # Bot cào preview của Zalo trên server thường có từ "zalo" nhưng không có engine trình duyệt thực (AppleWebKit / Chrome / Gecko)
    if "zalo" in ua_lower and not any(x in ua_lower for x in ["applewebkit", "chrome", "safari", "gecko"]):
        return True

    # Phải là trình duyệt thật có Mozilla/5.0 và engine hiển thị
    if "mozilla/5.0" not in ua_lower:
        return True

    return False


def sanitize_browser_user_agent(raw_ua: str) -> str:
    """
    Làm sạch User-Agent của trình duyệt In-App (Zalo, Facebook, Messenger, TikTok, YouTube, Instagram...)
    thành User-Agent trình duyệt chuẩn (Safari trên iOS hoặc Chrome trên Android/Desktop),
    giữ nguyên đời máy & phiên bản hệ điều hành thật của người bấm để Shopee luôn ghi nhận Kênh = 'Khác' (không phải Zalo/FB/TikTok/YT).
    """
    if not raw_ua:
        return "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"

    # 1. Thiết bị iOS (iPhone / iPad)
    if "iPhone" in raw_ua or "iPad" in raw_ua:
        ios_match = re.search(r"CPU (?:iPhone )?OS (\d+_[0-9_]+)", raw_ua)
        ios_ver = ios_match.group(1) if ios_match else "17_4"
        major_minor = ".".join(ios_ver.split("_")[:2])
        device = "iPad" if "iPad" in raw_ua else "iPhone"
        return (
            f"Mozilla/5.0 ({device}; CPU {device} OS {ios_ver} like Mac OS X) "
            f"AppleWebKit/605.1.15 (KHTML, like Gecko) Version/{major_minor} Mobile/15E148 Safari/604.1"
        )

    # 2. Thiết bị Android
    if "Android" in raw_ua:
        ver_match = re.search(r"Android\s+([0-9.]+)", raw_ua)
        android_ver = ver_match.group(1) if ver_match else "14"

        # Trích xuất model máy thật nếu có (loại bỏ '; wv' của WebView)
        model = "SM-S918B"
        paren_match = re.search(r"\((?:Linux;\s*)?Android[^)]*\)", raw_ua)
        if paren_match:
            parts = [p.strip() for p in paren_match.group(0).strip("()").split(";")]
            for p in parts:
                p_clean = re.sub(r"\s+Build/.*$", "", p, flags=re.IGNORECASE).strip()
                if (
                    p_clean
                    and p_clean.lower() not in ["linux", "wv", "u"]
                    and not p_clean.lower().startswith("android")
                    and len(p_clean) >= 3
                ):
                    model = p_clean
                    break

        chrome_match = re.search(r"Chrome/([0-9.]+)", raw_ua)
        chrome_ver = chrome_match.group(1) if chrome_match else "126.0.0.0"
        return (
            f"Mozilla/5.0 (Linux; Android {android_ver}; {model}) "
            f"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chrome_ver} Mobile Safari/537.36"
        )

    # 3. Thiết bị Desktop (Windows / Mac)
    return (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    )


def get_short_url_record(code: str) -> dict:
    """Lấy thông tin link rút gọn từ RAM cache hoặc Firestore và chuẩn hóa về dict."""
    cached = SHORT_URL_CACHE.get(code)
    if cached:
        if isinstance(cached, dict):
            return cached
        return {"long_url": str(cached)}

    doc_ref = db.collection("short_urls").document(code).get()
    if not doc_ref.exists:
        return {}
    data = doc_ref.to_dict() or {}
    if data.get("long_url"):
        SHORT_URL_CACHE[code] = data
    return data


def extract_shopee_components(record: dict) -> tuple:
    """
    Trích xuất (origin_link, affiliate_id, tracking_code) từ bản ghi short_urls.
    Hỗ trợ cả link mới lẫn toàn bộ link cũ đã tạo trước đây.
    """
    long_url = record.get("long_url", "")
    original_url = record.get("original_url", "")
    tracking_code = record.get("tracking_code", "")
    aff_id = SHOPEE_AFFILIATE_ID or "17395210573"

    if "s.shopee.vn/an_redir" in long_url:
        try:
            parsed = urlparse(long_url)
            qs = parse_qs(parsed.query)
            if not original_url and "origin_link" in qs:
                original_url = unquote(qs["origin_link"][0])
            if "affiliate_id" in qs and qs["affiliate_id"][0]:
                aff_id = qs["affiliate_id"][0]
            if not tracking_code and "sub_id" in qs:
                raw_sub = qs["sub_id"][0]
                for tok in raw_sub.split("-"):
                    tok = tok.strip()
                    if tok.startswith("vid_") or "_at_" in tok:
                        tracking_code = tok
                        break
        except Exception as e:
            print(f"Error parsing Shopee long_url components: {e}")

    if original_url:
        original_url = normalize_shopee_product_url(original_url)

    return original_url, aff_id, tracking_code


def build_random_channel_headers(raw_ua: str) -> tuple:
    """
    Tuyệt đối xóa sạch dấu vết Zalo và xoay vòng ngẫu nhiên giữa 5 kênh hợp lệ:
    1. Facebook
    2. TikTok
    3. YouTube
    4. Instagram
    5. Khác (Trình duyệt Safari/Chrome thuần)
    Giữ nguyên đời máy & hệ điều hành thật của người bấm để mỗi lượt click vừa đổi sub_id vừa đổi Kênh tự nhiên.
    """
    base_ua = sanitize_browser_user_agent(raw_ua)
    is_ios = "iPhone" in base_ua or "iPad" in base_ua
    is_android = "Android" in base_ua

    channels = ["facebook", "tiktok", "youtube", "instagram", "other"]
    chosen = random.choice(channels)

    if chosen == "facebook":
        referer = random.choice(["https://m.facebook.com/", "https://l.facebook.com/", "https://www.facebook.com/"])
        if is_ios:
            ua = f"{base_ua} [FBAN/FBIOS;FBAV/462.0.0.45.109;FBBV/5984123;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/17.4;FBSS/3;FBID/phone;FBLC/vi_VN;FBOP/5]"
        elif is_android:
            ua = f"{base_ua} [FB_IAB/FB4A;FBAV/460.0.0.38.109;]"
        else:
            ua = base_ua
        return chosen, ua, referer

    if chosen == "tiktok":
        referer = "https://www.tiktok.com/"
        if is_ios or is_android:
            ua = f"{base_ua} musical_ly_2023405010 JsSdk/1.0 NetType/WIFI Channel/AppStore AppName/musical_ly app_version/34.5.1 ByteLocale/vi-VN Region/VN AppId/1180 BytedanceWebview/d8a21c6"
        else:
            ua = base_ua
        return chosen, ua, referer

    if chosen == "youtube":
        referer = random.choice(["https://m.youtube.com/", "https://www.youtube.com/", "android-app://com.google.android.youtube/"])
        return chosen, base_ua, referer

    if chosen == "instagram":
        referer = random.choice(["https://l.instagram.com/", "https://www.instagram.com/"])
        if is_ios:
            ua = f"{base_ua} Instagram 330.0.0.38.95 (iPhone15,3; iOS 17_4; vi_VN; vi; scale=3.00; 1179x2556; 592837124)"
        elif is_android:
            ua = f"{base_ua} Instagram 330.0.0.40.92 Android (34/14; 480dpi; 1080x2340; samsung; SM-S918B; dm3q; qcom; vi_VN; 592837190)"
        else:
            ua = base_ua
        return chosen, ua, referer

    # Kênh "Khác" (Trình duyệt web độc lập / Google Search)
    referer = random.choice(["", "https://www.google.com.vn/", "https://www.google.com/"])
    return "other", base_ua, referer


def _clean_shopee_web_url(http_url: str) -> str:
    """Chuyển /opaanlp/shop/item?__mobile__=1&... về /product/shop/item?... để trình duyệt Web/PC mở thẳng trang sản phẩm không bị lỗi."""
    if not http_url:
        return http_url
    cleaned = re.sub(r"/opaanlp/(\d+)/(\d+)", r"/product/\1/\2", http_url)
    cleaned = cleaned.replace("__mobile__=1&", "").replace("&__mobile__=1", "").replace("?__mobile__=1", "")
    return cleaned


def resolve_shopee_clean_channel(dynamic_aff_url: str, raw_ua: str) -> dict:
    """
    Gọi s.shopee.vn/an_redir bằng bộ Header xoay vòng ngẫu nhiên 5 kênh (Facebook, TikTok, YouTube, Instagram, Khác - tuyệt đối không có Zalo),
    giúp Shopee ghi nhận mỗi lượt click có uls_trackid riêng biệt và phân bổ đều Kênh trả về.
    """
    _, spoofed_ua, spoofed_referer = build_random_channel_headers(raw_ua)
    req_headers = {
        "User-Agent": spoofed_ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    }
    if spoofed_referer:
        req_headers["Referer"] = spoofed_referer

    try:
        resp = requests.get(dynamic_aff_url, headers=req_headers, allow_redirects=False, timeout=4)
        # Trường hợp Desktop trả về 301/302 Location trực tiếp
        if resp.status_code in (301, 302, 303, 307, 308) and resp.headers.get("Location"):
            loc = _clean_shopee_web_url(resp.headers["Location"])
            return {"mode": "redirect", "http_url": loc, "deep_link_url": ""}

        body = resp.text or ""
        m_http = re.search(r'httpUrl:\s*"([^"]+)"', body)
        m_deep = re.search(r'deepLinkUrl:\s*"([^"]+)"', body)
        m_evoke = re.search(r'evokeAppMethod:\s*parseInt\("(\d+)"\)', body)

        http_url = _clean_shopee_web_url(json.loads(f'"{m_http.group(1)}"')) if m_http else ""
        deep_link_url = json.loads(f'"{m_deep.group(1)}"') if m_deep else ""
        evoke_method = int(m_evoke.group(1)) if m_evoke else (1 if ("iPhone" in spoofed_ua or "iPad" in spoofed_ua) else 2)

        if http_url or deep_link_url:
            return {
                "mode": "deeplink",
                "http_url": http_url or dynamic_aff_url,
                "deep_link_url": deep_link_url,
                "evoke_method": evoke_method,
            }
    except Exception as e:
        print(f"Warning: resolve_shopee_clean_channel fallback: {e}")

    return {"mode": "redirect", "http_url": dynamic_aff_url, "deep_link_url": ""}


def build_bot_preview_html(record: dict) -> str:
    """
    Trang HTML tĩnh trả về cho Bot cào preview (Facebook, Zalo, Google, Telegram).
    Không chứa link affiliate Shopee và không chuyển hướng để chặn 100% click rác từ Bot.
    """
    title = html.escape(record.get("product_name") or "Ưu đãi mua sắm chính hãng")
    image = html.escape(record.get("product_image") or "https://cdn-icons-png.flaticon.com/512/5968/5968953.png")
    desc = "Xem chi tiết sản phẩm và nhận voucher ưu đãi chính hãng."
    return f"""<!DOCTYPE html>
<html lang="vi" prefix="og: http://ogp.me/ns#">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <title>{title}</title>
    <meta property="og:type" content="website">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{desc}">
    <meta property="og:image" content="{image}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{desc}">
    <meta name="twitter:image" content="{image}">
</head>
<body>
    <p>{title}</p>
</body>
</html>"""


def build_human_gate_html(code: str, record: dict) -> str:
    """
    Bước lọc ngầm 0.05 giây trên trình duyệt:
    1. Trả về thẻ OpenGraph đẹp cho các trình cào preview ngầm (không thực thi JS).
    2. Kiểm tra môi trường trình duyệt người dùng thật (!navigator.webdriver, kích thước màn hình thật)
       và hỗ trợ bắt sự kiện tương tác (click / touchend) để sinh mã Hex động '1 Link - Vạn Click Khác Nhau'.
    """
    title = html.escape(record.get("product_name") or "Đang mở trang sản phẩm...")
    image = html.escape(record.get("product_image") or "https://cdn-icons-png.flaticon.com/512/5968/5968953.png")
    escaped_code = json.dumps(code)

    return f"""<!DOCTYPE html>
<html lang="vi" prefix="og: http://ogp.me/ns#">
<head>
    <meta charset="utf-8">
    <meta name="referrer" content="no-referrer">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <meta property="og:type" content="website">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="Xem chi tiết sản phẩm và ưu đãi chính hãng.">
    <meta property="og:image" content="{image}">
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
            padding: 32px 24px;
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
            border-top: 3px solid #ee4d2d;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
            margin: 0 auto 16px;
        }}
        @keyframes spin {{ 0% {{ transform: rotate(0deg); }} 100% {{ transform: rotate(360deg); }} }}
        .text {{ font-size: 15px; font-weight: 500; margin-bottom: 16px; }}
        .btn-continue {{
            display: inline-block;
            background: #ee4d2d;
            color: #fff;
            font-weight: 600;
            font-size: 14px;
            padding: 12px 24px;
            border-radius: 10px;
            text-decoration: none;
            border: none;
            cursor: pointer;
            width: 100%;
        }}
    </style>
</head>
<body>
    <div class="card" id="gateCard">
        <div class="spinner"></div>
        <div class="text">Đang kết nối tới sản phẩm...</div>
        <button type="button" class="btn-continue" id="manualBtn">Xem sản phẩm ngay</button>
    </div>
    <script>
        (function() {{
            var fired = false;
            function isBotEnv() {{
                var ua = (navigator.userAgent || "").toLowerCase();
                if (navigator.webdriver) return true;
                if (/facebookexternalhit|facebot|telegrambot|twitterbot|googlebot|bingbot|crawler|spider|headless/i.test(ua)) return true;
                if (!window.screen || (window.screen.width === 0 && window.screen.height === 0)) return true;
                return false;
            }}

            function genDynamicClickTag() {{
                var now = new Date();
                var d = String(now.getDate()).padStart(2, "0");
                var m = String(now.getMonth() + 1).padStart(2, "0");
                var randHex = Math.random().toString(16).substring(2, 6);
                return "c" + d + "d" + m + "_" + randHex;
            }}

            function proceed() {{
                if (fired || isBotEnv()) return;
                fired = true;
                var cTag = genDynamicClickTag();
                var nonce = Math.random().toString(16).substring(2, 8);
                var basePath = window.location.pathname || ("/r/" + encodeURIComponent({escaped_code}));
                var nextUrl = basePath + "?c=" + encodeURIComponent(cTag) + "&n=" + encodeURIComponent(nonce);
                if (window.location.replace) {{
                    window.location.replace(nextUrl);
                }} else {{
                    window.location.href = nextUrl;
                }}
            }}

            document.addEventListener("click", proceed, {{ passive: true }});
            document.addEventListener("touchend", proceed, {{ passive: true }});
            var btn = document.getElementById("manualBtn");
            if (btn) btn.addEventListener("click", proceed);

            // Bước lọc ngầm 0.05 giây (50ms) chỉ kích hoạt cho trình duyệt người thật
            setTimeout(proceed, 50);
        }})();
    </script>
</body>
</html>"""


def build_shopee_deeplink_html(http_url: str, deep_link_url: str, evoke_method: int = 1) -> str:
    """
    Trang mở trực tiếp App Shopee bằng deepLinkUrl (shopeevn://reactPath?...) với uls_trackid sạch (Kênh: Khác),
    không đi qua s.shopee.vn trên WebView của Zalo/Facebook.
    """
    escaped_http = json.dumps(http_url)
    escaped_deep = json.dumps(deep_link_url)

    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="referrer" content="no-referrer">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đang mở Shopee...</title>
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
            padding: 32px 24px;
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
            border-top: 3px solid #ee4d2d;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
            margin: 0 auto 16px;
        }}
        @keyframes spin {{ 0% {{ transform: rotate(0deg); }} 100% {{ transform: rotate(360deg); }} }}
        .text {{ font-size: 15px; font-weight: 500; margin-bottom: 18px; }}
        .btn-open-app {{
            display: block;
            background: #ee4d2d;
            color: #ffffff;
            font-weight: 600;
            font-size: 15px;
            padding: 13px 20px;
            border-radius: 10px;
            text-decoration: none;
            margin-bottom: 12px;
            cursor: pointer;
            border: none;
            width: 100%;
        }}
        .btn-web-fallback {{
            display: inline-block;
            color: #64748b;
            font-size: 13px;
            text-decoration: underline;
            cursor: pointer;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="spinner"></div>
        <div class="text">Đang mở ứng dụng Shopee...</div>
        <button type="button" class="btn-open-app" id="openAppBtn">🛍️ Mở Ứng Dụng Shopee</button>
        <a class="btn-web-fallback" id="webFallbackLink" rel="noreferrer noopener">Hoặc xem trên trình duyệt</a>
    </div>
    <script>
        (function() {{
            var httpUrl = {escaped_http};
            var deepLinkUrl = {escaped_deep};
            var evokeMethod = {evoke_method};
            var fallbackActive = true;

            function launchApp() {{
                if (!deepLinkUrl) {{
                    goWeb();
                    return;
                }}
                try {{
                    if (evokeMethod === 1) {{
                        var a = document.createElement("a");
                        a.setAttribute("href", deepLinkUrl);
                        a.style.display = "none";
                        document.body.appendChild(a);
                        a.click();
                    }} else {{
                        window.location.href = deepLinkUrl;
                    }}
                }} catch (e) {{
                    goWeb();
                }}
            }}

            function goWeb() {{
                if (!httpUrl) return;
                fallbackActive = false;
                if (window.location.replace) {{
                    window.location.replace(httpUrl);
                }} else {{
                    window.location.href = httpUrl;
                }}
            }}

            document.addEventListener("visibilitychange", function() {{
                if (document.hidden || document.webkitHidden) {{
                    fallbackActive = false;
                }}
            }});

            var openBtn = document.getElementById("openAppBtn");
            if (openBtn) {{
                openBtn.addEventListener("click", function(e) {{
                    e.preventDefault();
                    launchApp();
                }});
                openBtn.addEventListener("touchend", function(e) {{
                    launchApp();
                }}, {{ passive: true }});
            }}

            var webLink = document.getElementById("webFallbackLink");
            if (webLink) {{
                webLink.addEventListener("click", function(e) {{
                    e.preventDefault();
                    goWeb();
                }});
            }}

            launchApp();

            setTimeout(function() {{
                var isHidden = document.hidden || document.mozHidden || document.webkitHidden || document.msHidden;
                if (fallbackActive && !isHidden) {{
                    goWeb();
                }}
            }}, 3500);
        }})();
    </script>
</body>
</html>"""


def build_no_referrer_html(target_url: str) -> str:
    escaped_url = json.dumps(target_url)
    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="referrer" content="no-referrer">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
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


@router.api_route("/r/{code}", methods=["GET", "HEAD"])
@router.api_route("/thohoantien-sp/{code}", methods=["GET", "HEAD"])
@router.api_route("/thohoantien-tik/{code}", methods=["GET", "HEAD"])
@router.api_route("/thohoantien-laz/{code}", methods=["GET", "HEAD"])
def redirect_short_url(code: str, request: Request, c: str = "", n: str = ""):
    record = get_short_url_record(code)
    if not record or not record.get("long_url"):
        raise HTTPException(status_code=404, detail="Đường liên kết không tồn tại hoặc đã hết hạn.")

    headers = {
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
    }

    # Bước 1: Lọc Bot cào preview (Facebook, Zalo, Google, Telegram...) -> chỉ trả về ảnh & tiêu đề tĩnh
    if is_crawler_or_bot(request):
        return HTMLResponse(content=build_bot_preview_html(record), headers=headers)

    # Bước 3: Khi trình duyệt người thật đã qua bước lọc 0.05s và gửi kèm mã click động `c`
    if c:
        return execute_dynamic_redirect(code=code, request=request, c=c, n=n)

    # Bước 2: Trả về trang lọc ngầm 0.05s sinh mã click Hex động trên trình duyệt thật
    return HTMLResponse(content=build_human_gate_html(code, record), headers=headers)


@router.get("/go/{code}")
@router.get("/thohoantien-sp/go/{code}")
@router.get("/thohoantien-tik/go/{code}")
@router.get("/thohoantien-laz/go/{code}")
def execute_dynamic_redirect(code: str, request: Request, c: str = "", n: str = ""):
    record = get_short_url_record(code)
    if not record or not record.get("long_url"):
        raise HTTPException(status_code=404, detail="Đường liên kết không tồn tại hoặc đã hết hạn.")

    headers = {
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
    }

    # Chặn lần 2 nếu Bot cố tình gọi trực tiếp /go/{code}
    if is_crawler_or_bot(request):
        return HTMLResponse(content=build_bot_preview_html(record), headers=headers)

    long_url = record.get("long_url", "")
    platform = (record.get("platform") or "").lower()
    raw_ua = request.headers.get("user-agent") or ""

    # Xử lý "1 Link - Vạn Click Khác Nhau" & làm sạch Kênh = "Khác" cho Shopee
    if platform == "shopee" or "shopee.vn" in long_url:
        origin_link, aff_id, tracking_code = extract_shopee_components(record)
        if origin_link:
            # Sinh sub_id mới hoàn toàn cho riêng lượt click này (cDDdMM_hex4-vid_xxx-hex6)
            dynamic_sub_id = generate_dynamic_sub_id(tracking_code, client_token=c)
            encoded_origin = quote(origin_link, safe="")
            dynamic_aff_url = (
                f"https://s.shopee.vn/an_redir?origin_link={encoded_origin}"
                f"&affiliate_id={aff_id}&sub_id={dynamic_sub_id}"
            )

            resolved = resolve_shopee_clean_channel(dynamic_aff_url, raw_ua)
            if resolved.get("mode") == "deeplink" and resolved.get("deep_link_url"):
                return HTMLResponse(
                    content=build_shopee_deeplink_html(
                        http_url=resolved["http_url"],
                        deep_link_url=resolved["deep_link_url"],
                        evoke_method=resolved.get("evoke_method", 1),
                    ),
                    headers=headers,
                )
            return HTMLResponse(content=build_no_referrer_html(resolved["http_url"]), headers=headers)

    return HTMLResponse(content=build_no_referrer_html(long_url), headers=headers)
