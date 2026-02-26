class CraftScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CraftScene' });
    }

    init(data) {
        this.userId = data.userId;
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. NỀN LÒ RÈN (Màu cam đỏ tối)
        this.add.rectangle(width / 2, height / 2, width, height, 0x2b1100);

        this.add.text(width / 2, 40, "🔥 LÒ RÈN THẦN BÍ", { 
            fontSize: '28px', fontStyle: 'bold', fill: '#ffcc00', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5);

        // 2. DANH SÁCH CÔNG THỨC
        const recipes = [
            { target: "Sat", req: "Rac", amt: 10, name: "Sắt", reqName: "Rác", icon: "⚙️" },
            { target: "Dong", req: "Sat", amt: 100, name: "Đồng", reqName: "Sắt", icon: "🥉" },
            { target: "Bac", req: "Dong", amt: 9, name: "Bạc", reqName: "Đồng", icon: "🥈" },
            { target: "Vang", req: "Bac", amt: 12, name: "Vàng", reqName: "Bạc", icon: "🥇" },
            { target: "KimCuong", req: "Vang", amt: 102, name: "Kim Cương", reqName: "Vàng", icon: "💎" },
            { target: "DaQuy", req: "KimCuong", amt: 11, name: "Đá Quý", reqName: "Kim Cương", icon: "🔮" }
        ];

        let startY = 110;
        
        recipes.forEach((rec, index) => {
            let yPos = startY + (index * 75);

            // Khung chứa công thức
            let box = this.add.rectangle(width / 2, yPos, width * 0.9, 65, 0x000000, 0.6);
            box.setStrokeStyle(2, 0xff5500);

            // Text công thức (Căn trái)
            let textFormula = `${rec.amt} ${rec.reqName} ➔ 1 ${rec.icon}`;
            this.add.text(width * 0.05 + 10, yPos, textFormula, { 
                fontSize: '18px', fontStyle: 'bold', fill: '#ffffff' 
            }).setOrigin(0, 0.5);

            // Nút "Rèn" (Căn phải)
            let craftBtn = this.add.text(width * 0.95 - 10, yPos, "[ RÈN ]", { 
                fontSize: '16px', fontStyle: 'bold', fill: '#fff', backgroundColor: '#aa0000', padding: 8, stroke: '#000', strokeThickness: 2
            }).setOrigin(1, 0.5).setInteractive();

            craftBtn.on('pointerdown', () => {
                craftBtn.setStyle({ backgroundColor: '#550000' });
                setTimeout(() => craftBtn.setStyle({ backgroundColor: '#aa0000' }), 100); // Hiệu ứng nháy nút
                
                // Mở Popup chọn số lượng thay vì dùng window.prompt
                this.showQuantityPopup(width, height, rec);
            });
        });

        // 3. NÚT QUAY LẠI
        let backBtn = this.add.text(20, 20, "⬅ TÚI ĐỒ", { 
            fontSize: '16px', backgroundColor: '#333', padding: 8 
        }).setInteractive();
        // Cho quay thẳng về Túi Đồ để người chơi check lại tài nguyên cho tiện
        backBtn.on('pointerdown', () => { this.scene.start('InventoryScene', { userId: this.userId }); });
    }

    // ==========================================
    // HÀM HIỂN THỊ POPUP CHỌN SỐ LƯỢNG RÈN
    // ==========================================
    showQuantityPopup(width, height, rec) {
        // Nền đen mờ che toàn màn hình
        let overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.8).setInteractive();
        
        // Khung Popup
        let panel = this.add.rectangle(width/2, height/2, width * 0.85, 220, 0x221100);
        panel.setStrokeStyle(3, 0xff5500);

        let title = this.add.text(width/2, height/2 - 70, `🔥 Rèn ${rec.icon} ${rec.name}`, { 
            fontSize: '22px', fontStyle: 'bold', fill: '#ffcc00' 
        }).setOrigin(0.5);

        let subtitle = this.add.text(width/2, height/2 - 35, `Tiêu hao: ${rec.amt} ${rec.reqName} / 1 lần`, { 
            fontSize: '14px', fill: '#aaaaaa' 
        }).setOrigin(0.5);

        // Các thành phần UI để dễ dàng xóa đi sau khi xong
        let uiElements = [overlay, panel, title, subtitle];

        // Hàm tạo nút bấm nhanh
        const createBtn = (x, y, text, color, qty) => {
            let btn = this.add.text(x, y, text, { 
                fontSize: '18px', fontStyle: 'bold', backgroundColor: color, padding: 10 
            }).setOrigin(0.5).setInteractive();
            
            btn.on('pointerdown', async () => {
                // Xóa popup đi và hiện chữ đang rèn
                uiElements.forEach(el => el.destroy());
                let loading = this.add.text(width/2, height/2, "⏳ Đang vận công rèn...", { fontSize: '20px', fill: '#00ffcc', backgroundColor: '#000', padding: 10 }).setOrigin(0.5);
                
                // Gọi API
                let res = await craftItem(this.userId, rec.target, qty);
                
                loading.destroy();
                this.showResultPopup(width, height, res);
            });
            uiElements.push(btn);
            return btn;
        };

        // 3 nút chọn số lượng
        createBtn(width/2 - 70, height/2 + 20, "x1", '#aa3300', 1);
        createBtn(width/2, height/2 + 20, "x10", '#aa3300', 10);
        createBtn(width/2 + 70, height/2 + 20, "x100", '#aa3300', 100);

        // Nút Hủy
        let cancelBtn = createBtn(width/2, height/2 + 75, "[ ❌ HỦY BỎ ]", '#333333', 0);
        cancelBtn.removeAllListeners(); // Ghi đè sự kiện của nút tạo sẵn
        cancelBtn.on('pointerdown', () => uiElements.forEach(el => el.destroy()));
    }

    // ==========================================
    // HÀM HIỂN THỊ KẾT QUẢ (Thành công / Thất bại)
    // ==========================================
    showResultPopup(width, height, result) {
        let bg = this.add.rectangle(width/2, height/2, width * 0.8, 150, 0x000000, 0.9).setInteractive();
        bg.setStrokeStyle(2, result.success ? 0x00ff00 : 0xff0000); 

        let txt = this.add.text(width/2, height/2, result.message, { 
            fontSize: '18px', fill: '#fff', align: 'center', wordWrap: { width: width * 0.7 } 
        }).setOrigin(0.5);

        bg.on('pointerdown', () => {
            bg.destroy(); txt.destroy();
        });
    }
}