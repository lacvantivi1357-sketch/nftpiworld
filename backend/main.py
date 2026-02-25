from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import user_api, game_api
from database import init_db # QUAN TRỌNG: Phải import init_db

app = FastAPI(title="Empire V86 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_api.router)
app.include_router(game_api.router)

@app.on_event("startup")
async def startup_event():
    await init_db() # Chạy tạo bảng database
    print("🚀 API Server đã sẵn sàng!")