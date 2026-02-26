class InventoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'InventoryScene' });
    }

    init(data) {
        this.userId = data.userId;
    }

    async create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. NỀN GIAO DIỆN (Dùng màu khối tím đen cho an toàn, đồng bộ với game.js)
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // 2. TIÊU ĐỀ
        this.add.text(width / 2, 50, "🎒 KHO TÀI NGUYÊN", { 
            fontSize: '28px', fontStyle: 'bold', fill: '#ffcc00', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5);

        // 3. TẢI DỮ LIỆU KHO
        let loadingTxt = this.add.text(width / 2, 120, "⏳ Đang kiểm tra kho...", { 
            fontSize: '20px', fill: '#00ffcc' 
        }).setOrigin(0.5);

        let invData = await fetchInventory(this.userId);
        loadingTxt.destroy();

        if (invData && invData.success && invData.items.length > 0) {
            let startY = 130;
            
            // Map tên item, icon Emoji và MÀU SẮC riêng cho từng món
            const itemMap = {
                "Rac": { name: "Rác", icon: "🗑️", color: '#888888' },
                "Sat": { name: "Sắt", icon: "⚙️", color: '#cccccc' },
                "Dong": { name: "Đồng", icon: "🥉", color: '#cd7f32' },
                "Bac": { name: "Bạc", icon: "🥈", color: '#e5e4e2' },
                "Vang": { name: "Vàng", icon: "🥇", color: '#ffd700' },
                "KimCuong": { name: "Kim Cương", icon: "💎", color: '#00ffff' },
                "DaQuy": { name: "Đá Quý", icon: "🔮", color: '#ff00ff' }
            };

            // [NÂNG CẤP] Sắp xếp lại kho đồ theo thứ tự giá trị (Từ rác đến đá quý)
            const order = ["Rac", "Sat", "Dong", "Bac", "Vang", "KimCuong", "DaQuy"];
            invData.items.sort((a, b) => order.indexOf(a.item_name) - order.indexOf(b.item_name));

            // Vẽ từng món đồ ra màn hình
            invData.items.forEach((item, index) => {
                let yPos = startY + (index * 65); // Tăng khoảng cách lên chút cho dễ bấm trên điện thoại
                
                // Khung viền mờ cho từng dòng
                let box = this.add.rectangle(width / 2, yPos, width * 0.9, 55, 0x000000, 0.5);
                box.setStrokeStyle(2, 0x444444);
                
                let info = itemMap[item.item_name] || { name: item.item_name, icon: "📦", color: '#ffffff' };
                
                // Tên item và Icon (Bên trái) - Có màu sắc riêng biệt
                this.add.text(width * 0.05 + 10, yPos, `${info.icon} ${info.name}`, { 
                    fontSize: '22px', fontStyle: 'bold', fill: info.color 
                }).setOrigin(0, 0.5);
                
                // Số lượng (Bên phải)
                this.add.text(width * 0.95 - 10, yPos, `x ${item.quantity.toLocaleString()}`, { 
                    fontSize: '22px', fontStyle: 'bold', fill: '#00ff00' 
                }).setOrigin(1, 0.5);
            });

            // [NÂNG CẤP UX] THÊM NÚT ĐIỀU HƯỚNG NHANH BÊN DƯỚI KHO ĐỒ
            let fastNavY = startY + (invData.items.length * 65) + 30;
            
            let craftBtn = this.add.text(width / 2 - 80, fastNavY, "[ 🔥 LÒ RÈN ]", { 
                fontSize: '18px', backgroundColor: '#aa3300', padding: 8, stroke: '#000', strokeThickness: 2 
            }).setOrigin(0.5).setInteractive();
            craftBtn.on('pointerdown', () => this.scene.start('CraftScene', { userId: this.userId }));

            let marketBtn = this.add.text(width / 2 + 80, fastNavY, "[ ⚖️ CHỢ ĐEN ]", { 
                fontSize: '18px', backgroundColor: '#004444', padding: 8, stroke: '#000', strokeThickness: 2 
            }).setOrigin(0.5).setInteractive();
            marketBtn.on('pointerdown', () => this.scene.start('MarketScene', { userId: this.userId }));

        } else {
            this.add.text(width / 2, height / 2, "🎒 Túi đồ trống rỗng!\n\nHãy đi săn để kiếm khoáng sản.", { 
                fontSize: '20px', fill: '#aaaaaa', align: 'center', lineHeight: 2 
            }).setOrigin(0.5);
        }

        // Nút Quay Lại
        let backBtn = this.add.text(20, 20, "⬅ MENU", { 
            fontSize: '18px', backgroundColor: '#333', padding: 8 
        }).setInteractive();
        backBtn.on('pointerdown', () => { this.scene.start('MenuScene'); });
    }
}