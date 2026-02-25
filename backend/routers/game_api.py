from fastapi import APIRouter
from pydantic import BaseModel
import random
import time
from database import db_query
from game_config import PET_PRICE_VND, PET_NAMES_LIST, PET_WEIGHTS, MIN_HUNGER_TO_HUNT, HUNGER_COST, PET_CONFIG, DROP_QTY_RANGE, ITEM_NAME_MAP, CRAFT_RECIPES, ITEM_PRICES
router = APIRouter()

# Nhận dữ liệu từ Web (Ví dụ người chơi bấm Hang số 2)
class HuntRequest(BaseModel):
    user_id: int
    cave_choice: int

@router.post("/api/hunt")
async def process_hunt(req: HuntRequest):
    uid = req.user_id
    choice = req.cave_choice
    
    # 1. KIỂM TRA ĐIỀU KIỆN (Y hệt code cũ)
    pet = await db_query("SELECT * FROM user_pets WHERE uid=? AND is_active=1 LIMIT 1", (uid,), fetchone=True)
    if not pet:
        return {"success": False, "message": "❌ Bạn chưa có Pet hoặc chưa trang bị!"}
        
    if pet['turns_used'] >= pet['turns_total']:
        return {"success": False, "message": "💤 Pet đã hết lượt săn hôm nay!"}
        
    if pet['hunger'] < MIN_HUNGER_TO_HUNT:
        return {"success": False, "message": f"🚫 Pet quá đói ({pet['hunger']}/100)! Cần cho ăn."}

    # 2. TRỪ THỂ LỰC VÀ ĐỘ ĐÓI
    await db_query("UPDATE user_pets SET turns_used=turns_used+1, exp=exp+1, hunger=hunger-? WHERE id=?", 
                   (HUNGER_COST, pet['id']), commit=True)

    # 3. QUAY RANDOM TRÚNG/TRƯỢT (Tỉ lệ 25% trúng - chọn 1 trong 4 hang)
    win_num = random.randint(1, 4)
    
    if choice == win_num:
        # TRÚNG KHO BÁU! Tính toán dựa trên Luck và Bag Level
        user = await db_query("SELECT bag_level FROM users WHERE id=?", (uid,), fetchone=True)
        bag_level = user['bag_level'] if user else 1
        
        # Lấy chỉ số Luck
        cfg = PET_CONFIG.get(pet['name'], {"luck": 0})
        luck = cfg['luck']
        
        # Quay món đồ rớt ra (Logic cũ của bạn)
        roll = random.uniform(0, 100)
        item_code = "Sat"
        if roll < (0.1 + luck/200): item_code = "DaQuy"
        elif roll < (1.0 + luck/100): item_code = "KimCuong"
        elif roll < (5.0 + luck/50): item_code = "Vang"
        elif roll < (20.0 + luck/20): item_code = "Bac"
        elif roll < 50.0: item_code = "Dong"
        
        # Tính số lượng + Bonus túi đồ (+1% mỗi cấp)
        min_q, max_q = DROP_QTY_RANGE[item_code]
        base_qty = random.uniform(min_q, max_q) if isinstance(min_q, float) else random.randint(min_q, max_q)
        final_qty = round(base_qty * (1 + (bag_level * 0.01)), 2)
        if final_qty.is_integer(): final_qty = int(final_qty)
        
        # Cộng vào kho
        await db_query("INSERT OR IGNORE INTO inventory (uid, item_name, quantity) VALUES (?,?,0)", (uid, item_code), commit=True)
        await db_query("UPDATE inventory SET quantity=quantity+? WHERE uid=? AND item_name=?", (final_qty, uid, item_code), commit=True)
        
        item_name_vn = ITEM_NAME_MAP.get(item_code, item_code)
        msg = f"🎉 TRÚNG LỚN (Hang {win_num})!\nNhận được: +{final_qty} {item_name_vn}\n(Đã trừ {HUNGER_COST} độ no)"
        return {"success": True, "message": msg, "item": item_code, "qty": final_qty}
        
    else:
        # TRƯỢT KHO BÁU (Ra rác)
        qty_rac = random.randint(50000, 160000)
        await db_query("INSERT OR IGNORE INTO inventory (uid, item_name, quantity) VALUES (?,?,0)", (uid, "Rac"), commit=True)
        await db_query("UPDATE inventory SET quantity=quantity+? WHERE uid=? AND item_name='Rac'", (qty_rac, uid), commit=True)
        
        msg = f"🌑 TRƯỢT RỒI!\nKho báu nằm ở Hang {win_num}.\nBạn nhặt được {qty_rac:,} Rác."
        return {"success": True, "message": msg, "item": "Rac", "qty": qty_rac}
@router.get("/api/pets/{user_id}")
async def get_user_pets(user_id: int):
    pets = await db_query("SELECT * FROM user_pets WHERE uid=? ORDER BY is_active DESC", (user_id,), fetchall=True)
    return {"success": True, "pets": [dict(p) for p in pets] if pets else []}

# ==========================================
# 2. API MUA PET (GACHA RANDOM)
# ==========================================
class BuyPetRequest(BaseModel):
    user_id: int

@router.post("/api/pets/buy")
async def buy_pet(req: BuyPetRequest):
    uid = req.user_id
    
    # Check tiền và slot
    u = await db_query("SELECT vnd, pet_slots FROM users WHERE id=?", (uid,), fetchone=True)
    pet_count = (await db_query("SELECT COUNT(*) as c FROM user_pets WHERE uid=?", (uid,), fetchone=True))['c']
    
    if u['vnd'] < PET_PRICE_VND:
        return {"success": False, "message": f"❌ Thiếu tiền! Cần {PET_PRICE_VND:,} VND."}
    if pet_count >= u['pet_slots']:
        return {"success": False, "message": f"🚫 Chuồng đã đầy ({pet_count}/{u['pet_slots']})!"}
        
    # Trừ tiền
    await db_query("UPDATE users SET vnd = vnd - ? WHERE id=?", (PET_PRICE_VND, uid), commit=True)
    
    # Quay Random Pet
    pet_won = random.choices(PET_NAMES_LIST, weights=PET_WEIGHTS, k=1)[0]
    cfg = PET_CONFIG[pet_won]
    expiry = int(time.time()) + (30 * 86400) # Hạn 30 ngày
    
    # Lưu vào DB
    await db_query(
        "INSERT INTO user_pets (uid, name, turns_total, created_at, expiry_date, last_reset, level, is_active, exp, hunger) VALUES (?,?,?,?,?,?,1,0,0,100)",
        (uid, pet_won, cfg['turns'], int(time.time()), expiry, "2000-01-01")
    , commit=True)
    
    return {"success": True, "message": f"🎉 MỞ HỘP THÀNH CÔNG!\nBạn nhận được: {pet_won.upper()}", "pet": pet_won}

# ==========================================
# 3. API TRANG BỊ PET
# ==========================================
class EquipPetRequest(BaseModel):
    user_id: int
    pet_id: int

@router.post("/api/pets/equip")
async def equip_pet(req: EquipPetRequest):
    # Tắt hết pet cũ
    await db_query("UPDATE user_pets SET is_active=0 WHERE uid=?", (req.user_id,), commit=True)
    # Bật pet mới
    await db_query("UPDATE user_pets SET is_active=1 WHERE id=? AND uid=?", (req.pet_id, req.user_id), commit=True)
    
    return {"success": True, "message": "✅ Đã trang bị Pet thành công!"}
# ==========================================
# 4. API LẤY DANH SÁCH TÚI ĐỒ (INVENTORY)
# ==========================================
@router.get("/api/inventory/{user_id}")
async def get_inventory(user_id: int):
    items = await db_query("SELECT item_name, quantity FROM inventory WHERE uid=? AND quantity > 0", (user_id,), fetchall=True)
    return {"success": True, "items": [dict(i) for i in items] if items else []}

# ==========================================
# 5. API CHO PET ĂN (TRẠM THÚ Y)
# ==========================================
class FeedRequest(BaseModel):
    user_id: int

@router.post("/api/pets/feed")
async def feed_pet(req: FeedRequest):
    uid = req.user_id
    FEEDING_PRICE = 200 # Phí cho ăn y hệt bot cũ của bạn
    
    # 1. Check tiền
    u = await db_query("SELECT vnt FROM users WHERE id=?", (uid,), fetchone=True)
    if u['vnt'] < FEEDING_PRICE:
        return {"success": False, "message": f"❌ Bạn không đủ tiền! Cần {FEEDING_PRICE} VNT để mua thức ăn."}
        
    # 2. Check Pet
    pet = await db_query("SELECT id, hunger FROM user_pets WHERE uid=? AND is_active=1", (uid,), fetchone=True)
    if not pet:
        return {"success": False, "message": "❌ Bạn chưa trang bị Pet nào!"}
    if pet['hunger'] >= 100:
        return {"success": False, "message": "🍗 Pet của bạn đã no nê rồi!"}
        
    # 3. Trừ tiền và hồi max 100% đói
    await db_query("UPDATE users SET vnt = vnt - ? WHERE id=?", (FEEDING_PRICE, uid), commit=True)
    await db_query("UPDATE user_pets SET hunger=100 WHERE id=?", (pet['id'],), commit=True)
    
    return {"success": True, "message": "✅ Đã cho Pet ăn no nê! (Trừ 200 VNT)"}
# ==========================================
# 6. API LÒ RÈN (CRAFTING)
# ==========================================
class CraftRequest(BaseModel):
    user_id: int
    target_item: str
    amount: int

@router.post("/api/craft")
async def craft_item(req: CraftRequest):
    uid = req.user_id
    target = req.target_item
    qty_want = req.amount
    
    if qty_want <= 0:
        return {"success": False, "message": "❌ Số lượng không hợp lệ!"}
        
    recipe = CRAFT_RECIPES.get(target)
    if not recipe:
        return {"success": False, "message": "❌ Công thức không tồn tại!"}
        
    total_req = recipe['amt'] * qty_want
    req_item = recipe['req']
    
    # Kiểm tra kho xem đủ nguyên liệu không
    inv = await db_query("SELECT quantity FROM inventory WHERE uid=? AND item_name=?", (uid, req_item), fetchone=True)
    current_mat = inv['quantity'] if inv else 0
    
    req_name_vn = ITEM_NAME_MAP.get(req_item, req_item)
    target_name_vn = ITEM_NAME_MAP.get(target, target)

    if current_mat < total_req:
        return {
            "success": False, 
            "message": f"❌ KHÔNG ĐỦ NGUYÊN LIỆU!\nBạn muốn rèn {qty_want} {target_name_vn}.\nCần: {total_req:,} {req_name_vn}\nCó: {current_mat:,} {req_name_vn}"
        }
        
    # Trừ nguyên liệu, cộng thành phẩm
    await db_query("UPDATE inventory SET quantity = quantity - ? WHERE uid=? AND item_name=?", (total_req, uid, req_item), commit=True)
    await db_query("INSERT OR IGNORE INTO inventory (uid, item_name, quantity) VALUES (?,?,0)", (uid, target), commit=True)
    await db_query("UPDATE inventory SET quantity = quantity + ? WHERE uid=? AND item_name=?", (qty_want, uid, target), commit=True)
    
    return {"success": True, "message": f"🔥 RÈN THÀNH CÔNG!\nChế tạo: +{qty_want:,} {target_name_vn}\nTiêu hao: -{total_req:,} {req_name_vn}"}
# ==========================================
# 7. API CHỢ ĐEN (BÁN ĐỒ LẤY VNT)
# ==========================================
class SellRequest(BaseModel):
    user_id: int
    item_name: str
    amount: int

@router.post("/api/market/sell")
async def sell_item(req: SellRequest):
    uid = req.user_id
    item = req.item_name
    qty = req.amount
    
    if qty <= 0:
        return {"success": False, "message": "❌ Số lượng bán phải lớn hơn 0!"}
        
    price_per_item = ITEM_PRICES.get(item)
    if not price_per_item:
        return {"success": False, "message": "❌ Chợ đen không thu mua vật phẩm này!"}
        
    # Kiểm tra kho xem có đủ đồ để bán không
    inv = await db_query("SELECT quantity FROM inventory WHERE uid=? AND item_name=?", (uid, item), fetchone=True)
    current_qty = inv['quantity'] if inv else 0
    
    item_name_vn = ITEM_NAME_MAP.get(item, item)
    
    if current_qty < qty:
        return {"success": False, "message": f"❌ Bạn không đủ {item_name_vn} để bán!\nCó: {current_qty} | Muốn bán: {qty}"}
        
    # Tính tổng tiền nhận được
    total_vnt = price_per_item * qty
    
    # Trừ đồ trong kho và Cộng tiền cho user
    await db_query("UPDATE inventory SET quantity = quantity - ? WHERE uid=? AND item_name=?", (qty, uid, item), commit=True)
    await db_query("UPDATE users SET vnt = vnt + ? WHERE id=?", (total_vnt, uid), commit=True)
    
    return {"success": True, "message": f"⚖️ BÁN THÀNH CÔNG!\nĐã bán {qty} {item_name_vn}\nThu về: +{total_vnt:,} VNT 💰"}