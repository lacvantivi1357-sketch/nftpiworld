import aiosqlite
import logging

logger = logging.getLogger(__name__)
DB_NAME = 'bot_data.db'

async def db_query(sql, params=(), commit=False, fetchone=False, fetchall=False, retries=5):
    for i in range(retries):
        try:
            async with aiosqlite.connect(DB_NAME, timeout=30) as db:
                await db.execute("PRAGMA busy_timeout = 30000;")
                db.row_factory = aiosqlite.Row
                async with db.execute(sql, params) as cursor:
                    if commit:
                        await db.commit()
                        return None
                    if fetchone: return await cursor.fetchone()
                    if fetchall: return await cursor.fetchall()
                    return None
        except aiosqlite.OperationalError as e:
            if "locked" in str(e):
                import asyncio
                await asyncio.sleep(1)
            else:
                logger.error(f"❌ DB Error: {e}")
                raise e
    return None

async def init_db():
    async with aiosqlite.connect(DB_NAME) as db:
        await db.execute("PRAGMA journal_mode=WAL;")
        tables = [
            "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, vnd REAL DEFAULT 0, vnt REAL DEFAULT 0, gem INTEGER DEFAULT 0, pet_slots INTEGER DEFAULT 5, bag_level INTEGER DEFAULT 1)",
            "CREATE TABLE IF NOT EXISTS inventory (uid INTEGER, item_name TEXT, quantity REAL, PRIMARY KEY(uid, item_name))",
            "CREATE TABLE IF NOT EXISTS user_pets (id INTEGER PRIMARY KEY AUTOINCREMENT, uid INTEGER, name TEXT, turns_total INTEGER, turns_used INTEGER DEFAULT 0, created_at INTEGER, expiry_date INTEGER, last_reset TEXT, level INTEGER DEFAULT 1, hunger INTEGER DEFAULT 100, is_active INTEGER DEFAULT 1, exp INTEGER DEFAULT 0, buff_luck_end INTEGER DEFAULT 0)"
        ]
        for sql in tables:
            await db.execute(sql)
        await db.commit()
    print("✅ Database SQLite đã khởi tạo!")