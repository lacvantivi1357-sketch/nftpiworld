class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        // Tải ảnh nền
        this.load.image('bg_menu', 'assets/bg_menu.jpg');
    }

    async create() {
        // Lấy kích thước màn hình hiện tại
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // --- 1. VẼ ẢNH NỀN MENU ---
        let bg = this.add.image(width / 2, height / 2, 'bg_menu');
        bg.setDisplaySize(width, height); 
        bg.setTint(0x555555); // Làm tối nền để nổi bật chữ

        // --- 2. VẼ TIÊU ĐỀ ---
        this.add.text(width / 2, 50, "🏰 EMPIRE V86", { 
            fontSize: '36px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5);

        // --- 3. VẼ CHỮ TRẠNG THÁI (LOADING) ---
        let statusText = this.add.text(width / 2, 120, "⏳ Đang tải dữ liệu...", { 
            fontSize: '20px', fill: '#ffcc00', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);

        // --- 4. GỌI API LẤY DỮ LIỆU THỰC TẾ ---
        const userId = getTelegramUserId();
        const data = await fetchUserData(userId);

        if (data && data.success) {
            // Hiển thị Tiền tệ & ID
            statusText.setText(
                `👤 ID: ${userId}\n` +
                `💰 VNT: ${data.user_info.vnt.toLocaleString()}\n` +
                `💎 VND: ${data.user_info.vnd.toLocaleString()}`
            );

            // KIỂM TRA VÀ HIỂN THỊ PET ĐANG TRANG BỊ
            if (data.active_pet) {
                let p = data.active_pet;
                
                // Tên và Level
                this.add.text(width / 2, 190, `🦁 ${p.name} (Lv.${p.level})`, { 
                    fontSize: '20px', fill: '#00ffcc', stroke: '#000', strokeThickness: 4 
                }).setOrigin(0.5);
                
                // Thanh Độ Đói
                let hungerColor = p.hunger < 20 ? '#ff0000' : '#00ff00'; // Đỏ nếu sắp chết đói
                this.add.text(width / 2, 220, `❤️ Độ no: ${p.hunger}/100`, { 
                    fontSize: '18px', fill: hungerColor, stroke: '#000', strokeThickness: 3 
                }).setOrigin(0.5);

                // Nút CHO ĂN (Chỉ hiện khi chưa no max)
                if (p.hunger < 100) {
                    let feedBtn = this.add.text(width / 2, 255, "[ 🍖 CHO ĂN - 200 VNT ]", { 
                        fontSize: '18px', backgroundColor: '#006600', padding: 5, stroke: '#000', strokeThickness: 2 
                    }).setOrigin(0.5).setInteractive();
                    
                    feedBtn.on('pointerdown', async () => {
                        feedBtn.setStyle({ backgroundColor: '#003300' });
                        let res = await feedPet(userId);
                        alert(res.message);
                        this.scene.restart(); // Load lại trang để cập nhật số Đói và Tiền
                    });
                }
            } else {
                this.add.text(width / 2, 210, `❌ Chưa có Pet`, { 
                    fontSize: '20px', fill: '#ff0000', stroke: '#000', strokeThickness: 4 
                }).setOrigin(0.5);
            }

        } else {
            statusText.setText("❌ Lỗi kết nối máy chủ Python!");
            statusText.setColor('#ff0000');
        }

        // ==========================================
        // --- 5. VẼ CÁC NÚT ĐIỀU HƯỚNG CHÍNH ---
        // ==========================================
        let startY = 320; // Bắt đầu vẽ nút từ tọa độ này để không bị đè lên thông tin Pet

        // NÚT ĐI SĂN
        let huntBtn = this.add.text(width / 2, startY, "[ ⚔️ ĐI SĂN ]", { 
            fontSize: '24px', fontStyle: 'bold', fill: '#ffffff', backgroundColor: '#8b0000', padding: 10, stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setInteractive();
        huntBtn.on('pointerdown', () => this.scene.start('HuntScene', { userId: userId, userData: data }));

        // NÚT CHUỒNG PET
        let petBtn = this.add.text(width / 2, startY + 55, "[ 🦁 CHUỒNG PET ]", { 
            fontSize: '20px', fontStyle: 'bold', fill: '#fff', backgroundColor: '#00008b', padding: 8, stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setInteractive();
        petBtn.on('pointerdown', () => this.scene.start('PetScene', { userId: userId }));

        // NÚT TÚI ĐỒ (INVENTORY)
        let invBtn = this.add.text(width / 2, startY + 105, "[ 🎒 TÚI ĐỒ ]", { 
            fontSize: '20px', fontStyle: 'bold', fill: '#fff', backgroundColor: '#555500', padding: 8, stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setInteractive();
        invBtn.on('pointerdown', () => this.scene.start('InventoryScene', { userId: userId }));

        // NÚT LÒ RÈN (CRAFT)
        let craftBtn = this.add.text(width / 2, startY + 155, "[ 🔥 LÒ RÈN ]", { 
            fontSize: '20px', fontStyle: 'bold', fill: '#fff', backgroundColor: '#aa3300', padding: 8, stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setInteractive();
        craftBtn.on('pointerdown', () => this.scene.start('CraftScene', { userId: userId }));

        // NÚT CHỢ ĐEN (MARKET)
        let marketBtn = this.add.text(width / 2, startY + 205, "[ ⚖️ CHỢ ĐEN ]", { 
            fontSize: '20px', fontStyle: 'bold', fill: '#fff', backgroundColor: '#004444', padding: 8, stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setInteractive();
        marketBtn.on('pointerdown', () => this.scene.start('MarketScene', { userId: userId }));

        // 🆕 NÚT TÀI CHÍNH (FINANCE) - MỚI THÊM
        let financeBtn = this.add.text(width / 2, startY + 255, "[ 💸 TÀI CHÍNH ]", { 
            fontSize: '20px', fontStyle: 'bold', fill: '#fff', backgroundColor: '#006600', padding: 8, stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setInteractive();
        financeBtn.on('pointerdown', () => this.scene.start('FinanceScene', { userId: userId }));

        // --- 6. NÚT ADMIN TÀNG HÌNH (ID nhận diện sếp) ---
        const ADMIN_IDS = [6877673260]; 
        if (ADMIN_IDS.includes(userId)) {
            let adminBtn = this.add.text(width - 10, 10, "🛠", { 
                fontSize: '24px', backgroundColor: '#aa0000', padding: 5 
            }).setOrigin(1, 0).setInteractive();

            adminBtn.on('pointerdown', () => {
                this.scene.start('AdminScene', { userId: userId });
            });
        }
    }

    update() {}
}