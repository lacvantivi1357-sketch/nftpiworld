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

        // Vẽ nền tối màu lò rèn
        let bg = this.add.image(width / 2, height / 2, 'bg_menu');
        bg.setDisplaySize(width, height);
        bg.setTint(0x442200); // Ám màu cam đỏ của lửa

        this.add.text(width / 2, 40, "🔥 LÒ RÈN THẦN BÍ", { 
            fontSize: '32px', fontStyle: 'bold', fill: '#ffcc00', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5);

        // Danh sách công thức (Cứng theo Backend)
        const recipes = [
            { target: "Sat", req: "Rac", amt: 10, name: "Sắt", reqName: "Rác", icon: "⚙️" },
            { target: "Dong", req: "Sat", amt: 100, name: "Đồng", reqName: "Sắt", icon: "🥉" },
            { target: "Bac", req: "Dong", amt: 9, name: "Bạc", reqName: "Đồng", icon: "🥈" },
            { target: "Vang", req: "Bac", amt: 12, name: "Vàng", reqName: "Bạc", icon: "🥇" },
            { target: "KimCuong", req: "Vang", amt: 102, name: "Kim Cương", reqName: "Vàng", icon: "💎" },
            { target: "DaQuy", req: "KimCuong", amt: 11, name: "Đá Quý", reqName: "Kim Cương", icon: "🔮" }
        ];

        let startY = 120;
        
        recipes.forEach((rec, index) => {
            let yPos = startY + (index * 80);

            // Khung chứa công thức
            this.add.rectangle(width / 2, yPos, width - 40, 70, 0x000000, 0.7).setStrokeStyle(2, 0xff5500);

            // Text công thức
            let textFormula = `${rec.amt} ${rec.reqName} ➔ 1 ${rec.icon} ${rec.name}`;
            this.add.text(40, yPos, textFormula, { fontSize: '20px', fill: '#fff' }).setOrigin(0, 0.5);

            // Nút "Rèn"
            let craftBtn = this.add.text(width - 40, yPos, "[ RÈN ]", { 
                fontSize: '20px', fontStyle: 'bold', fill: '#fff', backgroundColor: '#aa0000', padding: 8, stroke: '#000', strokeThickness: 2
            }).setOrigin(1, 0.5).setInteractive();

            craftBtn.on('pointerdown', async () => {
                craftBtn.setStyle({ backgroundColor: '#550000' });
                
                // Bật popup để người chơi nhập số lượng muốn rèn
                let qtyStr = window.prompt(`Nhập số lượng ${rec.name} muốn rèn:`, "1");
                let qty = parseInt(qtyStr);

                if (!isNaN(qty) && qty > 0) {
                    let res = await craftItem(this.userId, rec.target, qty);
                    alert(res.message);
                } else if (qtyStr !== null) {
                    alert("⚠️ Số lượng không hợp lệ!");
                }
                
                craftBtn.setStyle({ backgroundColor: '#aa0000' });
            });
        });

        // Nút Quay Lại
        let backBtn = this.add.text(20, 20, "⬅ QUAY LẠI", { fontSize: '18px', backgroundColor: '#333', padding: 8 }).setInteractive();
        backBtn.on('pointerdown', () => { this.scene.start('MenuScene'); });
    }
}