from urllib.parse import urlparse, urlunparse

def clean_shopee_url(url: str) -> str:
    try:
        parsed = urlparse(url)
        if "shopee.vn" in parsed.netloc:
            return urlunparse((parsed.scheme, parsed.netloc, parsed.path, '', '', ''))
    except Exception:
        pass
    return url
