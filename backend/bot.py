import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from config import API_TOKEN, WEB_APP_URL

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

async def main():
    print("🤖 Bot Telegram đã chạy! Hãy vào Telegram gõ /start")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == '__main__':
    import asyncio
    print("Bot đang chạy trên máy tính local...")
    asyncio.run(dp.start_polling(bot))