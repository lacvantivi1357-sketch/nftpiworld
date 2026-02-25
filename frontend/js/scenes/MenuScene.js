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
        this.add.text(width / 2, 60, "🏰 EMPIRE V86", { 
            fontSize: '36px', 
            fontStyle: 'bold', 
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);

        // --- 3. VẼ CHỮ TRẠNG THÁI (LOADING) ---
        let statusText = this.add.text(width / 2, 140, "⏳ Đang tải dữ liệu...", { 
            fontSize: '20px', 
            fill: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 4
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
                this.add.text(width / 2, 220, `🦁 ${p.name} (Lv.${p.level})`, { 
                    fontSize: '22px', fill: '#00ffcc', stroke: '#000', strokeThickness: 4 
                }).setOrigin(0.5);
                
                // Thanh Độ Đói
                let hungerColor = p.hunger < 20 ? '#ff0000' : '#00ff00'; // Đỏ nếu sắp chết đói
                this.add.text(width / 2, 250, `❤️ Độ no: ${p.hunger}/100`, { 
                    fontSize: '18px', fill: hungerColor, stroke: '#000', strokeThickness: 3 
                }).setOrigin(0.5);

                // Nút CHO ĂN (Chỉ hiện khi chưa no max)
                if (p.hunger < 100) {
                    let feedBtn = this.add.text(width / 2, 290, "[ 🍖 CHO ĂN - 200 VNT ]", { 
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
                this.add.text(width / 2, 230, `❌ Chưa có Pet`, { 
                    fontSize: '20px', fill: '#ff0000', stroke: '#000', strokeThickness: 4 
                }).setOrigin(0.5);
            }

        } else {
            statusText.setText("❌ Lỗi kết nối máy chủ Python!");
            statusText.setColor('#ff0000');
        }

        // ==========================================
        // --- VẼ CÁC NÚT ĐIỀU HƯỚNG CHÍNH ---
        // ==========================================

        // NÚT ĐI SĂN
        let huntBtn = this.add.text(width / 2, height - 290, "[ ⚔️ ĐI SĂN ]", { 
            fontSize: '28px', fontStyle: 'bold', fill: '#ffffff', 
            backgroundColor: '#8b0000', padding: 10, stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setInteractive();

        huntBtn.on('pointerdown', () => { 
            huntBtn.setStyle({ backgroundColor: '#5a0000' });
            // Truyền userId và userData sang HuntScene
            this.scene.start('HuntScene', { userId: userId, userData: data }); 
        });
        huntBtn.on('pointerup', () => { huntBtn.setStyle({ backgroundColor: '#8b0000' }); });

        // NÚT CHUỒNG PET
        let petBtn = this.add.text(width / 2, height - 230, "[ 🦁 CHUỒNG PET ]", { 
            fontSize: '24px', fontStyle: 'bold', fill: '#fff', 
            backgroundColor: '#00008b', padding: 10, stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setInteractive();

        petBtn.on('pointerdown', () => { 
            petBtn.setStyle({ backgroundColor: '#000055' });
            this.scene.start('PetScene', { userId: userId }); 
        });
        petBtn.on('pointerup', () => { petBtn.setStyle({ backgroundColor: '#00008b' }); });

        // NÚT TÚI ĐỒ (INVENTORY)
        let invBtn = this.add.text(width / 2, height - 170, "[ 🎒 TÚI ĐỒ ]", { 
            fontSize: '24px', fontStyle: 'bold', fill: '#fff', 
            backgroundColor: '#555500', padding: 10, stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setInteractive();

        invBtn.on('pointerdown', () => { 
            invBtn.setStyle({ backgroundColor: '#333300' });
            this.scene.start('InventoryScene', { userId: userId }); 
        });
        invBtn.on('pointerup', () => { invBtn.setStyle({ backgroundColor: '#555500' }); });

        // NÚT LÒ RÈN (CRAFT)
        let craftBtn = this.add.text(width / 2, height - 110, "[ 🔥 LÒ RÈN ]", { 
            fontSize: '24px', fontStyle: 'bold', fill: '#fff', 
            backgroundColor: '#aa3300', padding: 10, stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setInteractive();

        craftBtn.on('pointerdown', () => { 
            craftBtn.setStyle({ backgroundColor: '#551100' });
            this.scene.start('CraftScene', { userId: userId }); 
        });
        craftBtn.on('pointerup', () => { craftBtn.setStyle({ backgroundColor: '#aa3300' }); });

        // NÚT CHỢ ĐEN (MARKET)
        let marketBtn = this.add.text(width / 2, height - 50, "[ ⚖️ CHỢ ĐEN ]", { 
            fontSize: '24px', fontStyle: 'bold', fill: '#fff', 
            backgroundColor: '#004444', padding: 10, stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setInteractive();

        marketBtn.on('pointerdown', () => { 
            marketBtn.setStyle({ backgroundColor: '#002222' });
            this.scene.start('MarketScene', { userId: userId }); 
        });
        marketBtn.on('pointerup', () => { marketBtn.setStyle({ backgroundColor: '#004444' }); });
    }

    update() {}
}