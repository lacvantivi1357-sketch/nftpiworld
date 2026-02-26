import asyncio
import logging
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.enums import ParseMode
from config import API_TOKEN, WEB_APP_URL, ADMIN_IDS
from database import users_col

# --- 1. KHỞI TẠO LOGGING (Theo dõi lỗi trên Render) ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bot = Bot(token=API_TOKEN)
dp = Dispatcher()

# ==========================================
# LỆNH /START - CÁNH CỔNG VÀO GAME
# ==========================================
@dp.message(Command("start"))
async def start(message: types.Message):
    # Nút Web App thần thánh
    markup = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎮 CHƠI GAME V86 (BẢN 2D)", web_app=WebAppInfo(url=WEB_APP_URL))]
    ])
    
    msg = (
        f"🔥 <b>EMPIRE V86: ULTIMATE EDITION</b> 🔥\n\n"
        f"Chào mừng {message.from_user.full_name}!\n"
        f"Vương quốc 2D đang chờ bạn khám phá. Hãy nhấn nút bên dưới để mở giao diện."
    )
    
    # [NÂNG CẤP] Tự động tạo hồ sơ trống ngay khi bấm /start để Web không bị lỗi
    await users_col.update_one(
        {"id": message.from_user.id},
        {"$setOnInsert": {
            "id": message.from_user.id, "vnd": 0, "vnt": 0, "gem": 0, "pet_slots": 5, "bag_level": 1
        }},
        upsert=True
    )
    
    await message.answer(msg, parse_mode=ParseMode.HTML, reply_markup=markup)

# ==========================================
# LỆNH /BOMTIEN - HACK TIỀN CHO ADMIN
# ==========================================
@dp.message(Command("bomtien"))
async def admin_add_money(message: types.Message):
    user_id = message.from_user.id
    
    if user_id not in ADMIN_IDS:
        await message.answer("❌ Cảnh báo: Bạn không có quyền sử dụng lệnh này!")
        return
        
    # Bơm thêm Gem để sếp test nâng cấp túi đồ
    await users_col.update_one(
        {"id": user_id},
        {"$inc": {"vnd": 1000000, "vnt": 50000, "gem": 100}},
        upsert=True
    )
    
    await message.answer(
        "✅ [HỆ THỐNG] Chào sếp!\n"
        "Đã bơm thành công:\n"
        "💰 <b>1.000.000 VND</b>\n"
        "⚔️ <b>50.000 VNT</b>\n"
        "💎 <b>100 GEM</b>\n"
        "vào Cloud Database 🚀",
        parse_mode=ParseMode.HTML
    )

# ==========================================
# [MỚI] LỆNH /THONGKE - SOI DÒNG TIỀN SERVER
# ==========================================
@dp.message(Command("thongke"))
async def admin_stats(message: types.Message):
    if message.from_user.id not in ADMIN_IDS:
        return
        
    total_users = await users_col.count_documents({})
    
    # Tính tổng tiền toàn server
    pipeline = [{"$group": {"_id": None, "total_vnt": {"$sum": "$vnt"}, "total_vnd": {"$sum": "$vnd"}}}]
    stats = await users_col.aggregate(pipeline).to_list(length=1)
    
    tvnt = stats[0]['total_vnt'] if stats else 0
    tvnd = stats[0]['total_vnd'] if stats else 0
    
    msg = (
        f"📊 <b>BÁO CÁO KINH TẾ SERVER:</b>\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"👥 Tổng người chơi: <b>{total_users}</b>\n"
        f"💰 Lưu hành VND: <b>{tvnd:,.0f} đ</b>\n"
        f"⚔️ Lưu hành VNT: <b>{tvnt:,.0f} đ</b>"
    )
    await message.answer(msg, parse_mode=ParseMode.HTML)

# ==========================================
# KHỞI CHẠY BOT
# ==========================================
async def main():
    logger.info("🤖 Bot Telegram đã chạy! Cổng kết nối Web App đang mở...")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == '__main__':
    print("Bot đang chạy trên máy tính local...")
    asyncio.run(main())