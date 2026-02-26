import os
from dotenv import load_dotenv

# Load file .env nếu chạy ở máy local (trên Render nó sẽ tự bốc từ Environment Variables)
load_dotenv()

class Settings:
    # 1. TOKEN BOT TELEGRAM
    API_TOKEN: str = os.getenv("API_TOKEN", "8393113581:AAHT87p6911GxxsIEhTVPwYuCg56aw9NMAU")
    
    # 2. DANH SÁCH ADMIN (Chuyển chuỗi thành list số nguyên)
    # Ví dụ: "6877673260,123456" -> [6877673260, 123456]
    ADMIN_IDS: list = [
        int(uid.strip()) 
        for uid in os.getenv("ADMIN_IDS", "6877673260").split(",") 
        if uid.strip().isdigit()
    ]
    
    # 3. KẾT NỐI MONGODB
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb+srv://Admin:Quoc2007%40@cluster0.vdsdeb3.mongodb.net/?appName=Cluster0")
    DB_NAME: str = "GameV86" # Sếp có thể đổi tên Database tùy ý
    
    # 4. URL WEB APP (Dùng cho Bot gửi nút bấm mở Game)
    WEB_APP_URL: str = os.getenv("WEB_APP_URL", "https://nftpiworld1.onrender.com")

settings = Settings()