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
