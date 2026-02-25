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

        // Vẽ nền mờ (Tái sử dụng nền menu nhưng tối hơn)
        let bg = this.add.image(width / 2, height / 2, 'bg_menu');
        bg.setDisplaySize(width, height);
        bg.setTint(0x222222);

        this.add.text(width / 2, 40, "🦁 CHUỒNG THÚ CƯNG", { 
            fontSize: '32px', fontStyle: 'bold', fill: '#fff', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5);

        // Nút Mua Pet
        let buyBtn = this.add.text(width / 2, 100, "[ 💳 MUA PET - 50k VND ]", { 
            fontSize: '24px', fill: '#fff', backgroundColor: '#006600', padding: 10, stroke: '#000', strokeThickness: 3 
        }).setOrigin(0.5).setInteractive();

        buyBtn.on('pointerdown', async () => {
            buyBtn.setStyle({ backgroundColor: '#003300' });
            let res = await buyNewPet(this.userId);
            alert(res.message);
            // Mua xong thì load lại cảnh này để thấy pet mới
            this.scene.restart({ userId: this.userId });
        });

        // Tải danh sách Pet
        this.add.text(width / 2, 160, "Đang tải chuồng thú...", { fontSize: '18px', fill: '#aaa' }).setOrigin(0.5);
        
        let petData = await fetchUserPets(this.userId);
        
        // Vẽ danh sách Pet ra màn hình (Dạng lưới)
        if (petData && petData.success && petData.pets.length > 0) {
            // Xóa chữ đang tải
            this.children.list.forEach(c => { if(c.text === "Đang tải chuồng thú...") c.destroy(); });

            let startY = 220;
            petData.pets.forEach((pet, index) => {
                // Tọa độ lưới (2 cột)
                let xPos = (index % 2 === 0) ? width / 4 : (width / 4) * 3;
                let yPos = startY + Math.floor(index / 2) * 180;

                // Khung chứa Pet
                let cardColor = pet.is_active ? 0xaa8800 : 0x444444; // Vàng nếu đang dùng, Xám nếu cất kho
                this.add.rectangle(xPos, yPos, 160, 160, cardColor).setStrokeStyle(3, 0xffffff);

                // Ảnh Pet
                let petImg = this.add.image(xPos, yPos - 20, pet.name).setDisplaySize(80, 80);
                
                // Tên & Level
                this.add.text(xPos, yPos + 30, `${pet.name} (Lv.${pet.level})`, { fontSize: '16px', fill: '#fff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);

                // Nút Trang bị (Chỉ hiện nếu đang không dùng)
                if (pet.is_active === 0) {
                    let equipBtn = this.add.text(xPos, yPos + 60, "▶ TRANG BỊ", { fontSize: '14px', backgroundColor: '#0000aa', padding: 5 }).setOrigin(0.5).setInteractive();
                    equipBtn.on('pointerdown', async () => {
                        let res = await equipPet(this.userId, pet.id);
                        if(res.success) this.scene.restart({ userId: this.userId });
                    });
                } else {
                    this.add.text(xPos, yPos + 60, "✅ ĐANG DÙNG", { fontSize: '14px', fill: '#00ff00', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
                }
            });
        }

        // Nút Quay Lại
        let backBtn = this.add.text(20, 20, "⬅ QUAY LẠI", { fontSize: '18px', backgroundColor: '#333', padding: 8 }).setInteractive();
        backBtn.on('pointerdown', () => { this.scene.start('MenuScene'); });
    }
}