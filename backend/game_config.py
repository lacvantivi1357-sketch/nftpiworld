# File: backend/game_config.py

MIN_HUNGER_TO_HUNT = 20
HUNGER_COST = 2

PET_CONFIG = {
    "Chuột": {"turns": 5, "luck": 0}, 
    "Mèo": {"turns": 6, "luck": 2},
    "Chó": {"turns": 6, "luck": 4}, 
    "Voi": {"turns": 7, "luck": 6},
    "Sư Tử": {"turns": 8, "luck": 10}
}

DROP_QTY_RANGE = {
    "Sat": (5000, 20000), "Dong": (100, 380), "Bac": (10, 40),
    "Vang": (1, 4), "KimCuong": (0.1, 1), "DaQuy": (0.3, 0.5)
}

ITEM_NAME_MAP = {
    "Sat": "Sắt", "Dong": "Đồng", "Bac": "Bạc",
    "Vang": "Vàng", "KimCuong": "Kim Cương", "DaQuy": "Đá Quý", "Rac": "Rác"
}

PET_PRICE_VND = 50000

# Danh sách Pet và Tỉ lệ rớt (Trọng số - Weight)
PET_NAMES_LIST = ["Chuột", "Mèo", "Chó", "Voi", "Sư Tử"]
PET_WEIGHTS = [35, 25, 20, 15, 5]
# --- CÔNG THỨC LÒ RÈN ---
CRAFT_RECIPES = {
    "Sat": {"req": "Rac", "amt": 10},         # 10 Rác -> 1 Sắt
    "Dong": {"req": "Sat", "amt": 100},       # 100 Sắt -> 1 Đồng
    "Bac": {"req": "Dong", "amt": 9},         # 9 Đồng -> 1 Bạc
    "Vang": {"req": "Bac", "amt": 12},        # 12 Bạc -> 1 Vàng
    "KimCuong": {"req": "Vang", "amt": 102},  # 102 Vàng -> 1 Kim Cương
    "DaQuy": {"req": "KimCuong", "amt": 11}   # 11 Kim Cương -> 1 Đá Quý
}