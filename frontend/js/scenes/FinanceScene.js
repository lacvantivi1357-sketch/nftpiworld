class FinanceScene extends Phaser.Scene {
    constructor() { super({ key: 'FinanceScene' }); }
    
    // ⚠️ QUAN TRỌNG: Nhận ID của người chơi từ Menu truyền sang để API biết ai đang rút tiền
    init(data) { this.userId = data.userId; } 

    async create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.add.image(width/2, height/2, 'bg_menu').setTint(0x224422);
        this.add.text(width/2, 60, "💸 TÀI CHÍNH V86", { 
            fontSize: '32px', fontStyle: 'bold', fill: '#00ffcc', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5);

        // ===================================
        // 1. NÚT NẠP TIỀN (ĐÃ NỐI API)
        // ===================================
        let depBtn = this.add.text(width/2, 180, "[ 💎 NẠP CRYPTO ]", { 
            fontSize: '24px', fontStyle: 'bold', backgroundColor: '#006600', padding: 12, stroke: '#000', strokeThickness: 3 
        }).setOrigin(0.5).setInteractive();
        
        depBtn.on('pointerdown', async () => {
            depBtn.setStyle({ backgroundColor: '#004400' });
            
            let amountStr = prompt("Nhập số tiền bạn đã chuyển (VND):");
            let amount = parseFloat(amountStr);
            if (!amount || amount <= 0) {
                depBtn.setStyle({ backgroundColor: '#006600' });
                return alert("❌ Số tiền không hợp lệ!");
            }

            let tx = prompt("Dán Mã Giao Dịch (TxHash) mạng USDT BEP20 vào đây:");
            if(tx) {
                // Gọi thẳng API nạp tiền trên Python
                let res = await requestDeposit(this.userId, amount, tx, "USDT");
                alert(res.message);
            }
            depBtn.setStyle({ backgroundColor: '#006600' });
        });

        // ===================================
        // 2. NÚT RÚT TIỀN (ĐÃ NỐI API)
        // ===================================
        let wdBtn = this.add.text(width/2, 280, "[ 🏧 RÚT VỀ ATM ]", { 
            fontSize: '24px', fontStyle: 'bold', backgroundColor: '#8b0000', padding: 12, stroke: '#000', strokeThickness: 3 
        }).setOrigin(0.5).setInteractive();
        
        wdBtn.on('pointerdown', async () => {
            wdBtn.setStyle({ backgroundColor: '#550000' });

            let amountStr = prompt("Nhập số VNT muốn rút:");
            let amount = parseFloat(amountStr);
            if (!amount || amount <= 0) {
                wdBtn.setStyle({ backgroundColor: '#8b0000' });
                return alert("❌ Số lượng VNT không hợp lệ!");
            }

            let info = prompt("Nhập thông tin Ngân hàng:\n(Ví dụ: Vietcombank - 123456 - NGUYEN VAN A)");
            if (!info) {
                wdBtn.setStyle({ backgroundColor: '#8b0000' });
                return alert("❌ Bạn chưa nhập thông tin nhận tiền!");
            }

            let mode = confirm("CHỌN TỐC ĐỘ RÚT:\n\n👉 Bấm OK: Rút Nhanh (15p) - Phí 30%\n👉 Bấm Cancel: Rút Thường (7 ngày) - Miễn phí") ? "fast" : "normal";
            
            // Gọi thẳng API rút tiền (Kiểm tra số dư, trừ tiền, lưu database)
            let res = await requestWithdraw(this.userId, amount, mode, info);
            alert(res.message); // Báo lỗi nếu hết tiền, hoặc báo thành công
            
            wdBtn.setStyle({ backgroundColor: '#8b0000' });
        });

        this.add.text(width/2, 380, "🐢 Rút Thường: Nhận 100%\n⚡ Rút Nhanh: Nhận 70%", { 
            fontSize: '18px', fill: '#aaa', align: 'center', stroke: '#000', strokeThickness: 2 
        }).setOrigin(0.5);

        // Nút quay lại Menu
        let backBtn = this.add.text(20, 20, "⬅️ MENU", { 
            fontSize: '18px', backgroundColor: '#333', padding: 8 
        }).setInteractive();
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    }
}