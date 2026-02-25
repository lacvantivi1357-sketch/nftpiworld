from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import user_api
from routers import user_api, game_api
from database import init_db
import uvicorn

app = FastAPI(title="Empire V86 API")

# CỰC KỲ QUAN TRỌNG: Mở CORS để Web App HTML/JS có quyền gọi API này
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Ai cũng gọi được (Khi release thật sẽ đổi thành tên miền của bạn)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Nhúng các API từ thư mục routers vào máy chủ
app.include_router(user_api.router)
app.include_router(game_api.router)
# Chạy lệnh này khi bật máy chủ
@app.on_event("startup")
async def startup_event():
    print("⏳ Đang khởi tạo Database...")
    await init_db()
    print("🚀 API Server đã sẵn sàng!")

# Lệnh dành cho việc chạy file trực tiếp
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)