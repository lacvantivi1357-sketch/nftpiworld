from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId
from config import ADMIN_IDS
# NHỚ IMPORT ĐỦ CÁC BẢNG NÀY
from database import users_col, pets_col, deposits_col, withdrawals_col 

router = APIRouter()

def clean_doc(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        doc.pop("_id")
    return doc

# ==========================================
# 1. API LẤY THÔNG TIN USER
# ==========================================
@router.get("/api/user/{user_id}")
async def get_user_data(user_id: int):
    await users_col.update_one(
        {"id": user_id},
        {"$setOnInsert": {
            "id": user_id, "vnd": 0, "vnt": 0, "gem": 0, "pet_slots": 5, "bag_level": 1
        }},
        upsert=True
    )
    
    user = await users_col.find_one({"id": user_id})
    pet = await pets_col.find_one({"uid": user_id, "is_active": 1})
    
    return {
        "success": True,
        "user_info": clean_doc(user),
        "active_pet": clean_doc(pet) if pet else None
    }

# ==========================================
# 2. API NẠP TIỀN
# ==========================================
class DepositReq(BaseModel):
    user_id: int
    amount: float
    tx_hash: str
    currency: str

@router.post("/api/finance/deposit")
async def request_deposit(req: DepositReq):
    new_dep = {
        "uid": req.user_id,
        "amount": req.amount,
        "tx_hash": req.tx_hash,
        "currency": req.currency,
        "status": "pending",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    await deposits_col.insert_one(new_dep)
    return {"success": True, "message": "⏳ Đã gửi đơn nạp tiền! Vui lòng đợi Admin duyệt."}

# ==========================================
# 3. API RÚT TIỀN
# ==========================================
class WithdrawReq(BaseModel):
    user_id: int
    amount_vnt: float
    mode: str
    info: str

@router.post("/api/finance/withdraw")
async def request_withdraw(req: WithdrawReq):
    user = await users_col.find_one({"id": req.user_id})
    if not user or user.get('vnt', 0) < req.amount_vnt:
        return {"success": False, "message": "❌ Số dư VNT không đủ!"}
    
    fee = 0.3 if req.mode == "fast" else 0.0
    receive_amount = req.amount_vnt * (1 - fee)
    
    # Trừ tiền VNT
    await users_col.update_one({"id": req.user_id}, {"$inc": {"vnt": -req.amount_vnt}})
    
    new_wd = {
        "uid": req.user_id,
        "amount_vnt": req.amount_vnt,
        "receive": receive_amount,
        "mode": req.mode,
        "info": req.info,
        "status": "pending",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    await withdrawals_col.insert_one(new_wd)
    mode_txt = "RÚT NHANH" if req.mode == "fast" else "RÚT THƯỜNG"
    return {"success": True, "message": f"✅ Gửi lệnh {mode_txt} thành công!\nSẽ nhận được: {receive_amount:,.0f} VND"}

# ==========================================
# 4. API DÀNH CHO ADMIN
# ==========================================
@router.get("/api/admin/all-users")
async def admin_get_all_users(admin_id: int):
    if admin_id not in ADMIN_IDS:
        return {"success": False}
    cursor = users_col.find().sort("vnt", -1)
    users = await cursor.to_list(length=100)
    return {"success": True, "users": [clean_doc(u) for u in users]}

@router.get("/api/admin/withdrawals")
async def admin_get_withdrawals(admin_id: int):
    if admin_id not in ADMIN_IDS:
        return {"success": False}
    cursor = withdrawals_col.find({"status": "pending"})
    wds = await cursor.to_list(length=100)
    return {"success": True, "withdrawals": [clean_doc(w) for w in wds]}

class AdminActionReq(BaseModel):
    admin_id: int
    wd_id: str
    action: str

@router.post("/api/admin/withdrawals/action")
async def admin_action_withdrawal(req: AdminActionReq):
    if req.admin_id not in ADMIN_IDS:
        return {"success": False, "message": "Không có quyền!"}
        
    wd = await withdrawals_col.find_one({"_id": ObjectId(req.wd_id)})
    if not wd or wd.get('status') != "pending":
        return {"success": False, "message": "❌ Đơn không tồn tại!"}
        
    if req.action == "approve":
        await withdrawals_col.update_one({"_id": ObjectId(req.wd_id)}, {"$set": {"status": "approved"}})
        return {"success": True, "message": "✅ Đã DUYỆT thành công!"}
    elif req.action == "reject":
        # Hoàn tiền lại cho khách
        await users_col.update_one({"id": wd['uid']}, {"$inc": {"vnt": wd['amount_vnt']}})
        await withdrawals_col.update_one({"_id": ObjectId(req.wd_id)}, {"$set": {"status": "rejected"}})
        return {"success": True, "message": "❌ Đã TỪ CHỐI và hoàn tiền VNT!"}