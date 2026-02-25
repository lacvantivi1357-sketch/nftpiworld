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

        // Vẽ nền
        let bg = this.add.image(width / 2, height / 2, 'bg_menu');
        bg.setDisplaySize(width, height);
        bg.setTint(0x333333); 

        // Tiêu đề
        this.add.text(width / 2, 50, "🎒 KHO ĐỒ CỦA BẠN", { 
            fontSize: '32px', fontStyle: 'bold', fill: '#fff', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5);

        // Chữ loading
        let loadingTxt = this.add.text(width / 2, height / 2, "Đang kiểm tra kho...", { fontSize: '20px', fill: '#aaa' }).setOrigin(0.5);

        // Gọi API lấy túi đồ
        let invData = await fetchInventory(this.userId);
        loadingTxt.destroy();

        if (invData && invData.success && invData.items.length > 0) {
            let startY = 120;
            
            // Map tên item và icon Emoji cho sinh động
            const itemMap = {
                "Sat": { name: "Sắt", icon: "⚙️" },
                "Dong": { name: "Đồng", icon: "🥉" },
                "Bac": { name: "Bạc", icon: "🥈" },
                "Vang": { name: "Vàng", icon: "🥇" },
                "KimCuong": { name: "Kim Cương", icon: "💎" },
                "DaQuy": { name: "Đá Quý", icon: "🔮" },
                "Rac": { name: "Rác", icon: "🗑" }
            };

            // Vẽ từng món đồ ra màn hình
            invData.items.forEach((item, index) => {
                let yPos = startY + (index * 60); // Khoảng cách mỗi dòng là 60px
                
                // Khung chứa 1 item
                this.add.rectangle(width / 2, yPos, width - 40, 50, 0x000000, 0.6).setStrokeStyle(2, 0xaaaaaa);
                
                let info = itemMap[item.item_name] || { name: item.item_name, icon: "📦" };
                
                // Tên item (Bên trái)
                this.add.text(40, yPos, `${info.icon} ${info.name}`, { fontSize: '22px', fill: '#fff' }).setOrigin(0, 0.5);
                
                // Số lượng (Bên phải)
                this.add.text(width - 40, yPos, `x ${item.quantity.toLocaleString()}`, { fontSize: '22px', fontStyle: 'bold', fill: '#00ffcc' }).setOrigin(1, 0.5);
            });
        } else {
            this.add.text(width / 2, height / 2, "🎒 Túi đồ trống rỗng!\nHãy đi săn để kiếm khoáng sản.", { fontSize: '20px', fill: '#ff0', align: 'center' }).setOrigin(0.5);
        }

        // Nút Quay Lại
        let backBtn = this.add.text(20, 20, "⬅ QUAY LẠI", { fontSize: '18px', backgroundColor: '#550000', padding: 8 }).setInteractive();
        backBtn.on('pointerdown', () => { this.scene.start('MenuScene'); });
    }
}