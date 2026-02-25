from fastapi import APIRouter
from pydantic import BaseModel
import random
import time
from bson import ObjectId # Dùng để xử lý ID của MongoDB
from database import users_col, inventory_col, pets_col # Import các Collection mới
from game_config import (
    PET_PRICE_VND, PET_NAMES_LIST, PET_WEIGHTS, MIN_HUNGER_TO_HUNT, 
    HUNGER_COST, PET_CONFIG, DROP_QTY_RANGE, ITEM_NAME_MAP, 
    CRAFT_RECIPES, ITEM_PRICES
)

router = APIRouter()

# Hàm bổ trợ để xóa sạch _id trước khi trả về cho Frontend
def clean_doc(doc):
    if doc:
        if "_id" in doc:
            doc["id"] = str(doc["_id"]) # Chuyển ObjectId thành string để không bị lỗi JSON
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

    # Trừ thể lực và độ đói (Dùng $inc để tăng/giảm số lượng)
    await pets_col.update_one(
        {"_id": pet["_id"]},
        {"$inc": {"turns_used": 1, "exp": 1, "hunger": -HUNGER_COST}}
    )

    win_num = random.randint(1, 4)
    
    if choice == win_num:
        user = await users_col.find_one({"id": uid}, {"bag_level": 1})
        bag_level = user.get('bag_level', 1) if user else 1
        
        luck = PET_CONFIG.get(pet['name'], {"luck": 0})['luck']
        
        roll = random.uniform(0, 100)
        item_code = "Sat"
        if roll < (0.1 + luck/200): item_code = "DaQuy"
        elif roll < (1.0 + luck/100): item_code = "KimCuong"
        elif roll < (5.0 + luck/50): item_code = "Vang"
        elif roll < (20.0 + luck/20): item_code = "Bac"
        elif roll < 50.0: item_code = "Dong"
        
        min_q, max_q = DROP_QTY_RANGE[item_code]
        base_qty = random.uniform(min_q, max_q) if isinstance(min_q, float) else random.randint(min_q, max_q)
        final_qty = round(base_qty * (1 + (bag_level * 0.01)), 2)
        if final_qty.is_integer(): final_qty = int(final_qty)
        
        # Cộng vào kho (Dùng upsert để tự tạo nếu chưa có item đó)
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
# 2. API QUẢN LÝ PET (GET, BUY, EQUIP)
# ==========================================
@router.get("/api/pets/{user_id}")
async def get_user_pets(user_id: int):
    cursor = pets_col.find({"uid": user_id}).sort("is_active", -1)
    pets = await cursor.to_list(length=100)
    return {"success": True, "pets": [clean_doc(p) for p in pets]}

@router.post("/api/pets/buy")
async def buy_pet(req: HuntRequest): # Tận dụng BaseModel cũ
    uid = req.user_id
    user = await users_col.find_one({"id": uid})
    pet_count = await pets_col.count_documents({"uid": uid})
    
    if not user or user['vnd'] < PET_PRICE_VND:
        return {"success": False, "message": "❌ Thiếu tiền!"}
    if pet_count >= user.get('pet_slots', 5):
        return {"success": False, "message": "🚫 Chuồng đầy!"}
        
    await users_col.update_one({"id": uid}, {"$inc": {"vnd": -PET_PRICE_VND}})
    
    pet_won = random.choices(PET_NAMES_LIST, weights=PET_WEIGHTS, k=1)[0]
    cfg = PET_CONFIG[pet_won]
    
    new_pet = {
        "uid": uid, "name": pet_won, "turns_total": cfg['turns'], 
        "turns_used": 0, "level": 1, "hunger": 100, "is_active": 0, "exp": 0,
        "created_at": int(time.time()), "expiry_date": int(time.time()) + (30 * 86400)
    }
    await pets_col.insert_one(new_pet)
    return {"success": True, "message": f"🎉 Nhận được: {pet_won}", "pet": pet_won}

@router.post("/api/pets/equip")
async def equip_pet(req: dict): # Nhận raw dict để linh hoạt
    uid = req.get("user_id")
    pet_id = req.get("pet_id")
    await pets_col.update_many({"uid": uid}, {"$set": {"is_active": 0}})
    await pets_col.update_one({"_id": ObjectId(pet_id), "uid": uid}, {"$set": {"is_active": 1}})
    return {"success": True, "message": "✅ Đã trang bị Pet!"}

# ==========================================
# 3. API KHO ĐỒ & CỬA HÀNG
# ==========================================
@router.get("/api/inventory/{user_id}")
async def get_inventory(user_id: int):
    cursor = inventory_col.find({"uid": user_id, "quantity": {"$gt": 0}})
    items = await cursor.to_list(length=100)
    return {"success": True, "items": [clean_doc(i) for i in items]}

@router.post("/api/pets/feed")
async def feed_pet(req: HuntRequest):
    uid = req.user_id
    price = 200
    user = await users_col.find_one({"id": uid})
    if not user or user['vnt'] < price:
        return {"success": False, "message": "❌ Thiếu VNT!"}
    
    res = await pets_col.update_one({"uid": uid, "is_active": 1}, {"$set": {"hunger": 100}})
    if res.modified_count > 0:
        await users_col.update_one({"id": uid}, {"$inc": {"vnt": -price}})
        return {"success": True, "message": "✅ Pet đã no nê!"}
    return {"success": False, "message": "❌ Không tìm thấy Pet trang bị!"}

@router.post("/api/craft")
async def craft_item(req: dict):
    uid = req['user_id']
    target = req['target_item']
    qty = req['amount']
    recipe = CRAFT_RECIPES.get(target)
    
    total_req = recipe['amt'] * qty
    mat = await inventory_col.find_one({"uid": uid, "item_name": recipe['req']})
    
    if not mat or mat['quantity'] < total_req:
        return {"success": False, "message": "❌ Thiếu nguyên liệu!"}
        
    await inventory_col.update_one({"uid": uid, "item_name": recipe['req']}, {"$inc": {"quantity": -total_req}})
    await inventory_col.update_one({"uid": uid, "item_name": target}, {"$inc": {"quantity": qty}}, upsert=True)
    return {"success": True, "message": "🔥 Rèn thành công!"}

@router.post("/api/market/sell")
async def sell_item(req: dict):
    uid = req['user_id']
    item = req['item_name']
    qty = req['amount']
    
    inv = await inventory_col.find_one({"uid": uid, "item_name": item})
    if not inv or inv['quantity'] < qty:
        return {"success": False, "message": "❌ Không đủ đồ!"}
        
    total_vnt = ITEM_PRICES[item] * qty
    await inventory_col.update_one({"uid": uid, "item_name": item}, {"$inc": {"quantity": -qty}})
    await users_col.update_one({"id": uid}, {"$inc": {"vnt": total_vnt}})
    return {"success": True, "message": f"⚖️ Thu về {total_vnt:,} VNT"}