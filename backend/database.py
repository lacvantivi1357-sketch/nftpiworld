import motor.motor_asyncio
import os

# Lấy link MongoDB từ biến môi trường (Bảo mật)
MONGO_URI = os.getenv("MONGO_URI", "Dán_link_mongodb_của_bạn_vào_đây_để_test_local")

# Kết nối tới MongoDB Cluster
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)

# Tạo (hoặc chọn) Database tên là 'empire_game'
db = client.empire_game

# Định nghĩa các Collection (Giống như Table trong SQLite)
users_col = db.users
inventory_col = db.inventory
pets_col = db.user_pets