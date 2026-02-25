from fastapi import APIRouter, HTTPException
from database import db_query

router = APIRouter()

# API Lấy thông tin tổng quan của người chơi (Tiền, Túi đồ, Pet)
@router.get("/api/user/{user_id}")
async def get_user_data(user_id: int):
    # 1. Đăng ký user nếu chưa có (Tự động giống /start cũ)
    await db_query("INSERT OR IGNORE INTO users (id) VALUES (?)", (user_id,), commit=True)
    
    # 2. Lấy thông tin user
    user = await db_query("SELECT * FROM users WHERE id=?", (user_id,), fetchone=True)
    
    # 3. Lấy Pet đang trang bị
    pet = await db_query("SELECT name, level, hunger FROM user_pets WHERE uid=? AND is_active=1 LIMIT 1", (user_id,), fetchone=True)
    
    # 4. Gom dữ liệu lại thành cục JSON trả về cho Web 2D
    return {
        "success": True,
        "user_info": dict(user),
        "active_pet": dict(pet) if pet else None
    }