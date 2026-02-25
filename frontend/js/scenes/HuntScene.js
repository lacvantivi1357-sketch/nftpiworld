class HuntScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HuntScene' });
    }

    // Nhận dữ liệu (userId) từ MenuScene truyền sang
    init(data) {
        this.userId = data.userId;
    }

    // Tải hình ảnh trước khi vẽ
    preload() {
        this.load.image('bg_cave', 'assets/bg_cave.jpg');
        
        // 2. Tải ảnh Pet. 
        // Cú pháp: this.load.image('Tên_Trong_Database', 'Đường_dẫn_tới_file_ảnh');
        this.load.image('Chuột', 'assets/chuot.png');
        this.load.image('Mèo', 'assets/meo.png');
        this.load.image('Chó', 'assets/cho.png');
        this.load.image('Voi', 'assets/voi.png');
        this.load.image('Sư Tử', 'assets/sutu.png');
        
        // Ảnh mặc định nếu người chơi chưa có Pet hoặc bị lỗi
        this.load.image('default_pet', 'assets/chuot.png');
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. Vẽ Ảnh Nền
        let bg = this.add.image(width / 2, height / 2, 'bg_cave');
        bg.setDisplaySize(width, height); // Ép ảnh vừa màn hình
        bg.setAlpha(0.6); // Làm tối ảnh nền đi một chút (mờ 60%)

        // 2. Tiêu đề
        this.add.text(width / 2, 40, "ĐẤT THÁNH SĂN BẮT", { fontSize: '28px', fontStyle: 'bold', fill: '#fff' }).setOrigin(0.5);

        // 3. Vẽ Ảnh Pet ở giữa dưới màn hình
        let myPet = this.add.image(width / 2, height - 150, 'pet');
        myPet.setScale(0.8); // Chỉnh kích thước Pet

        // Tạo hiệu ứng thú cưng lơ lửng nhịp nhàng (Animation mượt mà)
        this.tweens.add({
            targets: myPet,
            y: height - 165,
            duration: 1000,
            yoyo: true,
            repeat: -1 // Lặp vô hạn
        });

        // 4. Vẽ 4 Hang Động để người chơi bấm (Mô phỏng 4 nút)
        const caves = [
            { id: 1, x: width / 4, y: height / 2 - 50 },
            { id: 2, x: (width / 4) * 3, y: height / 2 - 50 },
            { id: 3, x: width / 4, y: height / 2 + 80 },
            { id: 4, x: (width / 4) * 3, y: height / 2 + 80 }
        ];

        caves.forEach(cave => {
            // Vẽ hộp hang động
            let caveBox = this.add.rectangle(cave.x, cave.y, 100, 80, 0x333333).setInteractive();
            caveBox.setStrokeStyle(2, 0xffaa00); // Viền vàng
            
            // Chữ trong hang
            this.add.text(cave.x, cave.y, `Hang ${cave.id}`, { fontSize: '18px', fill: '#fff' }).setOrigin(0.5);

            // Sự kiện khi bấm vào Hang
            caveBox.on('pointerdown', async () => {
                caveBox.fillColor = 0xff0000; // Đổi màu đỏ khi bấm
                
                // Hiển thị text Đang đào...
                let infoText = this.add.text(width/2, height/2, "⏳ Đang khám phá...", {fontSize: '24px', backgroundColor: '#000'}).setOrigin(0.5);
                
                // [API] Gọi Backend xử lý rớt đồ ở đây
                let result = await this.huntApi(cave.id);
                
                // Xóa text đang đào và hiện kết quả
                infoText.destroy();
                alert(result.message); // Hiện popup kết quả (Sẽ làm đồ họa rơi đồ sau)
                
                caveBox.fillColor = 0x333333; // Trả lại màu cũ
            });
        });

        // 5. Nút Quay Lại
        let backBtn = this.add.text(20, 20, "⬅ QUAY LẠI", { fontSize: '18px', fill: '#ff0' }).setInteractive();
        backBtn.on('pointerdown', () => {
            this.scene.start('MenuScene'); // Về lại Menu
        });
    }

    // Hàm gọi API Backend (Giả lập trước, bài sau ta code Backend thật)
    async huntApi(caveId) {
        // Gọi hàm huntTreasure từ api.js (Gọi thẳng lên Python Backend)
        return await huntTreasure(this.userId, caveId);
    }
}