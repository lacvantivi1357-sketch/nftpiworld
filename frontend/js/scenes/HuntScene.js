class HuntScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HuntScene' });
    }

    // Nhận dữ liệu (userId và userData) từ MenuScene truyền sang
    init(data) {
        this.userId = data.userId;
        this.userData = data.userData; // Lấy nguyên cục data từ Menu sang để biết Pet nào đang active
    }

    // Tải hình ảnh trước khi vẽ
    preload() {
        // Tạm thời chưa có ảnh, ta dùng các hình khối mặc định của Phaser để game chạy mượt
        // Sếp có thể thay 'assets/xxx.png' thật vào sau khi đã chuẩn bị xong ảnh
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. Vẽ Ảnh Nền (Tạm dùng màu khối cho nhẹ)
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a2b1a); // Nền rừng rậm

        // 2. Tiêu đề
        this.add.text(width / 2, 40, "⚔️ KHU RỪNG ĐEN", { 
            fontSize: '28px', fontStyle: 'bold', fill: '#00ffcc', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5);

        // 3. HIỂN THỊ PET VÀ CHỈ SỐ
        if (this.userData && this.userData.active_pet) {
            let p = this.userData.active_pet;
            
            // Vẽ "avatar" thú cưng bằng hình chữ nhật tạm
            let myPet = this.add.rectangle(width / 2, height - 120, 80, 80, 0x8b4513);
            
            // Tên và Exp
            this.add.text(width / 2, height - 180, `${p.name} (Lv.${p.level})`, { 
                fontSize: '20px', fill: '#fff', fontStyle: 'bold' 
            }).setOrigin(0.5);

            this.add.text(width / 2, height - 60, `⚡ Lượt săn: ${p.turns_total - p.turns_used}/${p.turns_total}`, { 
                fontSize: '16px', fill: '#ffcc00' 
            }).setOrigin(0.5);

            // Tạo hiệu ứng lơ lửng cho Pet
            this.tweens.add({
                targets: myPet, y: height - 135, duration: 1000, yoyo: true, repeat: -1
            });
        } else {
            // Nếu vô tình lọt vào đây mà chưa có Pet
            this.add.text(width / 2, height - 120, "❌ Chưa trang bị Pet!", { 
                fontSize: '20px', fill: '#ff0000', fontStyle: 'bold' 
            }).setOrigin(0.5);
        }

        // 4. VẼ 4 HANG ĐỘNG
        const caves = [
            { id: 1, x: width / 4, y: height / 2 - 50, color: 0x333333 },
            { id: 2, x: (width / 4) * 3, y: height / 2 - 50, color: 0x333333 },
            { id: 3, x: width / 4, y: height / 2 + 80, color: 0x333333 },
            { id: 4, x: (width / 4) * 3, y: height / 2 + 80, color: 0x333333 }
        ];

        this.isHunting = false; // Khóa nút để chống bấm liên tục spam API

        caves.forEach(cave => {
            // Hộp hang động
            let caveBox = this.add.rectangle(cave.x, cave.y, 100, 80, cave.color).setInteractive();
            caveBox.setStrokeStyle(3, 0xffaa00);
            
            // Số hang
            let txt = this.add.text(cave.x, cave.y, `Hang ${cave.id}`, { 
                fontSize: '20px', fontStyle: 'bold', fill: '#fff' 
            }).setOrigin(0.5);

            caveBox.on('pointerdown', async () => {
                // Kiểm tra xem có đang săn hay không, tránh bấm 2 hang cùng lúc
                if (this.isHunting) return;
                this.isHunting = true;

                caveBox.fillColor = 0xff0000; // Đổi sang đỏ
                
                let infoText = this.add.text(width/2, height/2, "⏳ Đang đào...", {
                    fontSize: '24px', backgroundColor: '#000', padding: 10
                }).setOrigin(0.5);
                
                // GỌI THẲNG LÊN MÁY CHỦ PYTHON
                let result = await huntTreasure(this.userId, cave.id);
                
                infoText.destroy();
                caveBox.fillColor = cave.color; // Trả lại màu cũ
                this.isHunting = false; // Mở khóa nút

                // Hiện Popup kết quả đẹp mắt thay vì dùng alert chói mắt
                this.showResultPopup(width, height, result);
            });
        });

        // 5. Nút Quay Lại
        let backBtn = this.add.text(20, 20, "⬅ MENU", { 
            fontSize: '18px', backgroundColor: '#333', padding: 8 
        }).setInteractive();
        
        backBtn.on('pointerdown', () => {
            this.scene.start('MenuScene'); // Về lại Menu
        });
    }

    // Hàm tạo Popup thông báo kết quả xịn xò trong game
    showResultPopup(width, height, result) {
        let bg = this.add.rectangle(width/2, height/2, width * 0.8, 150, 0x000000, 0.9);
        bg.setStrokeStyle(2, result.success ? 0x00ff00 : 0xff0000); // Viền xanh nếu ăn, đỏ nếu xịt

        let txt = this.add.text(width/2, height/2, result.message, { 
            fontSize: '18px', fill: '#fff', align: 'center', wordWrap: { width: width * 0.7 } 
        }).setOrigin(0.5);

        // Bấm vào popup để tắt nó đi
        bg.setInteractive();
        bg.on('pointerdown', () => {
            bg.destroy();
            txt.destroy();
            // Nếu đi săn thành công (hoặc hết thể lực), load lại Menu để cập nhật máu/thể lực
            if (result.message.includes("hết lượt") || result.message.includes("quá đói")) {
                this.scene.start('MenuScene');
            }
        });

        // Tự động tắt sau 3 giây
        this.time.delayedCall(3000, () => {
            if (bg.active) { bg.destroy(); txt.destroy(); }
        });
    }
}