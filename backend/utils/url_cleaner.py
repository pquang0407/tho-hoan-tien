import re
import json
import requests
from urllib.parse import urlparse, urlunparse, parse_qs, unquote


def _resolve_single_shopee_short_url(short_url: str) -> str:
    """Giải mã 1 link rút gọn Shopee (s.shopee.vn, shope.ee, shp.ee) nhanh bằng Location header hoặc CONFIG.httpUrl."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    }
    curr = short_url
    for _ in range(5):
        resp = requests.get(curr, headers=headers, allow_redirects=False, timeout=5)
        if resp.status_code in (301, 302, 303, 307, 308) and resp.headers.get("Location"):
            curr = resp.headers["Location"]
            if "shopee.vn" in curr and "s.shopee.vn" not in curr:
                return curr
            if "error_page" in curr:
                return curr
        elif resp.status_code == 200:
            m_http = re.search(r'httpUrl:\s*"([^"]+)"', resp.text or "")
            if m_http:
                return json.loads(f'"{m_http.group(1)}"')
            break
        else:
            break
    return curr


def normalize_shopee_product_url(url: str) -> str:
    """
    Chuẩn hóa mọi biến thể link Shopee (/opaanlp/shop/item, /slug-i.shop.item, /product/shop/item)
    về dạng chuẩn https://shopee.vn/product/{shop_id}/{item_id}.
    """
    if not url:
        return url
    parsed = urlparse(url)
    path = parsed.path or ""

    # Dạng 1: /opaanlp/{shop_id}/{item_id} hoặc /product/{shop_id}/{item_id}
    m_op = re.search(r"/(?:opaanlp|product)/(\d+)/(\d+)", path)
    if m_op:
        return f"https://shopee.vn/product/{m_op.group(1)}/{m_op.group(2)}"

    # Dạng 2: /{slug}-i.{shop_id}.{item_id}
    m_slug = re.search(r"-i\.(\d+)\.(\d+)", path)
    if m_slug:
        return f"https://shopee.vn/product/{m_slug.group(1)}/{m_slug.group(2)}"

    # Dạng 3: /{shop_name}/{item_id}
    m_shop = re.search(r"^/([^/]+)/(\d+)$", path)
    if m_shop and m_shop.group(1) not in ("product", "opaanlp", "universal-link"):
        return f"https://shopee.vn/{m_shop.group(1)}/{m_shop.group(2)}"

    if "shopee.vn" in parsed.netloc.lower():
        return urlunparse((parsed.scheme or "https", parsed.netloc, path, "", "", ""))
    return url


def clean_shopee_url(url: str) -> str:
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc.lower()

        # 0. Extract origin_link parameter directly if present in an_redir URL
        if "origin_link=" in url:
            query = parse_qs(parsed.query)
            if "origin_link" in query:
                url = unquote(query["origin_link"][0])
                parsed = urlparse(url)
                netloc = parsed.netloc.lower()

        # 1. Expand short link if it is shope.ee, shp.ee, s.shopee.vn, sshopee.site, sshopee.com, short, or live
        if any(domain in netloc for domain in ["shope.ee", "shp.ee", "s.shopee.vn", "sshopee.site", "sshopee.com", "short", "live"]):
            try:
                resolved = _resolve_single_shopee_short_url(url)

                # Tự động sửa lỗi gõ nhầm chữ 'l' thường và chữ 'I' hoa trong mã rút gọn s.shopee.vn (ví dụ W8K9ulGD4 -> W8K9uIGD4)
                if "error_page" in resolved and ("l" in parsed.path or "I" in parsed.path):
                    alt_candidates = []
                    if "l" in parsed.path:
                        alt_candidates.append(parsed.path.replace("l", "I"))
                    if "I" in parsed.path:
                        alt_candidates.append(parsed.path.replace("I", "l"))
                    for alt_path in alt_candidates:
                        alt_url = urlunparse((parsed.scheme, parsed.netloc, alt_path, "", "", ""))
                        alt_resolved = _resolve_single_shopee_short_url(alt_url)
                        if "error_page" not in alt_resolved and "shopee.vn" in alt_resolved:
                            resolved = alt_resolved
                            break

                url = resolved
            except Exception as e:
                print(f"Failed to expand Shopee short link {url}: {e}")

        # 2. Chuẩn hóa về https://shopee.vn/product/{shop_id}/{item_id}
        return normalize_shopee_product_url(url)
    except Exception:
        pass
    return url


def clean_lazada_url(url: str) -> str:
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc.lower()

        # 1. Giải mã link rút gọn Lazada (s.lazada.vn)
        if "s.lazada.vn" in netloc:
            try:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
                    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                }
                response = requests.get(url, headers=headers, timeout=10)

                # Tìm trong thẻ <link rel="origin" href="...">
                match = re.search(r'<link\s+rel=["\']origin["\']\s+href=["\'](https://www.lazada.vn/products/[^"\']+)["\']', response.text)
                if match:
                    url = match.group(1)
                else:
                    # Tìm trong thẻ meta refresh
                    match = re.search(r'url=(https://www.lazada.vn/products/[^"\'>]+)', response.text)
                    if match:
                        url = match.group(1)
                    else:
                        # Tìm bất kỳ URL sản phẩm nào
                        match = re.search(r'(https://www.lazada.vn/products/[^\'"\s]+)', response.text)
                        if match:
                            url = match.group(1)

                parsed = urlparse(url)
                netloc = parsed.netloc.lower()
            except Exception as e:
                print(f"Failed to expand Lazada short link {url}: {e}")

        # 2. Làm sạch các tham số theo dõi (exlaz, tracking...) giữ lại URL sản phẩm tinh khiết
        if "lazada.vn" in netloc:
            return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", "", ""))
    except Exception:
        pass
    return url
