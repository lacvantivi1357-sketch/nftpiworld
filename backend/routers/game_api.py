from fastapi import APIRouter
from pydantic import BaseModel
import random
import time
from bson import ObjectId
from database import users_col, inventory_col, pets_col
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

# ==========================================
# 1. API ĐI SĂN (HUNT)
# ==========================================
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

# ==========================================
# 2. API QUẢN LÝ PET (GET, BUY, EQUIP, FEED)
# ==========================================
@router.get("/api/pets/{user_id}")
async def get_user_pets(user_id: int):
    cursor = pets_col.find({"uid": user_id}).sort("is_active", -1)
    pets = await cursor.to_list(length=100)
    return {"success": True, "pets": [clean_doc(p) for p in pets]}

# Tách riêng class này để sửa lỗi 422 lúc nãy
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
    price = FEED_PRICE_VNT # Đã lấy chuẩn từ game_config
    
    user = await users_col.find_one({"id": uid})
    if not user or user.get('vnt', 0) < price:
        return {"success": False, "message": f"❌ Thiếu VNT! Cần {price} VNT để mua thức ăn."}
    
    res = await pets_col.update_one({"uid": uid, "is_active": 1}, {"$set": {"hunger": 100}})
    if res.modified_count > 0:
        await users_col.update_one({"id": uid}, {"$inc": {"vnt": -price}})
        return {"success": True, "message": "✅ Pet đã no nê! (+100% Độ no)"}
    return {"success": False, "message": "❌ Không tìm thấy Pet đang trang bị!"}

# ==========================================
# 3. API KHO ĐỒ, LÒ RÈN & CHỢ ĐEN
# ==========================================
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

@router.post("/api/market/sell")
async def sell_item(req: dict):
    uid = req.get('user_id')
    item = req.get('item_name')
    qty = int(req.get('amount', 1))
    
    inv = await inventory_col.find_one({"uid": uid, "item_name": item})
    if not inv or inv.get('quantity', 0) < qty:
        return {"success": False, "message": "❌ Không đủ đồ trong kho!"}
        
    price_per_item = ITEM_PRICES.get(item, 1)
    total_vnt = price_per_item * qty
    
    # Trừ đồ và cộng VNT
    await inventory_col.update_one({"uid": uid, "item_name": item}, {"$inc": {"quantity": -qty}})
    await users_col.update_one({"id": uid}, {"$inc": {"vnt": total_vnt}})
    
    item_name_vn = ITEM_NAME_MAP.get(item, item)
    return {"success": True, "message": f"⚖️ Đã bán {qty} {item_name_vn}\nThu về: +{total_vnt:,} VNT"}