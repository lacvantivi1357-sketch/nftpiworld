from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio

# Import đủ các router và DB cần thiết
from routers import user_api, game_api
from database import init_db, inventory_col, settings_col  # 🆕 Đã import thêm 2 bảng để tính giá

# Kéo bot Telegram vào đây
from bot import bot, dp 

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

async def market_maker_task():
    while True:
        try:
            # 1. Tính tổng Sắt đang lưu hành toàn server
            pipeline = [{"$group": {"_id": "$item_name", "total": {"$sum": "$quantity"}}}]
            stats = await inventory_col.aggregate(pipeline).to_list(length=100)
            
            # 2. Logic điều chỉnh giá (Ví dụ cho Sắt)
            for item in stats:
                item_code = item['_id']
                total_qty = item['total']
                
                # Giả sử giá gốc Sắt là 0.015
                base_price = 0.015 
                # Công thức đơn giản: Giá = Giá gốc * (1,000,000 / Tổng_lưu_hành)
                new_price = base_price * (1000000 / (total_qty + 1))
                
                # Cập nhật giá mới vào settings
                await settings_col.update_one(
                    {"key": f"price_{item_code}"}, 
                    {"$set": {"value": new_price}}, 
                    upsert=True
                )
            
            print("📈 Kinh tế: Đã cập nhật giá thị trường theo cung cầu.")
            await asyncio.sleep(600) # 10 phút cập nhật 1 lần
        except Exception as e:
            print(f"Lỗi Market Maker: {e}")
            await asyncio.sleep(60)

# 🆕 GỘP 2 SỰ KIỆN STARTUP VÀO LÀM 1 ĐỂ KHÔNG BỊ ĐÈ NHAU
@app.on_event("startup")
async def startup_event():
    # 1. Khởi tạo kết nối MongoDB và Index
    await init_db()
    
    # 2. Chạy Bot Telegram ngầm
    print("🤖 Bot Telegram đang khởi động song song...")
    asyncio.create_task(dp.start_polling(bot))

    # 3. Chạy hệ thống kinh tế (Market Maker) ngầm
    print("⚖️ Kích hoạt hệ thống Market Maker...")
    asyncio.create_task(market_maker_task())