const API_URL = "https://nftpiworld.onrender.com";

// Hàm lấy ID thật của người chơi từ Telegram
function getTelegramUserId() {
    const tg = window.Telegram.WebApp;
    // tg.expand() giúp Web App mở full màn hình điện thoại
    tg.expand(); 
    
    // Lấy thông tin user. Nếu mở trên trình duyệt web thường (để test) thì trả về ID Admin ảo.
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        return tg.initDataUnsafe.user.id;
    } else {
        console.warn("Đang chạy ngoài Telegram. Dùng ID Test.");
        return 6877673260; // Sửa thành ID Telegram của bạn để test
    }
}

// Hàm gọi API lấy thông tin nhân vật
async function fetchUserData(userId) {
    try {
        let response = await fetch(`${API_URL}/api/user/${userId}`);
        if (!response.ok) throw new Error("Network response was not ok");
        return await response.json();
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
        return null;
    }
}

// Thêm hàm này xuống cuối file api.js
async function huntTreasure(userId, caveChoice) {
    try {
        let response = await fetch(`${API_URL}/api/hunt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, cave_choice: caveChoice })
        });
        return await response.json();
    } catch (error) {
        console.error("Lỗi đi săn:", error);
        return { success: false, message: "❌ Lỗi mạng, không thể kết nối tới server!" };
    }
}

// Lấy danh sách chuồng Pet
async function fetchUserPets(userId) {
    let response = await fetch(`${API_URL}/api/pets/${userId}`);
    return await response.json();
}

// Mua Pet mới
async function buyNewPet(userId) {
    let response = await fetch(`${API_URL}/api/pets/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
    });
    return await response.json();
}

// Trang bị Pet
async function equipPet(userId, petId) {
    let response = await fetch(`${API_URL}/api/pets/equip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, pet_id: petId })
    });
    return await response.json();
}

// Lấy dữ liệu kho đồ
async function fetchInventory(userId) {
    let response = await fetch(`${API_URL}/api/inventory/${userId}`);
    return await response.json();
}

// Cho Pet ăn
async function feedPet(userId) {
    let response = await fetch(`${API_URL}/api/pets/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
    });
    return await response.json();
}

// Gọi API rèn đồ
async function craftItem(userId, targetItem, amount) {
    let response = await fetch(`${API_URL}/api/craft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            user_id: userId, 
            target_item: targetItem, 
            amount: amount 
        })
    });
    return await response.json();
}

// Gọi API bán đồ tại Chợ Đen
async function sellItem(userId, itemName, amount) {
    let response = await fetch(`${API_URL}/api/market/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            user_id: userId, 
            item_name: itemName, 
            amount: amount 
        })
    });
    return await response.json();
}

async function adminFetchUsers(adminId) {
    let res = await fetch(`${API_URL}/api/admin/all-users?admin_id=${adminId}`);
    return await res.json();
}

async function adminEditUser(adminId, targetId, newData) {
    let res = await fetch(`${API_URL}/api/admin/edit-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId, target_id: targetId, data: newData })
    });
    return await res.json();
}

// ==========================================
// CÁC HÀM MỚI THÊM CHO HỆ THỐNG TÀI CHÍNH
// ==========================================

// Gọi API gửi yêu cầu Nạp Tiền
async function requestDeposit(userId, amount, txHash, currency) {
    let response = await fetch(`${API_URL}/api/finance/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            user_id: userId, 
            amount: amount, 
            tx_hash: txHash, 
            currency: currency 
        })
    });
    return await response.json();
}

// Gọi API gửi yêu cầu Rút Tiền
async function requestWithdraw(userId, amountVnt, mode, info) {
    let response = await fetch(`${API_URL}/api/finance/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            user_id: userId, 
            amount_vnt: amountVnt, 
            mode: mode, 
            info: info 
        })
    });
    return await response.json();
}
// Admin lấy danh sách đơn rút tiền
async function adminFetchWithdrawals(adminId) {
    let res = await fetch(`${API_URL}/api/admin/withdrawals?admin_id=${adminId}`);
    return await res.json();
}

// Admin thao tác (Duyệt/Từ chối)
async function adminActionWithdrawal(adminId, wdId, action) {
    let res = await fetch(`${API_URL}/api/admin/withdrawals/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId, wd_id: wdId, action: action })
    });
    return await res.json();
}
// Admin lấy danh sách đơn NẠP TIỀN
async function adminFetchDeposits(adminId) {
    let res = await fetch(`${API_URL}/api/admin/deposits?admin_id=${adminId}`);
    return await res.json();
}

// Admin thao tác (Duyệt/Từ chối) đơn NẠP TIỀN
async function adminActionDeposit(adminId, depId, action) {
    let res = await fetch(`${API_URL}/api/admin/deposits/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId, dep_id: depId, action: action })
    });
    return await res.json();
}
// Lấy danh sách ví hệ thống (Để hiển thị cho khách nạp)
async function fetchSystemWallets() {
    let res = await fetch(`${API_URL}/api/system/wallets`);
    return await res.json();
}

// Admin lưu cấu hình ví mới
async function adminUpdateWallets(adminId, walletsData) {
    let res = await fetch(`${API_URL}/api/admin/wallets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId, wallets: walletsData })
    });
    return await res.json();
}
// --- API KINH TẾ & THỊ TRƯỜNG P2P ---
// Lấy bảng thống kê Tokenomics (Cung cầu, Giá động)
async function fetchTokenomics() {
    let res = await fetch(`${API_URL}/api/market/tokenomics`);
    return await res.json();
}

// Lấy danh sách hàng đang bán trên Chợ P2P
async function fetchP2PMarket() {
    let res = await fetch(`${API_URL}/api/market/p2p`);
    return await res.json();
}

// Đăng bán vật phẩm lên Chợ P2P
async function sellP2PItem(userId, itemName, amount, priceVnt) {
    let res = await fetch(`${API_URL}/api/market/p2p/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, item_name: itemName, amount: amount, price: priceVnt })
    });
    return await res.json();
}

// Mua vật phẩm từ Chợ P2P
async function buyP2PItem(userId, orderId) {
    let res = await fetch(`${API_URL}/api/market/p2p/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, order_id: orderId })
    });
    return await res.json();
}