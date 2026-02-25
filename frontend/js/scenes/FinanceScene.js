class FinanceScene extends Phaser.Scene {
    constructor() { super({ key: 'FinanceScene' }); }

    async create() {
        const width = this.cameras.main.width;
        this.add.image(width/2, 300, 'bg_menu').setTint(0x224422);
        this.add.text(width/2, 50, "💸 TRUNG TÂM TÀI CHÍNH", { fontSize: '28px', fill: '#00ff00' }).setOrigin(0.5);

        // NÚT NẠP TIỀN
        let depBtn = this.add.text(width/2, 150, "[ 💎 NẠP CRYPTO ]", { backgroundColor: '#006600', padding: 10 }).setOrigin(0.5).setInteractive();
        depBtn.on('pointerdown', () => {
            let tx = prompt("Dán TxHash giao dịch USDT (BEP20) vào đây:");
            if(tx) alert("Đã gửi đơn nạp! Hệ thống đang check.");
        });

        // NÚT RÚT TIỀN
        let wdBtn = this.add.text(width/2, 250, "[ 🏧 RÚT VỀ ATM/VÍ ]", { backgroundColor: '#660000', padding: 10 }).setOrigin(0.5).setInteractive();
        wdBtn.on('pointerdown', () => {
            let amount = prompt("Nhập số VNT muốn rút:");
            let mode = confirm("Bấm OK để Rút Nhanh (15p, phí 30%)\nBấm Cancel để Rút Thường (7 ngày, 0 phí)") ? "fast" : "normal";
            alert("Yêu cầu rút " + amount + " VNT (" + mode + ") đã được ghi nhận!");
        });

        this.add.text(width/2, 400, "🐢 Rút Thường: Nhận 100%\n⚡ Rút Nhanh: Nhận 70%", { align: 'center' }).setOrigin(0.5);

        let backBtn = this.add.text(20, 20, "⬅️ MENU", { backgroundColor: '#333', padding: 5 }).setInteractive();
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    }
}