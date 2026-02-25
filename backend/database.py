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

# Hàm khởi tạo (tạo index để tìm kiếm nhanh hơn)
async def init_db():
    await users_col.create_index("id", unique=True)
    await inventory_col.create_index([("uid", 1), ("item_name", 1)], unique=True)
    await pets_col.create_index("id", unique=True)
    print("✅ Đã kết nối MongoDB và khởi tạo Index!")