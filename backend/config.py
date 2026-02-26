import os
from dotenv import load_dotenv

# Load các biến môi trường từ file .env (nếu có)
load_dotenv()

# CHỈ GỌI TÊN BIẾN, KHÔNG ĐỂ LẠI BẤT KỲ DỮ LIỆU THẬT NÀO Ở ĐÂY
API_TOKEN = os.getenv("API_TOKEN")
WEB_APP_URL = os.getenv("WEB_APP_URL")
MONGO_URI = os.getenv("MONGO_URI")

# Xử lý riêng cho ADMIN_IDS (Chuyển chuỗi "123,456" thành mảng [123, 456])
admin_ids_str = os.getenv("ADMIN_IDS", "") 
ADMIN_IDS = [int(uid.strip()) for uid in admin_ids_str.split(",") if uid.strip().isdigit()]