class PetScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PetScene' });
    }

    init(data) {
        this.userId = data.userId;
    }

    async create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. VẼ NỀN XANH ĐEN TỐI MÀU (Dùng rectangle cho an toàn, mượt mà)
        this.add.rectangle(width / 2, height / 2, width, height, 0x112233);

        this.add.text(width / 2, 40, "🦁 CHUỒNG THÚ CƯNG", { 
            fontSize: '28px', fontStyle: 'bold', fill: '#ffcc00', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5);

        // 2. NÚT MUA PET
        this.isProcessing = false; // Khóa chống spam click
        let buyBtn = this.add.text(width / 2, 100, "[ 💳 MUA PET - 50K VND ]", { 
            fontSize: '20px', fill: '#fff', backgroundColor: '#006600', padding: 10, stroke: '#000', strokeThickness: 3 
        }).setOrigin(0.5).setInteractive();

        buyBtn.on('pointerdown', async () => {
            if (this.isProcessing) return;
            this.isProcessing = true;
            buyBtn.setStyle({ backgroundColor: '#003300' });
            
            let res = await buyNewPet(this.userId);
            this.showResultPopup(width, height, res, true); // true = load lại scene khi đóng
        });

        // 3. TẢI DANH SÁCH PET
        let loadingText = this.add.text(width / 2, 160, "⏳ Đang tải chuồng thú...", { 
            fontSize: '18px', fill: '#00ffcc' 
        }).setOrigin(0.5);
        
        let petData = await fetchUserPets(this.userId);
        loadingText.destroy(); // Xóa chữ loading gọn gàng
        
        // 4. VẼ LƯỚI PET (Tối đa 5-6 con)
        if (petData && petData.success && petData.pets.length > 0) {
            let startY = 200;
            let cardW = width * 0.45; // Chiều rộng thẻ tự động theo màn hình
            let cardH = 150; // Chiều cao thẻ
            
            petData.pets.forEach((pet, index) => {
                // Tọa độ lưới (2 cột)
                let xPos = (index % 2 === 0) ? width * 0.28 : width * 0.72;
                let yPos = startY + Math.floor(index / 2) * (cardH + 15);

                // Khung chứa Pet (Vàng nếu active, Xám nếu cất kho)
                let cardColor = pet.is_active ? 0x664400 : 0x333333; 
                let borderColor = pet.is_active ? 0xffcc00 : 0x888888;
                
                let card = this.add.rectangle(xPos, yPos, cardW, cardH, cardColor);
                card.setStrokeStyle(3, borderColor);

                // Avatar Pet (Tạm dùng hình khối kết hợp Emoji)
                this.add.rectangle(xPos, yPos - 35, 50, 50, 0x000000, 0.5);
                this.add.text(xPos, yPos - 35, this.getPetEmoji(pet.name), { fontSize: '30px' }).setOrigin(0.5);
                
                // Tên & Level
                this.add.text(xPos, yPos + 5, `${pet.name} (Lv.${pet.level})`, { 
                    fontSize: '16px', fontStyle: 'bold', fill: '#fff' 
                }).setOrigin(0.5);

                // Chỉ số (Thể lực & Đói)
                this.add.text(xPos, yPos + 25, `⚡ ${pet.turns_total - pet.turns_used}/${pet.turns_total} | 🍗 ${pet.hunger}%`, { 
                    fontSize: '14px', fill: pet.hunger < 20 ? '#ff4444' : '#aaaaaa' 
                }).setOrigin(0.5);

                // Nút Trang bị / Trạng thái
                if (pet.is_active === 0) {
                    let equipBtn = this.add.text(xPos, yPos + 55, "▶ TRANG BỊ", { 
                        fontSize: '14px', fontStyle: 'bold', backgroundColor: '#0044aa', padding: 5 
                    }).setOrigin(0.5).setInteractive();
                    
                    equipBtn.on('pointerdown', async () => {
                        let res = await equipPet(this.userId, pet.id);
                        if(res.success) this.scene.restart({ userId: this.userId });
                    });
                } else {
                    this.add.text(xPos, yPos + 55, "✅ ĐANG DÙNG", { 
                        fontSize: '14px', fontStyle: 'bold', fill: '#00ff00' 
                    }).setOrigin(0.5);
                }
            });
        } else {
            this.add.text(width / 2, 250, "🈳 Chuồng trống!\nHãy mua thú cưng để đi săn.", { 
                fontSize: '18px', fill: '#aaaaaa', align: 'center' 
            }).setOrigin(0.5);
        }

        // 5. NÚT QUAY LẠI
        let backBtn = this.add.text(20, 20, "⬅ MENU", { 
            fontSize: '18px', backgroundColor: '#333', padding: 8 
        }).setInteractive();
        backBtn.on('pointerdown', () => { this.scene.start('MenuScene'); });
    }

    // Hàm lấy icon Emoji tự động dựa theo tên Pet
    getPetEmoji(name) {
        const map = { "Chuột": "🐭", "Mèo": "🐱", "Chó": "🐶", "Voi": "🐘", "Sư Tử": "🦁" };
        return map[name] || "🐾";
    }

    // Hàm hiển thị Popup chuyên nghiệp
    showResultPopup(width, height, result, reloadOnClose = false) {
        let bg = this.add.rectangle(width/2, height/2, width * 0.8, 150, 0x000000, 0.9);
        bg.setStrokeStyle(2, result.success ? 0x00ff00 : 0xff0000); 

        let txt = this.add.text(width/2, height/2, result.message, { 
            fontSize: '18px', fill: '#fff', align: 'center', wordWrap: { width: width * 0.7 } 
        }).setOrigin(0.5);

        bg.setInteractive();
        bg.on('pointerdown', () => {
            bg.destroy(); txt.destroy();
            this.isProcessing = false;
            if (reloadOnClose) this.scene.restart({ userId: this.userId });
        });
    }
}