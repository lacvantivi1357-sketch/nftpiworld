import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv()

# Lấy link từ biến môi trường (Render) hoặc dùng trực tiếp để test local
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://Admin:Quoc2007%40@cluster0.vdsdeb3.mongodb.net/?appName=Cluster0")

# Khởi tạo Client
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)

# Chọn Database
db = client.empire_game

# Khai báo các Collection (thay thế cho Table)
users_col = db.users
inventory_col = db.inventory
pets_col = db.user_pets
deposits_col = db.deposits
withdrawals_col = db.withdrawals
settings_col = db.settings
price_history_col = db.price_history
history_col = db.history # Lịch sử dòng tiền cá nhân
# Hàm khởi tạo (tạo index để tìm kiếm nhanh hơn)
async def init_db():
    await users_col.create_index("id", unique=True)
    # Tạo giá mặc định nếu chưa có
    default_settings = [
        {"key": "vnt_rate", "value": 2.0},
        {"key": "min_withdraw", "value": 100000},
        {"key": "market_fluctuation", "value": 10} # Biên độ 10%
    ]
    for s in default_settings:
        await settings_col.update_one({"key": s["key"]}, {"$setOnInsert": s}, upsert=True)
    print("✅ Đã khởi tạo hệ thống tài chính MongoDB!")