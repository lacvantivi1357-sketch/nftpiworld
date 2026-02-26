class MarketScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MarketScene' });
    }

    init(data) {
        this.userId = data.userId;
    }

    async create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. NỀN CHỢ ĐEN (Màu xanh cổ vịt tối, tạo cảm giác nguy hiểm & bí ẩn)
        this.add.rectangle(width / 2, height / 2, width, height, 0x001a1a);

        this.add.text(width / 2, 40, "⚖️ CHỢ ĐEN V86", { 
            fontSize: '28px', fontStyle: 'bold', fill: '#00ffcc', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5);

        // 2. TẢI DỮ LIỆU KHO ĐỒ
        let loadingTxt = this.add.text(width / 2, 120, "⏳ Đang kết nối thương gia...", { 
            fontSize: '18px', fill: '#00ffcc' 
        }).setOrigin(0.5);

        let invData = await fetchInventory(this.userId);
        loadingTxt.destroy(); // Xóa chữ loading

        let inventory = {};
        if (invData && invData.success) {
            invData.items.forEach(i => inventory[i.item_name] = i.quantity);
        }

        // 3. DANH SÁCH MẶT HÀNG GIAO DỊCH
        const marketItems = [
            { id: "Rac", name: "Rác", price: 1, icon: "🗑️", color: '#888888' },
            { id: "Sat", name: "Sắt", price: 15, icon: "⚙️", color: '#cccccc' },
            { id: "Dong", name: "Đồng", price: 180, icon: "🥉", color: '#cd7f32' },
            { id: "Bac", name: "Bạc", price: 1800, icon: "🥈", color: '#e5e4e2' },
            { id: "Vang", name: "Vàng", price: 25000, icon: "🥇", color: '#ffd700' },
            { id: "KimCuong", name: "Kim Cương", price: 300000, icon: "💎", color: '#00ffff' },
            { id: "DaQuy", name: "Đá Quý", price: 3500000, icon: "🔮", color: '#ff00ff' }
        ];

        let startY = 100;
        
        marketItems.forEach((item, index) => {
            let yPos = startY + (index * 75);
            let qtyOwn = inventory[item.id] || 0;

            // Khung chứa (Sáng viền lên nếu có đồ để bán)
            let box = this.add.rectangle(width / 2, yPos, width * 0.9, 65, 0x000000, 0.6);
            box.setStrokeStyle(2, qtyOwn > 0 ? 0x00aaaa : 0x333333);

            // Tên vật phẩm
            this.add.text(width * 0.05 + 10, yPos - 15, `${item.icon} ${item.name}`, { 
                fontSize: '18px', fontStyle: 'bold', fill: item.color 
            }).setOrigin(0, 0.5);
            
            // Thông tin số lượng & Giá
            this.add.text(width * 0.05 + 10, yPos + 12, `Kho: ${qtyOwn.toLocaleString()} | Giá: ${item.price.toLocaleString()} VNT`, { 
                fontSize: '14px', fill: qtyOwn > 0 ? '#00ff00' : '#888888' 
            }).setOrigin(0, 0.5);

            // Nút Bán (Làm xám đi và không cho bấm nếu không có đồ)
            let btnColor = qtyOwn > 0 ? '#006666' : '#333333';
            let sellBtn = this.add.text(width * 0.95 - 10, yPos, "[ BÁN ]", { 
                fontSize: '16px', fontStyle: 'bold', fill: qtyOwn > 0 ? '#fff' : '#888', backgroundColor: btnColor, padding: 8, stroke: '#000', strokeThickness: 2
            }).setOrigin(1, 0.5);

            if (qtyOwn > 0) {
                sellBtn.setInteractive();
                sellBtn.on('pointerdown', () => {
                    sellBtn.setStyle({ backgroundColor: '#003333' });
                    setTimeout(() => sellBtn.setStyle({ backgroundColor: '#006666' }), 100);
                    
                    // Mở Popup Giao Dịch
                    this.showSellPopup(width, height, item, qtyOwn);
                });
            }
        });

        // 4. NÚT QUAY LẠI TÚI ĐỒ (Tiện check lại đồ)
        let backBtn = this.add.text(20, 20, "⬅ TÚI ĐỒ", { fontSize: '16px', backgroundColor: '#333', padding: 8 }).setInteractive();
        backBtn.on('pointerdown', () => { this.scene.start('InventoryScene', { userId: this.userId }); });
    }

    // ==========================================
    // HÀM HIỂN THỊ POPUP CHỌN SỐ LƯỢNG BÁN
    // ==========================================
    showSellPopup(width, height, item, qtyOwn) {
        let overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.8).setInteractive();
        let panel = this.add.rectangle(width/2, height/2, width * 0.85, 220, 0x001111);
        panel.setStrokeStyle(3, 0x00ffcc);

        let title = this.add.text(width/2, height/2 - 70, `⚖️ Bán ${item.icon} ${item.name}`, { 
            fontSize: '22px', fontStyle: 'bold', fill: '#00ffcc' 
        }).setOrigin(0.5);

        let subtitle = this.add.text(width/2, height/2 - 35, `Đang có: ${qtyOwn.toLocaleString()} | Giá: ${item.price.toLocaleString()} VNT/cái`, { 
            fontSize: '14px', fill: '#aaaaaa' 
        }).setOrigin(0.5);

        let uiElements = [overlay, panel, title, subtitle];

        const createBtn = (x, y, text, color, qtyToSell) => {
            let btn = this.add.text(x, y, text, { 
                fontSize: '16px', fontStyle: 'bold', backgroundColor: color, padding: 10, stroke: '#000', strokeThickness: 2 
            }).setOrigin(0.5).setInteractive();
            
            btn.on('pointerdown', async () => {
                uiElements.forEach(el => el.destroy());
                let loading = this.add.text(width/2, height/2, "⏳ Đang đếm tiền...", { fontSize: '20px', fill: '#00ffcc', backgroundColor: '#000', padding: 10 }).setOrigin(0.5);
                
                let res = await sellItem(this.userId, item.id, qtyToSell);
                loading.destroy();
                this.showResultPopup(width, height, res);
            });
            uiElements.push(btn);
            return btn;
        };

        // Tính toán số lượng cho các nút bấm nhanh
        let halfQty = Math.floor(qtyOwn / 2);
        
        createBtn(width/2 - 80, height/2 + 20, "Bán x1", '#006666', 1);
        
        // Nếu có nhiều hơn 1 cái, hiện nút bán 50%, nếu không thì hiện x10
        if (halfQty > 0) {
            createBtn(width/2, height/2 + 20, "Bán 50%", '#006666', halfQty);
        } else {
            createBtn(width/2, height/2 + 20, "Bán x10", '#006666', Math.min(10, qtyOwn));
        }
        
        createBtn(width/2 + 80, height/2 + 20, "BÁN HẾT", '#aa0000', qtyOwn);

        let cancelBtn = createBtn(width/2, height/2 + 75, "[ ❌ HỦY BỎ ]", '#333333', 0);
        cancelBtn.removeAllListeners(); 
        cancelBtn.on('pointerdown', () => uiElements.forEach(el => el.destroy()));
    }

    // ==========================================
    // HÀM HIỂN THỊ KẾT QUẢ
    // ==========================================
    showResultPopup(width, height, result) {
        let bg = this.add.rectangle(width/2, height/2, width * 0.8, 150, 0x000000, 0.9).setInteractive();
        bg.setStrokeStyle(2, result.success ? 0x00ff00 : 0xff0000); 

        let txt = this.add.text(width/2, height/2, result.message, { 
            fontSize: '18px', fontStyle: 'bold', fill: '#fff', align: 'center', wordWrap: { width: width * 0.7 } 
        }).setOrigin(0.5);

        bg.on('pointerdown', () => {
            bg.destroy(); txt.destroy();
            if (result.success) this.scene.restart(); // Tiền về túi thì load lại chợ
        });
    }
}