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

        // Nền tối ám xanh của Chợ Đen
        let bg = this.add.image(width / 2, height / 2, 'bg_menu');
        bg.setDisplaySize(width, height);
        bg.setTint(0x002222); 

        this.add.text(width / 2, 40, "⚖️ CHỢ ĐEN V86", { 
            fontSize: '32px', fontStyle: 'bold', fill: '#00ffcc', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5);

        // Lấy dữ liệu kho đồ để hiển thị số lượng người chơi đang có
        let invData = await fetchInventory(this.userId);
        let inventory = {};
        if (invData && invData.success) {
            invData.items.forEach(i => inventory[i.item_name] = i.quantity);
        }

        const marketItems = [
            { id: "Rac", name: "Rác", price: 1, icon: "🗑" },
            { id: "Sat", name: "Sắt", price: 15, icon: "⚙️" },
            { id: "Dong", name: "Đồng", price: 180, icon: "🥉" },
            { id: "Bac", name: "Bạc", price: 1800, icon: "🥈" },
            { id: "Vang", name: "Vàng", price: 25000, icon: "🥇" },
            { id: "KimCuong", name: "Kim Cương", price: 300000, icon: "💎" },
            { id: "DaQuy", name: "Đá Quý", price: 3500000, icon: "🔮" }
        ];

        let startY = 110;
        
        marketItems.forEach((item, index) => {
            let yPos = startY + (index * 70);
            let qtyOwn = inventory[item.id] || 0;

            // Khung chứa
            this.add.rectangle(width / 2, yPos, width - 40, 60, 0x000000, 0.7).setStrokeStyle(2, 0x00aaaa);

            // Tên và Số lượng đang có
            this.add.text(40, yPos - 12, `${item.icon} ${item.name} (Có: ${qtyOwn})`, { fontSize: '18px', fill: '#fff' }).setOrigin(0, 0.5);
            // Giá thu mua
            this.add.text(40, yPos + 12, `Giá: ${item.price.toLocaleString()} VNT/cái`, { fontSize: '16px', fill: '#ffcc00' }).setOrigin(0, 0.5);

            // Nút Bán
            let sellBtn = this.add.text(width - 40, yPos, "[ BÁN ]", { 
                fontSize: '18px', fontStyle: 'bold', fill: '#fff', backgroundColor: '#006666', padding: 8, stroke: '#000', strokeThickness: 2
            }).setOrigin(1, 0.5).setInteractive();

            sellBtn.on('pointerdown', async () => {
                sellBtn.setStyle({ backgroundColor: '#003333' });
                
                let qtyStr = window.prompt(`Bạn có: ${qtyOwn} ${item.name}\nNhập số lượng muốn bán:`, qtyOwn);
                let qty = parseInt(qtyStr);

                if (!isNaN(qty) && qty > 0) {
                    let res = await sellItem(this.userId, item.id, qty);
                    alert(res.message);
                    if (res.success) this.scene.restart(); // Load lại trang để cập nhật số lượng
                }
                sellBtn.setStyle({ backgroundColor: '#006666' });
            });
        });

        // Nút Quay Lại
        let backBtn = this.add.text(20, 20, "⬅ MENU", { fontSize: '18px', backgroundColor: '#333', padding: 8 }).setInteractive();
        backBtn.on('pointerdown', () => { this.scene.start('MenuScene'); });
    }
}