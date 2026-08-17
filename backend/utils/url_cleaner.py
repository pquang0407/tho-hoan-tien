import requests
from urllib.parse import urlparse, urlunparse

def clean_shopee_url(url: str) -> str:
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc.lower()
        
        # 1. Expand short link if it is shope.ee, shp.ee, s.shopee.vn, short, or live
        if any(domain in netloc for domain in ["shope.ee", "shp.ee", "s.shopee.vn", "short", "live"]):
            try:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
                # Follow redirects to retrieve the final product URL
                response = requests.get(url, headers=headers, allow_redirects=True, timeout=5)
                url = response.url
                parsed = urlparse(url)
                netloc = parsed.netloc.lower()
            except Exception as e:
                print(f"Failed to expand Shopee short link {url}: {e}")
                
        # 2. Clean query parameters from long shopee.vn URL
        if "shopee.vn" in netloc:
            return urlunparse((parsed.scheme, parsed.netloc, parsed.path, '', '', ''))
    except Exception:
        pass
    return url

def clean_lazada_url(url: str) -> str:
    try:
        import re
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
            return urlunparse((parsed.scheme, parsed.netloc, parsed.path, '', '', ''))
    except Exception:
        pass
    return url
