from fastapi import APIRouter, HTTPException
from database import users_col, pets_col # Import các Collection từ database.py
from config import ADMIN_IDS
from pydantic import BaseModel
from bson import ObjectId
router = APIRouter()

# API Lấy thông tin tổng quan của người chơi (Dùng MongoDB)
@router.get("/api/user/{user_id}")
async def get_user_data(user_id: int):
    # 1. Đăng ký user nếu chưa có (Dùng upsert để tự động tạo nếu thiếu)
    # $setOnInsert giúp chỉ gán giá trị khi tạo mới, không ghi đè khi user đã tồn tại
    await users_col.update_one(
        {"id": user_id},
        {"$setOnInsert": {
            "id": user_id,
            "vnd": 0, 
            "vnt": 0, 
            "gem": 0, 
            "pet_slots": 5, 
            "bag_level": 1
        }},
        upsert=True
    )
    
    # 2. Lấy thông tin user
    user = await users_col.find_one({"id": user_id})
    
    # 3. Lấy Pet đang trang bị
    pet = await pets_col.find_one({"uid": user_id, "is_active": 1})
    
    # 4. Xử lý lỗi ObjectId của MongoDB (FastAPI không đọc được _id mặc định)
    if user:
        user.pop("_id", None) # Xóa trường _id để tránh lỗi JSON
    if pet:
        pet.pop("_id", None)
    
    # 5. Trả về dữ liệu cho Web
    return {
        "success": True,
        "user_info": user,
        "active_pet": pet if pet else None
    }
from config import ADMIN_IDS # Đảm bảo đã import ADMIN_IDS

# API dành riêng cho Admin: Lấy danh sách toàn bộ người chơi
@router.get("/api/admin/all-users")
async def admin_get_all_users(admin_id: int):
    if admin_id not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Quyền truy cập bị từ chối!")
    
    cursor = users_col.find().sort("vnt", -1) # Sắp xếp ai giàu nhất lên đầu
    users = await cursor.to_list(length=100)
    return {"success": True, "users": [clean_doc(u) for u in users]}

# API dành riêng cho Admin: Sửa dữ liệu bất kỳ ai
@router.post("/api/admin/edit-user")
async def admin_edit_user(req: dict):
    admin_id = req.get("admin_id")
    if admin_id not in ADMIN_IDS:
        return {"success": False, "message": "Hack à? Không có quyền nhé!"}
    
    target_id = req.get("target_id")
    update_data = req.get("data") # Ví dụ: {"vnt": 1000, "vnd": 500}
    
    await users_col.update_one({"id": target_id}, {"$set": update_data})
    return {"success": True, "message": f"✅ Đã cập nhật dữ liệu cho User {target_id}"}
from datetime import datetime

# --- API NẠP TIỀN (Gửi TxHash) ---
class DepositReq(BaseModel):
    user_id: int
    amount: float
    tx_hash: str
    currency: str # USDT, BNB...

@router.post("/api/finance/deposit")
async def request_deposit(req: DepositReq):
    new_dep = {
        "uid": req.user_id,
        "amount": req.amount,
        "tx_hash": req.tx_hash,
        "currency": req.currency,
        "status": "pending",
        "created_at": datetime.now()
    }
    await deposits_col.insert_one(new_dep)
    return {"success": True, "message": "⏳ Đã gửi đơn nạp! Vui lòng đợi Admin duyệt."}

# --- API RÚT TIỀN (2 Chế độ) ---
class WithdrawReq(BaseModel):
    user_id: int
    amount_vnt: float
    mode: str # "normal" hoặc "fast"
    info: str # STK Ngân hàng hoặc Ví Crypto

@router.post("/api/finance/withdraw")
async def request_withdraw(req: WithdrawReq):
    # 1. Check số dư
    user = await users_col.find_one({"id": req.user_id})
    if user['vnt'] < req.amount_vnt:
        return {"success": False, "message": "❌ Số dư VNT không đủ!"}
    
    # 2. Tính thực nhận dựa trên Mode (Lightning vs Turtle)
    fee = 0.3 if req.mode == "fast" else 0.0
    receive_amount = req.amount_vnt * (1 - fee)
    
    # 3. Trừ tiền và lưu đơn
    await users_col.update_one({"id": req.user_id}, {"$inc": {"vnt": -req.amount_vnt}})
    
    new_wd = {
        "uid": req.user_id,
        "amount_vnt": req.amount_vnt,
        "receive": receive_amount,
        "mode": req.mode,
        "info": req.info,
        "status": "pending",
        "created_at": datetime.now()
    }
    await withdrawals_col.insert_one(new_wd)
    return {"success": True, "message": f"✅ Đã gửi lệnh rút {req.mode}! Thực nhận: {receive_amount:,.0f}"}
# ==========================================
# API ADMIN: QUẢN LÝ RÚT TIỀN
# ==========================================

# 1. Lấy danh sách đơn chờ duyệt
@router.get("/api/admin/withdrawals")
async def admin_get_withdrawals(admin_id: int):
    if admin_id not in ADMIN_IDS:
        return {"success": False, "message": "Không có quyền truy cập!"}
    
    # Lấy data từ collection withdrawals (nhớ import withdrawals_col từ database.py nếu cần, hoặc dùng trực tiếp)
    from database import withdrawals_col
    cursor = withdrawals_col.find({"status": "pending"})
    wds = await cursor.to_list(length=100)
    
    # Xử lý ID của MongoDB để Web đọc được
    for w in wds:
        w['id'] = str(w['_id'])
        w.pop('_id')
        
    return {"success": True, "withdrawals": wds}

# 2. Xử lý Duyệt hoặc Từ chối
class AdminActionReq(BaseModel):
    admin_id: int
    wd_id: str
    action: str

@router.post("/api/admin/withdrawals/action")
async def admin_action_withdrawal(req: AdminActionReq):
    if req.admin_id not in ADMIN_IDS:
        return {"success": False, "message": "Không có quyền!"}
        
    from database import withdrawals_col, users_col
    wd = await withdrawals_col.find_one({"_id": ObjectId(req.wd_id)})
    
    if not wd or wd.get('status') != "pending":
        return {"success": False, "message": "❌ Đơn không tồn tại hoặc đã bị xử lý!"}
        
    if req.action == "approve":
        await withdrawals_col.update_one({"_id": ObjectId(req.wd_id)}, {"$set": {"status": "approved"}})
        return {"success": True, "message": "✅ Đã đánh dấu CHUYỂN KHOẢN THÀNH CÔNG!"}
        
    elif req.action == "reject":
        # Hoàn trả lại tiền VNT vào túi cho người chơi
        await users_col.update_one({"id": wd['uid']}, {"$inc": {"vnt": wd['amount_vnt']}})
        await withdrawals_col.update_one({"_id": ObjectId(req.wd_id)}, {"$set": {"status": "rejected"}})
        return {"success": True, "message": "❌ Đã TỪ CHỐI đơn và hoàn tiền lại cho người chơi!"}