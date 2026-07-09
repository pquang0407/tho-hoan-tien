import os
from dotenv import load_dotenv
from urllib.parse import urlparse

# Load environment variables
load_dotenv()

# Frontend Domain
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://tho-hoantien.com").rstrip("/")
parsed_domain = urlparse(FRONTEND_URL).netloc
if parsed_domain.startswith("www."):
    parsed_domain = parsed_domain[4:]
if not parsed_domain:
    parsed_domain = "tho-hoantien.com"
BASE_DOMAIN = parsed_domain

# Affiliate & Platform settings
SHOPEE_AFFILIATE_ID = os.getenv("SHOPEE_AFFILIATE_ID")
ENABLE_SHOPEE = os.getenv("ENABLE_SHOPEE", "false").lower() == "true"
AT_API_KEY = os.getenv("ACCESSTRADE_API_KEY")

# Campaign IDs
TIKTOK_CAMPAIGN_ID = os.getenv("TIKTOK_CAMPAIGN_ID")
SHOPEE_CAMPAIGN_ID = os.getenv("SHOPEE_CAMPAIGN_ID")
LAZADA_CAMPAIGN_ID = os.getenv("LAZADA_CAMPAIGN_ID")

# Admin Settings
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
ADMIN_EMAIL2 = os.getenv("ADMIN_EMAIL2")

# Ratio values
cashback_percent = 70
user_ratio = 0.7
admin_ratio = 0.3
REPORT_DAYS = 30
REQUEST_TIMEOUT = 15
