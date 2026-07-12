import openpyxl
from io import BytesIO
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException, UploadFile, File
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore

from config.database import db
from config.limiter import limiter
from config.settings import ADMIN_EMAIL, ADMIN_EMAIL2
from middleware.auth import verify_admin, get_user_ratios
from utils.analytics import get_firebase_summary, get_dashboard_analytics

router = APIRouter()

class WithdrawalUpdate(BaseModel):
    request_id: str
    status: str

@router.get("/api/admin/at-reports")
@limiter.limit("30/minute")
def admin_reports(request: Request):
    verify_admin(request)
    orders = [
        doc.to_dict()
        for doc in db.collection("orders").stream()
    ]
    firebase = get_firebase_summary()
    analytics = get_dashboard_analytics(orders)
    
    total_orders = len(orders)
    approved_commission = 0
    pending_commission = 0
    rejected_commission = 0

    approved_sales = 0
    pending_sales = 0
    rejected_sales = 0
    result = []
    
    approved_count = pending_count = reject_count = 0
    approved_admin_profit = 0
    
    for item in orders:
        commission = float(item.get("reward", 0))
        sales = float(item.get("product_price", 0))

        confirmed = int(item.get("confirmed", 0))
        status = int(item.get("status", 0))
        email = item.get("utm_source", "")

        if confirmed == 1:
            approved_commission += commission
            approved_sales += sales
            
            _, a_ratio, _ = get_user_ratios(email)
            approved_admin_profit += commission * a_ratio

            approved_count += 1
            order_status = 1
        elif status == 2:
            rejected_commission += commission
            rejected_sales += sales

            reject_count += 1
            order_status = 2
        else:
            pending_commission += commission
            pending_sales += sales

            pending_count += 1
            order_status = 0

        result.append({
            "order_id": item.get("order_id"),
            "order_time": item.get("sales_time"),
            "campaign_name": item.get("campaign_id"),
            "sales_amount": sales,
            "pub_commission": commission,
            "order_status": order_status,
            "utm_source": item.get("utm_source", "")
        })
        
    result.sort(key=lambda x: x["order_time"], reverse=True)
    return {
        "success": True,
        "summary": {
            "conversions": total_orders,
            "approved_commission": round(approved_commission),
            "pending_commission": round(pending_commission),
            "rejected_commission": round(rejected_commission),
            "approved_sales": round(approved_sales),
            "pending_sales": round(pending_sales),
            "rejected_sales": round(rejected_sales),
            "net_profit": round(approved_admin_profit),
            "generated_links": firebase["generated_links"],
            "users": firebase["users"],
            "logs": firebase["logs"]
        },
        "analytics": {**analytics, "order_status": {"approved": approved_count, "pending": pending_count, "rejected": reject_count}},
        "orders": result[:30]
    }

@router.get("/api/admin/withdrawals")
@limiter.limit("30/minute")
def get_withdrawals(request: Request):
    """Admin lấy danh sách yêu cầu rút tiền"""
    verify_admin(request)
    docs = db.collection("withdrawals").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    
    result = []
    for doc in docs:
        data = doc.to_dict()
        created_time = ""
        if "created_at" in data and data["created_at"]:
            try:
                created_time = data["created_at"].strftime("%d/%m/%Y %H:%M")
            except:
                created_time = str(data["created_at"])
        result.append({
            "id": doc.id,
            "email": data.get("user_email", "N/A"),
            "amount": data.get("amount", 0),
            "bank": data.get("bank_info", "N/A"),
            "status": data.get("status", "pending"),
            "date": created_time
        })
    return {"success": True, "data": result}

@router.post("/api/admin/withdrawals/update")
@limiter.limit("30/minute")
def update_withdrawal(request: Request, body: WithdrawalUpdate):
    """Admin cập nhật trạng thái yêu cầu rút tiền"""
    verify_admin(request)
    doc_ref = db.collection("withdrawals").document(body.request_id)
    
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu rút tiền này")
        
    doc_ref.update({
        "status": body.status,
        "updated_at": datetime.now()
    })
    return {"success": True, "message": "Cập nhật trạng thái thành công"}

@router.get("/api/admin/users")
@limiter.limit("30/minute")
def get_admin_users(request: Request, start_date: str = None, end_date: str = None):
    """Admin lấy danh sách chi tiết hành vi người dùng có lọc theo ngày chuẩn xác"""
    verify_admin(request)
    
    conversions = db.collection("conversions").stream()
    user_data = defaultdict(lambda: {"email": "", "total_links": 0, "recent_links": []})
    
    start_d = None
    end_d = None
    if start_date:
        try: start_d = datetime.strptime(start_date, "%Y-%m-%d").date()
        except: pass
    if end_date:
        try: end_d = datetime.strptime(end_date, "%Y-%m-%d").date()
        except: pass

    for doc in conversions:
        data = doc.to_dict()
        email = data.get("user_email")
        if not email:
            continue
            
        created_at = data.get("created_at")
        time_str = "N/A"
        time_val = 0
        doc_d = None
        
        if created_at:
            try:
                if hasattr(created_at, "timestamp"):
                    time_val = created_at.timestamp()
                    dt_vn = datetime.fromtimestamp(time_val, tz=timezone.utc) + timedelta(hours=7)
                    doc_d = dt_vn.date()
                    time_str = dt_vn.strftime("%d/%m/%Y %H:%M")
                elif isinstance(created_at, str):
                    dt_obj = datetime.fromisoformat(created_at[:19])
                    doc_d = dt_obj.date()
                    time_val = dt_obj.timestamp()
                    time_str = dt_obj.strftime("%d/%m/%Y %H:%M")
            except Exception:
                pass

        if (start_d or end_d) and not doc_d:
            continue
            
        if doc_d:
            if start_d and doc_d < start_d:
                continue
            if end_d and doc_d > end_d:
                continue

        user_data[email]["email"] = email
        user_data[email]["total_links"] += 1
        
        user_data[email]["recent_links"].append({
            "product_name": data.get("product_name", "N/A"),
            "platform": data.get("platform", "N/A"),
            "short_link": data.get("short_link", "N/A"),
            "time_str": time_str,
            "time_val": time_val
        })
        
    result = []
    for email, info in user_data.items():
        info["recent_links"].sort(key=lambda x: x["time_val"], reverse=True)
        recent = info["recent_links"]
        if info["total_links"] > 0:
            result.append({
                "email": email,
                "total_links": info["total_links"],
                "recent_links": recent
            })
            
    result.sort(key=lambda x: x["total_links"], reverse=True)
    return {"success": True, "data": result}

@router.post("/api/admin/sync-users")
@limiter.limit("5/minute")
def sync_users(request: Request):
    verify_admin(request)

    page = firebase_auth.list_users()
    total = 0

    while page:
        for user in page.users:
            email = user.email
            if not email:
                continue

            db.collection("users").document(email).set(
                {
                    "uid": user.uid,
                    "email": email,
                    "displayName": user.display_name or email.split("@")[0],
                    "photoURL": user.photo_url or "",
                    "phoneNumber": user.phone_number or "",
                    "disabled": user.disabled,
                    "createdAt": user.user_metadata.creation_timestamp,
                    "lastSignIn": user.user_metadata.last_sign_in_timestamp,
                    "provider": (
                        user.provider_data[0].provider_id
                        if user.provider_data
                        else ""
                    ),
                },
                merge=True,
            )
            total += 1
        page = page.get_next_page()

    return {
        "success": True,
        "synced": total
    }

@router.post("/api/admin/import-shopee-report")
@limiter.limit("5/minute")
async def import_shopee_report(request: Request, file: UploadFile = File(...)):
    verify_admin(request)
    
    try:
        contents = await file.read()
        filename = file.filename.lower()
        rows = []
        
        if filename.endswith(".csv"):
            # Try to decode CSV contents
            try:
                decoded = contents.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    decoded = contents.decode("utf-16")
                except Exception as e:
                    raise Exception(f"Không thể giải mã file CSV: {e}")
            
            import csv
            # Strip UTF-8 BOM if present
            if decoded.startswith('\ufeff'):
                decoded = decoded[1:]
                
            lines = decoded.splitlines()
            if not lines:
                raise Exception("File CSV trống")
                
            # Detect delimiter (tab, semicolon, or comma)
            first_line = lines[0]
            delimiter = ","
            if "\t" in first_line:
                delimiter = "\t"
            elif ";" in first_line:
                delimiter = ";"
                
            reader = csv.reader(lines, delimiter=delimiter)
            rows = [row for row in reader if row]
        else:
            # Process as XLSX using openpyxl
            try:
                wb = openpyxl.load_workbook(BytesIO(contents), read_only=True, data_only=True)
                sheet = wb.active
                for r_idx in range(1, sheet.max_row + 1):
                    row_vals = [sheet.cell(row=r_idx, column=c_idx).value for c_idx in range(1, sheet.max_column + 1)]
                    rows.append(row_vals)
            except Exception as e:
                raise Exception(f"Không thể đọc file XLSX: {str(e)}")
                
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Không thể đọc file báo cáo: {str(e)}")
    
    header_row = None
    headers = []
    
    # Scan the first 15 rows to find the headers
    for r_idx, row in enumerate(rows[:15]):
        try:
            row_str_vals = [str(val or "").strip() for val in row]
            keywords = ["mã đơn hàng", "order id", "đơn hàng", "sub_id", "sub id", "hoa hồng", "commission"]
            if any(any(kw in val.lower() for kw in keywords) for val in row_str_vals):
                header_row = r_idx
                headers = row_str_vals
                break
        except Exception:
            continue
            
    if header_row is None:
        raise HTTPException(status_code=400, detail="Không tìm thấy dòng tiêu đề hợp lệ trong file báo cáo. Vui lòng kiểm tra lại file báo cáo của Shopee.")
        
    col_map = {}
    for idx, name in enumerate(headers):
        name_lower = name.lower()
        if "mã đơn hàng" in name_lower or "order id" in name_lower or "order_id" in name_lower:
            col_map["order_id"] = idx
        elif "trạng thái" in name_lower or "status" in name_lower:
            col_map["status"] = idx
        elif "giá trị đơn" in name_lower or "order value" in name_lower or "doanh số" in name_lower or "giá trị sản phẩm" in name_lower or "product price" in name_lower or "price" in name_lower:
            col_map["product_price"] = idx
        elif "hoa hồng" in name_lower or "commission" in name_lower or "reward" in name_lower:
            col_map["reward"] = idx
        elif "sub_id" in name_lower or "sub id" in name_lower or "sub-id" in name_lower or "utm_content" in name_lower:
            col_map["sub_id"] = idx
        elif "thời gian" in name_lower or "time" in name_lower or "sales_time" in name_lower:
            col_map["sales_time"] = idx
        elif "mã lượt click" in name_lower or "click id" in name_lower or "transaction_id" in name_lower:
            col_map["transaction_id"] = idx

    required_cols = ["order_id", "status", "reward"]
    missing = [c for c in required_cols if c not in col_map]
    if missing:
        raise HTTPException(status_code=400, detail=f"File báo cáo thiếu các cột bắt buộc: {', '.join(missing)}")

    success_count = 0
    skipped_count = 0
    
    # Process from header_row + 1 onwards
    for r_idx, row_vals in enumerate(rows[header_row + 1:]):
        try:
            if not row_vals or all(val is None or str(val).strip() == "" for val in row_vals):
                continue
                
            def get_val(col_name, default=None):
                idx = col_map.get(col_name)
                if idx is not None and idx < len(row_vals):
                    return row_vals[idx]
                return default

            raw_order_id = get_val("order_id")
            if not raw_order_id:
                skipped_count += 1
                continue
                
            order_id = str(raw_order_id).strip()
            raw_status = get_val("status", "")
            status_str = str(raw_status).strip().lower()
            
            confirmed = 0
            status_code = 0
            
            if any(x in status_str for x in ["hoàn thành", "thành công", "completed", "đã hoàn thành"]):
                confirmed = 1
                status_code = 1
            elif any(x in status_str for x in ["hủy", "cancelled", "không thành công", "đã hủy"]):
                confirmed = 0
                status_code = 2
            else:
                confirmed = 0
                status_code = 0
                
            def parse_float(val):
                if val is None:
                    return 0.0
                try:
                    s = str(val).replace(",", "").replace("đ", "").replace("VND", "").strip()
                    return float(s)
                except:
                    return 0.0

            reward = parse_float(get_val("reward"))
            product_price = parse_float(get_val("product_price"))
            
            raw_sub_id = get_val("sub_id", "")
            sub_id = str(raw_sub_id).strip()
            
            email = ""
            if "hangthocashback-" in sub_id:
                sanitized_email = sub_id.split("hangthocashback-")[1]
                if "_at_" in sanitized_email:
                    parts = sanitized_email.split("_at_")
                    prefix = parts[0]
                    domain = parts[1].replace("_", ".")
                    email = f"{prefix}@{domain}"
            else:
                if "@" in sub_id:
                    email = sub_id

            raw_tx_id = get_val("transaction_id")
            if raw_tx_id:
                transaction_id = str(raw_tx_id).strip()
            else:
                transaction_id = f"shopee_{order_id}"

            sales_time = get_val("sales_time")
            if sales_time:
                if hasattr(sales_time, "strftime"):
                    sales_time_str = sales_time.strftime("%Y-%m-%dT%H:%M:%S")
                else:
                    sales_time_str = str(sales_time).strip().replace(" ", "T")
            else:
                sales_time_str = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

            db.collection("orders").document(transaction_id).set({
                "transaction_id": transaction_id,
                "order_id": order_id,
                "campaign_id": "Shopee",
                "product_id": "",
                "quantity": 1,
                "product_price": product_price,
                "reward": reward,
                "sales_time": sales_time_str,
                "status": status_code,
                "confirmed": confirmed,
                "utm_source": email,
                "utm_content": sub_id,
                "utm_medium": "shopee",
                "created_at": firestore.SERVER_TIMESTAMP
            }, merge=True)
            
            success_count += 1
        except Exception as e:
            print(f"Lỗi khi đọc dòng {r_idx}: {e}")
            skipped_count += 1
            
    return {
        "success": True,
        "message": f"Đã nhập thành công {success_count} đơn hàng Shopee. Bỏ qua {skipped_count} dòng lỗi."
    }
