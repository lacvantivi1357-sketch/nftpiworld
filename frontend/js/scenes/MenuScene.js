class MarketScene extends Phaser.Scene {
    constructor() { super({ key: 'MarketScene' }); }
    init(data) { this.userId = data.userId; }

    create() {
        this.width = this.cameras.main.width;
        this.height = this.cameras.main.height;

        // NỀN CHỢ (Xanh đen bí ẩn)
        this.add.rectangle(this.width/2, this.height/2, this.width, this.height, 0x001122, 0.98);
        this.add.text(this.width/2, 40, "🏪 TRUNG TÂM GIAO DỊCH", { fontSize: '26px', fontStyle: 'bold', fill: '#00ffcc', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);

        // BỐ TRÍ 3 TAB NHƯ HỆ THỐNG BOT
        let sysTab = this.add.text(this.width/2 - 110, 95, "[ THU MUA ]", { fontSize: '14px', backgroundColor: '#444', padding: 8 }).setOrigin(0.5).setInteractive();
        let p2pTab = this.add.text(this.width/2, 95, "[ CHỢ P2P ]", { fontSize: '14px', backgroundColor: '#444', padding: 8 }).setOrigin(0.5).setInteractive();
        let statTab = this.add.text(this.width/2 + 110, 95, "[ THỐNG KÊ ]", { fontSize: '14px', backgroundColor: '#444', padding: 8 }).setOrigin(0.5).setInteractive();

        this.contentGroup = this.add.group();

        const resetTabs = () => {
            [sysTab, p2pTab, statTab].forEach(t => t.setStyle({ fill: '#fff', backgroundColor: '#444' }));
        };

        sysTab.on('pointerdown', () => { resetTabs(); sysTab.setStyle({ fill: '#ffcc00', backgroundColor: '#222' }); this.showSystemShop(); });
        p2pTab.on('pointerdown', () => { resetTabs(); p2pTab.setStyle({ fill: '#ffcc00', backgroundColor: '#222' }); this.showP2PMarket(); });
        statTab.on('pointerdown', () => { resetTabs(); statTab.setStyle({ fill: '#ffcc00', backgroundColor: '#222' }); this.showTokenomics(); });

        let backBtn = this.add.text(15, 15, "⬅ MENU", { fontSize: '14px', backgroundColor: '#333', padding: 8 }).setInteractive();
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

        // Mặc định vào Tab Thu Mua
        sysTab.emit('pointerdown');
    }

    // ==========================================
    // TAB 1: THU MUA (BÁN NHANH THEO GIÁ ĐỘNG)
    // ==========================================
    async showSystemShop() {
        this.contentGroup.clear(true, true);
        let loading = this.add.text(this.width/2, 160, "⏳ Đang tải giá thị trường...", { fill: '#00ffcc' }).setOrigin(0.5);
        this.contentGroup.add(loading);

        // Lấy Kho đồ & Giá động cùng lúc
        let [invData, ecoData] = await Promise.all([fetchInventory(this.userId), fetchTokenomics()]);
        this.contentGroup.clear(true, true);

        let inventory = {};
        if (invData?.success) invData.items.forEach(i => inventory[i.item_name] = i.quantity);
        let prices = ecoData?.success ? ecoData.prices : {};

        const itemsList = [
            { id: "Rac", name: "Rác", icon: "🗑️", color: '#888888' },
            { id: "Sat", name: "Sắt", icon: "⚙️", color: '#cccccc' },
            { id: "Dong", name: "Đồng", icon: "🥉", color: '#cd7f32' },
            { id: "Bac", name: "Bạc", icon: "🥈", color: '#e5e4e2' },
            { id: "Vang", name: "Vàng", icon: "🥇", color: '#ffd700' },
            { id: "KimCuong", name: "Kim Cương", icon: "💎", color: '#00ffff' },
            { id: "DaQuy", name: "Đá Quý", icon: "🔮", color: '#ff00ff' }
        ];

        let startY = 145;
        itemsList.forEach((item, index) => {
            let y = startY + (index * 70);
            let qty = inventory[item.id] || 0;
            let currentPrice = prices[item.id] || 0; // Giá động từ Backend

            let box = this.add.rectangle(this.width/2, y, this.width * 0.9, 60, 0x000000, 0.6).setStrokeStyle(2, qty>0 ? 0x00aa00 : 0x333333);
            
            this.add.text(this.width * 0.05 + 10, y - 12, `${item.icon} ${item.name}`, { fontSize: '16px', fontStyle: 'bold', fill: item.color }).setOrigin(0, 0.5);
            this.add.text(this.width * 0.05 + 10, y + 12, `Kho: ${qty.toLocaleString()} | Giá: ${currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2})} VNT`, { fontSize: '12px', fill: qty>0?'#00ff00':'#888' }).setOrigin(0, 0.5);

            let btnColor = qty > 0 ? '#006600' : '#333333';
            let sellBtn = this.add.text(this.width * 0.95 - 10, y, "[ BÁN ]", { fontSize: '14px', fontStyle: 'bold', backgroundColor: btnColor, padding: 8 }).setOrigin(1, 0.5);

            if (qty > 0) {
                sellBtn.setInteractive();
                sellBtn.on('pointerdown', () => this.showSystemSellPopup(item, qty, currentPrice));
            }

            this.contentGroup.addMultiple([box, this.children.list[this.children.list.length-3], this.children.list[this.children.list.length-2], sellBtn]);
        });
    }

    showSystemSellPopup(item, maxQty, price) {
        let amount = parseFloat(window.prompt(`Bạn đang có ${maxQty} ${item.name}\nNhập số lượng muốn bán cho Hệ thống:`));
        if(!amount || amount <= 0 || amount > maxQty) return alert("❌ Số lượng không hợp lệ!");
        
        // Gọi hàm sellItem có sẵn trong api.js
        sellItem(this.userId, item.id, amount).then(res => {
            this.showPopup(res.message, res.success);
        });
    }

    // ==========================================
    // TAB 2: CHỢ ĐEN P2P (NGƯỜI CHƠI BÁN CHO NHAU)
    // ==========================================
    async showP2PMarket() {
        this.contentGroup.clear(true, true);
        this.contentGroup.add(this.add.text(this.width/2, 160, "⏳ Đang tải chợ P2P...", { fill: '#ffcc00' }).setOrigin(0.5));
        
        let res = await fetchP2PMarket();
        this.contentGroup.clear(true, true);

        // Nút Đăng Bán
        let createBtn = this.add.text(this.width/2, 140, "➕ ĐĂNG BÁN VẬT PHẨM (Phí 5%)", { fontSize: '16px', fontStyle: 'bold', backgroundColor: '#aa0000', padding: 8 }).setOrigin(0.5).setInteractive();
        createBtn.on('pointerdown', () => this.showCreateP2PPopup());
        this.contentGroup.add(createBtn);

        if (!res || !res.success || res.listings.length === 0) {
            return this.contentGroup.add(this.add.text(this.width/2, 220, "📭 Chợ hiện tại đang trống.\nHãy là người đầu tiên đăng bán!", { align: 'center', fill: '#888' }).setOrigin(0.5));
        }

        let startY = 200;
        res.listings.forEach((order, i) => {
            let y = startY + (i * 75);
            let isMine = order.seller_id === this.userId;
            
            let box = this.add.rectangle(this.width/2, y, this.width * 0.9, 65, 0x111122).setStrokeStyle(2, isMine ? 0xffcc00 : 0x4444ff);
            
            // Format ID hoặc Tên Item
            let itemName = order.item_name;
            if(itemName === "Sat") itemName = "⚙️ Sắt";
            else if(itemName === "Dong") itemName = "🥉 Đồng";
            else if(itemName === "Vang") itemName = "🥇 Vàng";
            
            let txt1 = this.add.text(this.width * 0.05 + 10, y - 12, `🛒 ${itemName} x${order.quantity}`, { fontSize: '16px', fontStyle: 'bold', fill: '#fff' }).setOrigin(0, 0.5);
            let txt2 = this.add.text(this.width * 0.05 + 10, y + 12, `Người bán: ${isMine ? 'Bạn' : order.seller_id} | Giá: ${order.price.toLocaleString()} VNT`, { fontSize: '12px', fill: '#aaa' }).setOrigin(0, 0.5);

            let actionBtn = this.add.text(this.width * 0.95 - 10, y, isMine ? "[ ĐANG BÁN ]" : "[ MUA ]", { 
                fontSize: '14px', fontStyle: 'bold', backgroundColor: isMine ? '#555' : '#0000aa', padding: 8 
            }).setOrigin(1, 0.5);

            if (!isMine) {
                actionBtn.setInteractive();
                actionBtn.on('pointerdown', async () => {
                    if(confirm(`Xác nhận mua ${itemName} với giá ${order.price.toLocaleString()} VNT?`)) {
                        let r = await buyP2PItem(this.userId, order.id);
                        this.showPopup(r.message, r.success);
                    }
                });
            }

            this.contentGroup.addMultiple([box, txt1, txt2, actionBtn]);
        });
    }

    showCreateP2PPopup() {
        let code = window.prompt("Nhập Mã Vật Phẩm muốn bán (Sat, Dong, Bac, Vang, KimCuong, DaQuy):");
        if(!code) return;
        let qty = parseFloat(window.prompt("Nhập Số lượng muốn bán:"));
        if(!qty || qty <= 0) return;
        let price = parseFloat(window.prompt("Nhập Tổng Giá Thu Về (VNT):"));
        if(!price || price <= 0) return;

        sellP2PItem(this.userId, code, qty, price).then(res => {
            this.showPopup(res.message, res.success);
        });
    }

    // ==========================================
    // TAB 3: THỐNG KÊ CUNG CẦU (TOKENOMICS)
    // ==========================================
    async showTokenomics() {
        this.contentGroup.clear(true, true);
        this.contentGroup.add(this.add.text(this.width/2, 160, "⏳ Phân tích thị trường...", { fill: '#ffcc00' }).setOrigin(0.5));
        
        let res = await fetchTokenomics();
        this.contentGroup.clear(true, true);

        if (!res || !res.success) {
            return this.contentGroup.add(this.add.text(this.width/2, 200, "❌ Lỗi kết nối Cục Thống Kê!", { fill: '#ff0000' }).setOrigin(0.5));
        }

        let msg = "📊 <b>BÁO CÁO KINH TẾ VĨ MÔ</b>\n━━━━━━━━━━━━━━━━━━\n";
        msg += `💱 Tỷ giá: 1 VND = <b>${res.vnt_rate} VNT</b>\n\n`;
        msg += "📦 <b>LƯU THÔNG / TỔNG CUNG:</b>\n";

        const mapName = {"Sat": "Sắt", "Dong": "Đồng", "Bac": "Bạc", "Vang": "Vàng", "KimCuong": "Kim Cương", "DaQuy": "Đá Quý"};
        
        for (let code in mapName) {
            let stat = res.stats[code] || { circ: 0, max: 0, price: 0 };
            let percent = stat.max > 0 ? ((stat.circ / stat.max) * 100).toFixed(1) : 0;
            let icon = percent > 90 ? "⚠️" : "🔹";
            
            msg += `${icon} <b>${mapName[code]}</b>: ${stat.circ.toLocaleString()} / ${stat.max.toLocaleString()} (${percent}%)\n`;
            msg += `   ➥ Giá: ${stat.price.toLocaleString(undefined, {minimumFractionDigits: 2})} VNT\n`;
        }

        let infoText = this.add.text(this.width/2, 140, msg, { fontSize: '14px', fill: '#fff', lineHeight: 1.5 }).setOrigin(0.5, 0);
        this.contentGroup.add(infoText);
    }

    showPopup(message, isSuccess) {
        let bg = this.add.rectangle(this.width/2, this.height/2, this.width * 0.85, 150, 0x000000, 0.95).setInteractive();
        bg.setStrokeStyle(2, isSuccess ? 0x00ffcc : 0xff0000); 
        let txt = this.add.text(this.width/2, this.height/2, message, { fontSize: '16px', fill: '#fff', align: 'center', wordWrap: { width: this.width * 0.8 } }).setOrigin(0.5);

        bg.on('pointerdown', () => {
            bg.destroy(); txt.destroy();
            if (isSuccess) this.scene.restart();
        });
    }
}