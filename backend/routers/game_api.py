import asyncio
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
import random
import time
from bson import ObjectId
from database import users_col, inventory_col, pets_col, db 

# Khởi tạo collection market (chợ P2P)
market_col = db["market"]

from game_config import (
    PET_PRICE_VND, PET_NAMES_LIST, PET_WEIGHTS, MIN_HUNGER_TO_HUNT, 
    HUNGER_COST, FEED_PRICE_VNT, PET_CONFIG, DROP_QTY_RANGE, ITEM_NAME_MAP, 
    CRAFT_RECIPES, ITEM_PRICES
)

router = APIRouter()

# Hàm bổ trợ để xóa sạch _id trước khi trả về cho Frontend
def clean_doc(doc):
    if doc:
        if "_id" in doc:
            doc["id"] = str(doc["_id"])
            doc.pop("_id")
    return doc

# ============================================================
# 1. ĐỘNG CƠ KINH TẾ NGẦM (MARKET MAKER - CHẠY 24/7)
# ============================================================
async def init_system_settings():
    """Khởi tạo các chỉ số kinh tế mặc định nếu chưa có"""
    settings = await users_col.find_one({"id": "system_settings"})
    if not settings:
        default_settings = {
            "id": "system_settings",
            "vnt_rate": 2.0, # 1 VND = 2 VNT
            "market_fee": 0.05, # Phí sàn 5%
            # Tổng cung tối đa (Max Supply)
            "supply_Sat": 10000000, "supply_Dong": 177000, "supply_Bac": 32000,
            "supply_Vang": 4200, "supply_KimCuong": 600, "supply_DaQuy": 400,
            # Giá hiện tại (Current Price) - Khởi tạo bằng giá gốc
            "price_Sat": ITEM_PRICES["Sat"], "price_Dong": ITEM_PRICES["Dong"],
            "price_Bac": ITEM_PRICES["Bac"], "price_Vang": ITEM_PRICES["Vang"],
            "price_KimCuong": ITEM_PRICES["KimCuong"], "price_DaQuy": ITEM_PRICES["DaQuy"]
        }
        await users_col.insert_one(default_settings)

async def get_circulating_supply():
    """Hàm quét toàn server tính lượng hàng đang lưu thông (Túi + Chợ)"""
    circulating = {k: 0 for k in ITEM_PRICES.keys() if k != "Rac"}
    
    # 1. Quét trong túi đồ người chơi
    inv_agg = await inventory_col.aggregate([
        {"$group": {"_id": "$item_name", "total": {"$sum": "$quantity"}}}
    ]).to_list(None)
    for i in inv_agg:
        if i["_id"] in circulating: circulating[i["_id"]] += i["total"]

    # 2. Quét trên chợ P2P
    mkt_agg = await market_col.aggregate([
        {"$match": {"status": "selling"}},
        {"$group": {"_id": "$item_name", "total": {"$sum": "$quantity"}}}
    ]).to_list(None)
    for m in mkt_agg:
        if m["_id"] in circulating: circulating[m["_id"]] += m["total"]
        
    return circulating

async def market_maker_worker():
    """Worker chạy ngầm tính toán lại giá cả cứ mỗi 10 phút"""
    while True:
        try:
            await init_system_settings()
            settings = await users_col.find_one({"id": "system_settings"})
            circulating = await get_circulating_supply()
            
            updates = {}
            for code, base_p in ITEM_PRICES.items():
                if code == "Rac": continue
                
                max_s = settings.get(f"supply_{code}", 0)
                curr_s = circulating.get(code, 0)
                
                # Thuật toán tính giá: Giá gốc * (Tổng cung / (Lưu hành * Hệ số 1.2))
                if curr_s > 0 and max_s > 0:
                    free_p = base_p * (max_s / (curr_s * 1.2))
                else:
                    free_p = base_p * 10.0 # Hiếm quá thì giá x10
                
                # Đáy giá: Không bao giờ rớt quá 50% giá gốc để giữ kinh tế
                final_p = max(free_p, base_p * 0.5)
                updates[f"price_{code}"] = round(final_p, 4)
            
            # Cập nhật giá mới vào DB
            await users_col.update_one({"id": "system_settings"}, {"$set": updates})
            
            # Đợi 10 phút (600 giây) rồi tính lại
            await asyncio.sleep(600)
        except Exception as e:
            print(f"Lỗi Market Maker: {e}")
            await asyncio.sleep(60)

# Kích hoạt Worker khi FastAPI khởi động
@router.on_event("startup")
async def startup_event():
    asyncio.create_task(market_maker_worker())

# ============================================================
# 2. API KINH TẾ & CHỢ (TOKENOMICS, P2P, BÁN HỆ THỐNG)
# ============================================================

@router.get("/api/market/tokenomics")
async def get_tokenomics():
    settings = await users_col.find_one({"id": "system_settings"})
    if not settings: 
        await init_system_settings()
        settings = await users_col.find_one({"id": "system_settings"})
    
    circulating = await get_circulating_supply()
    
    stats = {}
    for code in ITEM_PRICES.keys():
        if code == "Rac": continue
        stats[code] = {
            "circ": circulating.get(code, 0),
            "max": settings.get(f"supply_{code}", 0),
            "price": settings.get(f"price_{code}", ITEM_PRICES[code])
        }
        
    return {"success": True, "vnt_rate": settings.get("vnt_rate", 2.0), "stats": stats}


@router.get("/api/market/p2p")
async def get_p2p_market():
    # Chỉ lấy 20 đơn mới nhất đang bán
    cursor = market_col.find({"status": "selling"}).sort("_id", -1).limit(20)
    listings = await cursor.to_list(length=20)
    return {"success": True, "listings": [clean_doc(l) for l in listings]}


@router.post("/api/market/p2p/sell")
async def sell_p2p_item(req: dict):
    uid = req.get('user_id')
    item = req.get('item_name')
    qty = float(req.get('amount', 0))
    price = float(req.get('price', 0))
    
    if qty <= 0 or price <= 0: 
        return {"success": False, "message": "❌ Số lượng/Giá không hợp lệ!"}
    
    # Kiểm tra kho
    inv = await inventory_col.find_one({"uid": uid, "item_name": item})
    if not inv or inv.get('quantity', 0) < qty:
        return {"success": False, "message": "❌ Không đủ hàng trong kho!"}
        
    # Trừ đồ và đăng lên chợ
    await inventory_col.update_one({"uid": uid, "item_name": item}, {"$inc": {"quantity": -qty}})
    
    new_order = {
        "seller_id": uid, "item_name": item, "quantity": qty, 
        "price": price, "status": "selling", 
        "created_at": int(time.time())
    }
    await market_col.insert_one(new_order)
    return {"success": True, "message": f"✅ Đã treo {qty} {ITEM_NAME_MAP.get(item, item)} lên chợ giá {price:,} VNT!"}


@router.post("/api/market/p2p/buy")
async def buy_p2p_item(req: dict):
    buyer_id = req.get('user_id')
    order_id = req.get('order_id')
    
    order = await market_col.find_one({"_id": ObjectId(order_id)})
    if not order or order.get('status') != 'selling':
        return {"success": False, "message": "❌ Đơn hàng không tồn tại hoặc đã bị mua!"}
        
    if buyer_id == order['seller_id']:
        return {"success": False, "message": "❌ Bạn không thể tự mua đồ của mình!"}
        
    # Check tiền người mua
    buyer = await users_col.find_one({"id": buyer_id})
    price = order['price']
    if not buyer or buyer.get('vnt', 0) < price:
        return {"success": False, "message": "❌ Không đủ VNT để mua!"}
        
    # Xử lý giao dịch (Trừ phí sàn 5%)
    settings = await users_col.find_one({"id": "system_settings"})
    fee_rate = settings.get('market_fee', 0.05) if settings else 0.05
    receive_vnt = price * (1 - fee_rate)
    
    seller_id = order['seller_id']
    item_name = order['item_name']
    qty = order['quantity']
    
    # 1. Trừ VNT người mua, Cộng VNT người bán
    await users_col.update_one({"id": buyer_id}, {"$inc": {"vnt": -price}})
    await users_col.update_one({"id": seller_id}, {"$inc": {"vnt": receive_vnt}})
    
    # 2. Cộng đồ cho người mua
    await inventory_col.update_one({"uid": buyer_id, "item_name": item_name}, {"$inc": {"quantity": qty}}, upsert=True)
    
    # 3. Đóng đơn hàng
    await market_col.update_one({"_id": ObjectId(order_id)}, {"$set": {"status": "sold", "buyer_id": buyer_id}})
    
    return {"success": True, "message": "✅ Giao dịch mua P2P thành công!"}


@router.post("/api/market/sell")
async def sell_item_to_system(req: dict):
    uid = req.get('user_id')
    item = req.get('item_name')
    qty = float(req.get('amount', 1))
    
    inv = await inventory_col.find_one({"uid": uid, "item_name": item})
    if not inv or inv.get('quantity', 0) < qty:
        return {"success": False, "message": "❌ Không đủ đồ trong kho!"}
        
    # LẤY GIÁ ĐỘNG TỪ HỆ THỐNG THAY VÌ GIÁ CỐ ĐỊNH
    settings = await users_col.find_one({"id": "system_settings"})
    if item == "Rac":
        price_per_item = ITEM_PRICES.get("Rac", 1) # Rác giá luôn cố định
    else:
        price_per_item = settings.get(f"price_{item}", ITEM_PRICES.get(item, 1)) if settings else ITEM_PRICES.get(item, 1)
        
    total_vnt = price_per_item * qty
    
    # Trừ đồ và cộng VNT
    await inventory_col.update_one({"uid": uid, "item_name": item}, {"$inc": {"quantity": -qty}})
    await users_col.update_one({"id": uid}, {"$inc": {"vnt": total_vnt}})
    
    item_name_vn = ITEM_NAME_MAP.get(item, item)
    return {"success": True, "message": f"⚖️ Bán cho Hệ thống: {qty} {item_name_vn}\nThu về: +{total_vnt:,.2f} VNT"}


# ============================================================
# 3. API ĐI SĂN (HUNT)
# ============================================================
class HuntRequest(BaseModel):
    user_id: int
    cave_choice: int

@router.post("/api/hunt")
async def process_hunt(req: HuntRequest):
    uid = req.user_id
    choice = req.cave_choice
    
    # Kiểm tra Pet đang trang bị
    pet = await pets_col.find_one({"uid": uid, "is_active": 1})
    if not pet:
        return {"success": False, "message": "❌ Bạn chưa có Pet hoặc chưa trang bị!"}
        
    if pet.get('turns_used', 0) >= pet.get('turns_total', 0):
        return {"success": False, "message": "💤 Pet đã hết lượt săn hôm nay!"}
        
    if pet.get('hunger', 0) < MIN_HUNGER_TO_HUNT:
        return {"success": False, "message": f"🚫 Pet quá đói ({pet['hunger']}/100)! Cần cho ăn."}

    # Trừ lượt săn và độ đói
    await pets_col.update_one(
        {"_id": pet["_id"]},
        {"$inc": {"turns_used": 1, "exp": 1, "hunger": -HUNGER_COST}}
    )

    win_num = random.randint(1, 4)
    
    if choice == win_num:
        user = await users_col.find_one({"id": uid}, {"bag_level": 1})
        bag_level = user.get('bag_level', 1) if user else 1
        
        luck = PET_CONFIG.get(pet['name'], {"luck": 0})['luck']
        
        # Roll tỉ lệ rớt đồ
        roll = random.uniform(0, 100)
        item_code = "Sat"
        if roll < (0.1 + luck/200): item_code = "DaQuy"
        elif roll < (1.0 + luck/100): item_code = "KimCuong"
        elif roll < (5.0 + luck/50): item_code = "Vang"
        elif roll < (20.0 + luck/20): item_code = "Bac"
        elif roll < 50.0: item_code = "Dong"
        
        # Tính số lượng dựa vào bag_level
        min_q, max_q = DROP_QTY_RANGE[item_code]
        base_qty = random.uniform(min_q, max_q) if isinstance(min_q, float) else random.randint(min_q, max_q)
        final_qty = round(base_qty * (1 + (bag_level * 0.01)), 2)
        if final_qty.is_integer(): final_qty = int(final_qty)
        
        # Cộng vào kho
        await inventory_col.update_one(
            {"uid": uid, "item_name": item_code},
            {"$inc": {"quantity": final_qty}},
            upsert=True
        )
        
        item_name_vn = ITEM_NAME_MAP.get(item_code, item_code)
        return {"success": True, "message": f"🎉 TRÚNG LỚN (Hang {win_num})!\nNhận được: +{final_qty} {item_name_vn}", "item": item_code, "qty": final_qty}
        
    else:
        qty_rac = random.randint(50000, 160000)
        await inventory_col.update_one(
            {"uid": uid, "item_name": "Rac"},
            {"$inc": {"quantity": qty_rac}},
            upsert=True
        )
        return {"success": True, "message": f"🌑 TRƯỢT RỒI! Nhặt được {qty_rac:,} Rác.", "item": "Rac", "qty": qty_rac}


# ============================================================
# 4. API QUẢN LÝ PET (GET, BUY, EQUIP, FEED)
# ============================================================
@router.get("/api/pets/{user_id}")
async def get_user_pets(user_id: int):
    cursor = pets_col.find({"uid": user_id}).sort("is_active", -1)
    pets = await cursor.to_list(length=100)
    return {"success": True, "pets": [clean_doc(p) for p in pets]}

class BuyPetReq(BaseModel):
    user_id: int

@router.post("/api/pets/buy")
async def buy_pet(req: BuyPetReq):
    uid = req.user_id
    user = await users_col.find_one({"id": uid})
    pet_count = await pets_col.count_documents({"uid": uid})
    
    if not user or user.get('vnd', 0) < PET_PRICE_VND:
        return {"success": False, "message": f"❌ Thiếu tiền! Cần {PET_PRICE_VND:,} VND."}
    if pet_count >= user.get('pet_slots', 5):
        return {"success": False, "message": "🚫 Chuồng đầy! Hãy mở rộng thêm ô."}
        
    await users_col.update_one({"id": uid}, {"$inc": {"vnd": -PET_PRICE_VND}})
    
    pet_won = random.choices(PET_NAMES_LIST, weights=PET_WEIGHTS, k=1)[0]
    cfg = PET_CONFIG[pet_won]
    
    new_pet = {
        "uid": uid, "name": pet_won, "turns_total": cfg['turns'], 
        "turns_used": 0, "level": 1, "hunger": 100, "is_active": 0, "exp": 0,
        "created_at": int(time.time()), "expiry_date": int(time.time()) + (30 * 86400)
    }
    await pets_col.insert_one(new_pet)
    return {"success": True, "message": f"🎉 MỞ HỘP THÀNH CÔNG!\nBạn nhận được: {pet_won.upper()}", "pet": pet_won}

@router.post("/api/pets/equip")
async def equip_pet(req: dict):
    uid = req.get("user_id")
    pet_id = req.get("pet_id")
    # Tắt active pet cũ, bật active pet mới
    await pets_col.update_many({"uid": uid}, {"$set": {"is_active": 0}})
    await pets_col.update_one({"_id": ObjectId(pet_id), "uid": uid}, {"$set": {"is_active": 1}})
    return {"success": True, "message": "✅ Đã trang bị Pet!"}

class FeedPetReq(BaseModel):
    user_id: int

@router.post("/api/pets/feed")
async def feed_pet(req: FeedPetReq):
    uid = req.user_id
    price = FEED_PRICE_VNT 
    
    user = await users_col.find_one({"id": uid})
    if not user or user.get('vnt', 0) < price:
        return {"success": False, "message": f"❌ Thiếu VNT! Cần {price} VNT để mua thức ăn."}
    
    res = await pets_col.update_one({"uid": uid, "is_active": 1}, {"$set": {"hunger": 100}})
    if res.modified_count > 0:
        await users_col.update_one({"id": uid}, {"$inc": {"vnt": -price}})
        return {"success": True, "message": "✅ Pet đã no nê! (+100% Độ no)"}
    return {"success": False, "message": "❌ Không tìm thấy Pet đang trang bị!"}

# ============================================================
# 5. API KHO ĐỒ & LÒ RÈN
# ============================================================
@router.get("/api/inventory/{user_id}")
async def get_inventory(user_id: int):
    cursor = inventory_col.find({"uid": user_id, "quantity": {"$gt": 0}})
    items = await cursor.to_list(length=100)
    return {"success": True, "items": [clean_doc(i) for i in items]}

@router.post("/api/craft")
async def craft_item(req: dict):
    uid = req.get('user_id')
    target = req.get('target_item')
    qty = int(req.get('amount', 1))
    
    recipe = CRAFT_RECIPES.get(target)
    if not recipe:
        return {"success": False, "message": "❌ Công thức rèn không hợp lệ!"}
        
    total_req = recipe['amt'] * qty
    mat = await inventory_col.find_one({"uid": uid, "item_name": recipe['req']})
    
    if not mat or mat.get('quantity', 0) < total_req:
        return {"success": False, "message": f"❌ Thiếu nguyên liệu! Cần {total_req} {ITEM_NAME_MAP.get(recipe['req'], recipe['req'])}."}
        
    # Trừ nguyên liệu và cộng đồ rèn được
    await inventory_col.update_one({"uid": uid, "item_name": recipe['req']}, {"$inc": {"quantity": -total_req}})
    await inventory_col.update_one({"uid": uid, "item_name": target}, {"$inc": {"quantity": qty}}, upsert=True)
    return {"success": True, "message": f"🔥 Rèn thành công {qty} {ITEM_NAME_MAP.get(target, target)}!"}