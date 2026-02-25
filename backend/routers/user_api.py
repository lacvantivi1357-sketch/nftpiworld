from fastapi import APIRouter, HTTPException
from database import users_col, pets_col # Import các Collection từ database.py

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