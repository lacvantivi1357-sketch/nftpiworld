import motor.motor_asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# CHỈ LẤY TỪ KÉT SẮT (.env HOẶC RENDER)
MONGO_URI = os.getenv("MONGO_URI")

# 🛡 BÁO ĐỘNG ĐỎ: Nếu Render chưa nhận biến môi trường, báo lỗi và dừng máy chủ ngay để sếp biết mà sửa
if not MONGO_URI:
    print("❌ LỖI TỬ HUYỆT: Không tìm thấy MONGO_URI! Hãy kiểm tra lại file .env hoặc tab Environment trên Render.")
    sys.exit(1) 

# Khởi tạo Client
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)

# Chọn Database
db = client.empire_game

# --- KHAI BÁO CÁC COLLECTION CƠ BẢN ---
users_col = db.users
inventory_col = db.inventory
pets_col = db.user_pets
deposits_col = db.deposits
withdrawals_col = db.withdrawals
settings_col = db.settings
price_history_col = db.price_history
history_col = db.history # Lịch sử dòng tiền cá nhân

# --- 🆕 LÓT ĐƯỜNG SẴN CHO HỆ THỐNG BANG HỘI (GUILD) ---
guilds_col = db.guilds
guild_members_col = db.guild_members
guild_requests_col = db.guild_requests
custom_pets_col = db.custom_pets

# Hàm khởi tạo (tạo index để tìm kiếm nhanh hơn)
async def init_db():
    await users_col.create_index("id", unique=True)
    await inventory_col.create_index([("uid", 1), ("item_name", 1)], unique=True)
    await pets_col.create_index("id", unique=True)
    
    # Tạo giá mặc định nếu chưa có
    default_settings = [
        {"key": "vnt_rate", "value": 2.0},
        {"key": "min_withdraw", "value": 100000},
        {"key": "market_fluctuation", "value": 10}, # Biên độ chợ
        {"key": "guild_create_price", "value": 50000} # 🆕 Phí thành lập bang hội
    ]
    for s in default_settings:
        await settings_col.update_one({"key": s["key"]}, {"$setOnInsert": s}, upsert=True)
    
    print("✅ Đã khởi tạo thành công hệ thống MongoDB (Sẵn sàng cho Bang Hội)!")