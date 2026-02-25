import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from config import API_TOKEN, WEB_APP_URL, ADMIN_IDS
from database import db_query
bot = Bot(token=API_TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def start(message: types.Message):
    # Nút Web App thần thánh
    markup = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎮 MỞ GAME 2D V86", web_app=WebAppInfo(url=WEB_APP_URL))]
    ])
    
    msg = (
        f"🔥 <b>EMPIRE V86: ULTIMATE EDITION</b> 🔥\n\n"
        f"Chào mừng {message.from_user.full_name}!\n"
        f"Hãy nhấn nút bên dưới để mở giao diện đồ họa siêu mượt."
    )
    await message.answer(msg, parse_mode="HTML", reply_markup=markup)
@dp.message(Command("bomtien"))
async def admin_add_money(message: types.Message):
    user_id = message.from_user.id
    
    # 1. Máy quét nhận diện sếp
    if user_id not in ADMIN_IDS:
        await message.answer("❌ Cảnh báo: Bạn không có quyền sử dụng lệnh này!")
        return
        
    # 2. Nếu đúng là sếp -> Bơm tiền thẳng vào Database
    await db_query("UPDATE users SET vnd = vnd + 1000000, vnt = vnt + 50000 WHERE id=?", (user_id,), commit=True)
    
    # 3. Báo cáo lại cho sếp
    await message.answer("✅ [HỆ THỐNG] Chào sếp!\nĐã bơm thành công 1.000.000 VND và 50.000 VNT vào tài khoản của sếp để test game.")
async def main():
    print("🤖 Bot Telegram đã chạy! Hãy vào Telegram gõ /start")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == '__main__':
    import asyncio
    print("Bot đang chạy trên máy tính local...")
    asyncio.run(dp.start_polling(bot))