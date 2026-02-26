class FinanceScene extends Phaser.Scene {
    constructor() { super({ key: 'FinanceScene' }); }
    
    init(data) { this.userId = data.userId; } 

    async create() {
        this.width = this.cameras.main.width;
        this.height = this.cameras.main.height;

        this.add.rectangle(this.width/2, this.height/2, this.width, this.height, 0x0a1f0a);
        this.add.text(this.width/2, 40, "💸 TÀI CHÍNH V86", { 
            fontSize: '28px', fontStyle: 'bold', fill: '#00ffcc', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5);

        let loadingTxt = this.add.text(this.width/2, 85, "⏳ Đang đồng bộ...", { fontSize: '14px', fill: '#00ffcc' }).setOrigin(0.5);
        
        // Gọi đồng thời 2 API cho nhanh: Lấy số dư và Lấy Ví Hệ Thống
        let [userData, walletData] = await Promise.all([
            fetchUserData(this.userId), fetchSystemWallets()
        ]);
        
        loadingTxt.destroy();

        this.vntBal = userData?.success ? userData.user_info.vnt : 0; 
        
        this.add.rectangle(this.width/2, 100, this.width * 0.85, 60, 0x000000, 0.6).setStrokeStyle(2, 0x00ffcc);
        this.add.text(this.width/2, 85, `💰 Két: ${(userData?.success ? userData.user_info.vnd : 0).toLocaleString()} VND`, { fontSize: '18px', fontStyle: 'bold', fill: '#fff' }).setOrigin(0.5);
        this.add.text(this.width/2, 115, `⚔️ Ví: ${this.vntBal.toLocaleString()} VNT`, { fontSize: '18px', fontStyle: 'bold', fill: '#ffcc00' }).setOrigin(0.5);

        // ===================================
        // KHU VỰC 1: HƯỚNG DẪN NẠP TIỀN (LẤY TỪ ADMIN)
        // ===================================
        let w = walletData?.success ? walletData.wallets : {};
        
        this.add.rectangle(this.width/2, 240, this.width * 0.9, 180, 0x001100).setStrokeStyle(2, 0x00ff00);
        this.add.text(this.width/2, 165, "--- 📥 THÔNG TIN NẠP TIỀN ---", { fontSize: '16px', fill: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5);
        
        let walletInfo = `🏦 NH: ${w.bank || 'Bảo trì'}\n` + 
                         `📱 Momo/Zalo: ${w.momo || 'Bảo trì'}\n` +
                         `💎 USDT (BEP20): ${w.usdt_bep20 || 'Bảo trì'}\n` +
                         `🔴 TRX/USDT(TRC20): ${w.trx || 'Bảo trì'}\n` +
                         `🔷 TON: ${w.ton || 'Bảo trì'}\n` +
                         `₿ BTC: ${w.btc || 'Bảo trì'}`;

        this.add.text(this.width/2, 240, walletInfo, { fontSize: '12px', fill: '#fff', align: 'left', lineHeight: 1.6 }).setOrigin(0.5);

        let depBtn = this.add.text(this.width/2, 345, "[ BÁO CÁO ĐÃ CHUYỂN TIỀN ]", { fontSize: '18px', fontStyle: 'bold', backgroundColor: '#006600', padding: 10 }).setOrigin(0.5).setInteractive();
        
        depBtn.on('pointerdown', async () => {
            let amount = parseFloat(window.prompt("Nhập số tiền bạn đã chuyển khoản (Quy ra VND):"));
            if (!amount || amount <= 0) return this.showPopup("❌ Số tiền không hợp lệ!", false);

            let network = window.prompt("Bạn đã chuyển qua mạng nào? (VD: BEP20, NH, MOMO...):");
            let tx = window.prompt(`Dán Mã Giao Dịch (TxHash) hoặc Nội Dung CK:`);
            
            if(tx && network) {
                let res = await requestDeposit(this.userId, amount, tx, network);
                this.showPopup(res.message, res.success);
            }
        });

        // ===================================
        // KHU VỰC 2: TẠO LỆNH RÚT ĐA CỔNG
        // ===================================
        this.add.text(this.width/2, 400, "--- 📤 RÚT TIỀN (BÁN VNT) ---", { fontSize: '16px', fill: '#ffaa00', fontStyle: 'bold' }).setOrigin(0.5);

        let wdBtn = this.add.text(this.width/2, 450, "[ TẠO LỆNH RÚT TIỀN ]", { fontSize: '22px', fontStyle: 'bold', backgroundColor: '#8b0000', padding: 12 }).setOrigin(0.5).setInteractive();
        wdBtn.on('pointerdown', () => this.showWithdrawNetworkPopup());

        let backBtn = this.add.text(15, 15, "⬅ MENU", { fontSize: '16px', backgroundColor: '#333', padding: 8 }).setInteractive();
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    }

    // ==========================================
    // BẢNG 1: CHỌN MẠNG RÚT TIỀN
    // ==========================================
    showWithdrawNetworkPopup() {
        let overlay = this.add.rectangle(this.width/2, this.height/2, this.width, this.height, 0x000000, 0.95).setInteractive();
        let panel = this.add.rectangle(this.width/2, this.height/2, this.width * 0.95, 300, 0x111111).setStrokeStyle(3, 0xffcc00);

        let title = this.add.text(this.width/2, this.height/2 - 120, "🌐 CHỌN CỔNG NHẬN TIỀN", { fontSize: '20px', fontStyle: 'bold', fill: '#ffcc00' }).setOrigin(0.5);
        let uiElements = [overlay, panel, title];

        const createNetBtn = (x, y, text, color, networkName) => {
            let btn = this.add.text(x, y, text, { fontSize: '14px', fontStyle: 'bold', backgroundColor: color, padding: 10, fixedWidth: 150, align: 'center' }).setOrigin(0.5).setInteractive();
            btn.on('pointerdown', () => {
                uiElements.forEach(el => el.destroy());
                this.processWithdrawal(networkName); 
            });
            uiElements.push(btn);
        };

        // Cột 1 (Trái)
        createNetBtn(this.width/2 - 80, this.height/2 - 60, "USDT/USDC(BEP20)", '#cca300', 'BEP20');
        createNetBtn(this.width/2 - 80, this.height/2 - 10, "TRX/USDT (TRC20)", '#cc0000', 'TRC20');
        createNetBtn(this.width/2 - 80, this.height/2 + 40, "TON Network", '#0066cc', 'TON');

        // Cột 2 (Phải)
        createNetBtn(this.width/2 + 80, this.height/2 - 60, "Bitcoin (BTC)", '#d48806', 'BTC');
        createNetBtn(this.width/2 + 80, this.height/2 - 10, "Ngân hàng", '#006600', 'BANK');
        createNetBtn(this.width/2 + 80, this.height/2 + 40, "Ví Điện Tử", '#aa0055', 'E-WALLET');

        let cancelBtn = this.add.text(this.width/2, this.height/2 + 110, "[ HỦY BỎ ]", { fontSize: '14px', fill: '#aaa' }).setOrigin(0.5).setInteractive();
        cancelBtn.on('pointerdown', () => uiElements.forEach(el => el.destroy()));
        uiElements.push(cancelBtn);
    }

    // ==========================================
    // BƯỚC 2: NHẬP SỐ LƯỢNG & ĐỊA CHỈ
    // ==========================================
    processWithdrawal(network) {
        let amount = parseFloat(window.prompt(`Số dư của bạn: ${this.vntBal.toLocaleString()} VNT\nNhập số VNT muốn rút:`));
        if (!amount || amount <= 0 || amount > this.vntBal) return this.showPopup("❌ Số lượng VNT không hợp lệ!", false);

        let address = window.prompt(`Dán địa chỉ nhận tiền (${network}) của bạn vào đây:\n(Với Ngân hàng hãy nhập Tên NH - STK - Tên)` );
        if (!address) return this.showPopup("❌ Bạn chưa nhập địa chỉ nhận tiền!", false);

        this.showWithdrawSpeedPopup(amount, `[${network}] - ${address}`);
    }

    // ==========================================
    // BƯỚC 3: CHỌN TỐC ĐỘ RÚT (NHANH/THƯỜNG)
    // ==========================================
    showWithdrawSpeedPopup(amount, info) {
        let overlay = this.add.rectangle(this.width/2, this.height/2, this.width, this.height, 0x000000, 0.9).setInteractive();
        let panel = this.add.rectangle(this.width/2, this.height/2, this.width * 0.9, 240, 0x111111).setStrokeStyle(3, 0xffcc00);

        let title = this.add.text(this.width/2, this.height/2 - 90, "⚙️ CHỌN TỐC ĐỘ RÚT", { fontSize: '20px', fontStyle: 'bold', fill: '#ffcc00' }).setOrigin(0.5);
        let subtitle = this.add.text(this.width/2, this.height/2 - 50, `Đang rút: ${amount.toLocaleString()} VNT`, { fontSize: '16px', fill: '#fff' }).setOrigin(0.5);

        let uiElements = [overlay, panel, title, subtitle];

        const createModeBtn = (y, text, color, mode) => {
            let btn = this.add.text(this.width/2, y, text, { fontSize: '16px', fontStyle: 'bold', backgroundColor: color, padding: 10, align: 'center' }).setOrigin(0.5).setInteractive();
            btn.on('pointerdown', async () => {
                uiElements.forEach(el => el.destroy());
                let res = await requestWithdraw(this.userId, amount, mode, info);
                this.showPopup(res.message, res.success);
            });
            uiElements.push(btn);
        };

        createModeBtn(this.height/2 - 5, `⚡ RÚT NHANH (-30% Phí)\nNhận: ${(amount * 0.7).toLocaleString()} VND`, '#8b0000', 'fast');
        createModeBtn(this.height/2 + 65, `🐢 RÚT THƯỜNG (Miễn phí)\nNhận: ${amount.toLocaleString()} VND`, '#0044aa', 'normal');

        let cancelBtn = this.add.text(this.width/2, this.height/2 + 120, "[ HỦY BỎ ]", { fontSize: '14px', fill: '#aaa' }).setOrigin(0.5).setInteractive();
        cancelBtn.on('pointerdown', () => uiElements.forEach(el => el.destroy()));
        uiElements.push(cancelBtn);
    }

    // ==========================================
    // POPUP THÔNG BÁO CHUNG
    // ==========================================
    showPopup(message, isSuccess) {
        let bg = this.add.rectangle(this.width/2, this.height/2, this.width * 0.85, 160, 0x000000, 0.95).setInteractive();
        bg.setStrokeStyle(2, isSuccess ? 0x00ff00 : 0xff0000); 
        let txt = this.add.text(this.width/2, this.height/2, message, { fontSize: '16px', fill: '#fff', align: 'center', wordWrap: { width: this.width * 0.8 } }).setOrigin(0.5);

        bg.on('pointerdown', () => {
            bg.destroy(); txt.destroy();
            if (isSuccess) this.scene.restart(); // Load lại để update số dư
        });
    }
}