class AdminScene extends Phaser.Scene {
    constructor() { super({ key: 'AdminScene' }); }
    
    init(data) { this.adminId = data.userId; }

    create() {
        this.width = this.cameras.main.width;
        this.height = this.cameras.main.height;

        // Nền đen quyền lực
        this.add.rectangle(this.width/2, this.height/2, this.width, this.height, 0x110000, 0.98);
        this.add.text(this.width/2, 40, "🛠 TRUNG TÂM KIỂM SOÁT", { 
            fontSize: '24px', fontStyle: 'bold', fill: '#ff4444', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5);

        // BỐ TRÍ 4 TAB QUẢN LÝ
        let userTab = this.add.text(this.width/2 - 120, 90, "[ TÌM ID ]", { fontSize: '13px', backgroundColor: '#444', padding: 8 }).setOrigin(0.5).setInteractive();
        let depTab  = this.add.text(this.width/2 - 40, 90, "[ NẠP ]", { fontSize: '13px', backgroundColor: '#444', padding: 8 }).setOrigin(0.5).setInteractive();
        let wdTab   = this.add.text(this.width/2 + 40, 90, "[ RÚT ]", { fontSize: '13px', backgroundColor: '#444', padding: 8 }).setOrigin(0.5).setInteractive();
        let walletTab = this.add.text(this.width/2 + 120, 90, "[ CÀI VÍ ]", { fontSize: '13px', backgroundColor: '#444', padding: 8 }).setOrigin(0.5).setInteractive();

        this.contentGroup = this.add.group();

        const resetTabs = () => {
            [userTab, depTab, wdTab, walletTab].forEach(t => t.setStyle({ fill: '#fff', backgroundColor: '#444' }));
        };

        userTab.on('pointerdown', () => { resetTabs(); userTab.setStyle({ fill: '#00ffcc', backgroundColor: '#222' }); this.showUserSearch(); });
        depTab.on('pointerdown', () => { resetTabs(); depTab.setStyle({ fill: '#00ffcc', backgroundColor: '#222' }); this.showDeposits(); });
        wdTab.on('pointerdown', () => { resetTabs(); wdTab.setStyle({ fill: '#00ffcc', backgroundColor: '#222' }); this.showWithdrawals(); });
        walletTab.on('pointerdown', () => { resetTabs(); walletTab.setStyle({ fill: '#00ffcc', backgroundColor: '#222' }); this.showWalletSettings(); });

        let backBtn = this.add.text(15, 15, "⬅ MENU", { backgroundColor: '#333', padding: 8 }).setInteractive();
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

        // Mặc định vào tab cài ví để sếp test
        walletTab.emit('pointerdown'); 
    }

    // ==========================================
    // TAB 1: CÀI ĐẶT VÍ ADMIN
    // ==========================================
    async showWalletSettings() {
        this.contentGroup.clear(true, true);
        this.contentGroup.add(this.add.text(this.width/2, 160, "⏳ Đang tải cấu hình...", { fill: '#ffcc00' }).setOrigin(0.5));
        
        let res = await fetchSystemWallets();
        this.contentGroup.clear(true, true);

        let w = res.success ? res.wallets : {};
        let currentWallets = { ...w }; 

        this.contentGroup.add(this.add.text(this.width/2, 140, "Bấm vào từng cổng để thay đổi địa chỉ nhận tiền:", { fontSize: '14px', fill: '#ccc' }).setOrigin(0.5));

        const walletTypes = [
            { key: 'bank', name: '🏦 Ngân hàng', color: '#005500' },
            { key: 'momo', name: '📱 Ví Momo/Zalo', color: '#aa0055' },
            { key: 'usdt_bep20', name: '💎 USDT/USDC (BEP20)', color: '#cca300' },
            { key: 'trx', name: '🔴 TRX (TRC20)', color: '#aa0000' },
            { key: 'ton', name: '🔷 TON Network', color: '#0066cc' },
            { key: 'btc', name: '₿ Bitcoin (BTC)', color: '#d48806' }
        ];

        let startY = 190;
        walletTypes.forEach((wt, i) => {
            let btn = this.add.text(this.width/2, startY + (i * 45), `[ ${wt.name} ]\n${currentWallets[wt.key] || 'Chưa cài'}`, { 
                fontSize: '12px', align: 'center', backgroundColor: wt.color, padding: 5, fixedWidth: this.width * 0.8 
            }).setOrigin(0.5).setInteractive();

            btn.on('pointerdown', () => {
                // Thay alert mặc định bằng window.prompt (chấp nhận được cho cấu hình Admin)
                let newVal = window.prompt(`Nhập địa chỉ nhận tiền cho ${wt.name}:`, currentWallets[wt.key] || "");
                if (newVal !== null) {
                    currentWallets[wt.key] = newVal;
                    btn.setText(`[ ${wt.name} ]\n${newVal}`);
                }
            });
            this.contentGroup.add(btn);
        });

        // Nút Lưu Cấu Hình
        let saveBtn = this.add.text(this.width/2, startY + (6 * 45) + 20, "[ 💾 LƯU TẤT CẢ ]", { 
            fontSize: '18px', fontStyle: 'bold', backgroundColor: '#0000aa', padding: 10 
        }).setOrigin(0.5).setInteractive();

        saveBtn.on('pointerdown', async () => {
            saveBtn.setText("⏳ Đang lưu...");
            let r = await adminUpdateWallets(this.adminId, currentWallets);
            this.showPopup(this.width, this.height, r.message);
            saveBtn.setText("[ 💾 LƯU TẤT CẢ ]");
        });
        this.contentGroup.add(saveBtn);
    }

    // ==========================================
    // TAB 2: TÌM KIẾM USER (Sửa tiền thủ công)
    // ==========================================
    showUserSearch() {
        this.contentGroup.clear(true, true);
        let txt = this.add.text(this.width/2, 160, "Nhập ID người chơi cần sửa tiền:", { fontSize: '16px', fill: '#ccc' }).setOrigin(0.5);
        let searchBtn = this.add.text(this.width/2, 210, "[ BẤM ĐỂ NHẬP ID ]", { fontSize: '18px', backgroundColor: '#0044aa', padding: 10 }).setOrigin(0.5).setInteractive();

        searchBtn.on('pointerdown', async () => {
            let targetIdStr = window.prompt("Nhập ID Telegram của người chơi:");
            let targetId = parseInt(targetIdStr);
            if (targetId) {
                let newVnt = parseInt(window.prompt(`[ID: ${targetId}]\nNhập số dư VNT mới:`));
                if (!isNaN(newVnt)) {
                    let res = await adminEditUser(this.adminId, targetId, { vnt: newVnt });
                    this.showPopup(this.width, this.height, res?.success ? `✅ Cập nhật: ${newVnt} VNT` : `❌ Lỗi!`);
                }
            }
        });
        this.contentGroup.addMultiple([txt, searchBtn]);
    }

    // ==========================================
    // TAB 3: DUYỆT ĐƠN NẠP TIỀN
    // ==========================================
    async showDeposits() {
        this.contentGroup.clear(true, true);
        this.contentGroup.add(this.add.text(this.width/2, 160, "⏳ Đang tải đơn nạp...", { fill: '#ffcc00' }).setOrigin(0.5));
        
        let res = await adminFetchDeposits(this.adminId);
        this.contentGroup.clear(true, true); 
        
        if (!res || !res.success) return this.contentGroup.add(this.add.text(this.width/2, 160, "❌ Lỗi mạng!", { fill: '#ff0000' }).setOrigin(0.5));
        if(res.deposits.length === 0) return this.contentGroup.add(this.add.text(this.width/2, 250, "✅ Sạch sẽ!\nKhông có đơn nạp nào chờ duyệt.", { fontSize: '18px', fill: '#00ff00', align: 'center' }).setOrigin(0.5));

        let startY = 160;
        let displayList = res.deposits.slice(0, 3); 

        displayList.forEach((d, i) => {
            let y = startY + (i * 130); 
            
            let rect = this.add.rectangle(this.width/2, y + 40, this.width - 30, 110, 0x112211).setStrokeStyle(2, 0x00ff00);
            
            let infoText = `👤 User ID: ${d.uid}\n💎 Xin Nạp: ${d.amount.toLocaleString()} VND\n🌐 Mạng: ${d.currency}\n📝 TxHash: ${d.tx_hash.substring(0, 15)}...`;
            let txt = this.add.text(30, y - 5, infoText, { fontSize: '14px', fill: '#fff', lineHeight: 1.5 });
            
            let okBtn = this.add.text(this.width - 25, y + 15, "✅", { fontSize: '24px', backgroundColor: '#005500', padding: 8 }).setOrigin(1, 0.5).setInteractive();
            let noBtn = this.add.text(this.width - 25, y + 65, "❌", { fontSize: '24px', backgroundColor: '#880000', padding: 8 }).setOrigin(1, 0.5).setInteractive();

            okBtn.on('pointerdown', () => this.showActionPopup(this.width, this.height, d, "approve", "deposit"));
            noBtn.on('pointerdown', () => this.showActionPopup(this.width, this.height, d, "reject", "deposit"));

            this.contentGroup.addMultiple([rect, txt, okBtn, noBtn]);
        });
    }

    // ==========================================
    // TAB 4: QUẢN LÝ ĐƠN RÚT TIỀN 
    // ==========================================
    async showWithdrawals() {
        this.contentGroup.clear(true, true);
        this.contentGroup.add(this.add.text(this.width/2, 160, "⏳ Đang tải đơn rút...", { fill: '#ffcc00' }).setOrigin(0.5));
        
        let res = await adminFetchWithdrawals(this.adminId);
        this.contentGroup.clear(true, true); 
        
        if (!res || !res.success) return this.contentGroup.add(this.add.text(this.width/2, 160, "❌ Lỗi mạng!", { fill: '#ff0000' }).setOrigin(0.5));
        if(res.withdrawals.length === 0) return this.contentGroup.add(this.add.text(this.width/2, 250, "✅ Sạch sẽ!\nKhông có đơn rút nào chờ duyệt.", { fontSize: '18px', fill: '#00ff00', align: 'center' }).setOrigin(0.5));

        let startY = 160;
        let displayList = res.withdrawals.slice(0, 3); 

        displayList.forEach((w, i) => {
            let y = startY + (i * 140); 
            
            let rect = this.add.rectangle(this.width/2, y + 40, this.width - 30, 120, 0x221111).setStrokeStyle(2, 0xff0000);
            
            let modeTxt = w.mode === "fast" ? "⚡ RÚT NHANH (-30% Phí)" : "🐢 RÚT THƯỜNG (Miễn phí)";
            let infoText = `👤 User ID: ${w.uid}\n💰 VNT trừ: ${w.amount_vnt.toLocaleString()}\n💸 SẼ BANK: ${w.receive.toLocaleString()} VND\n🏦 Info: ${w.info.substring(0, 15)}...`;
            
            let txtMode = this.add.text(30, y - 10, modeTxt, { fontSize: '14px', fontStyle: 'bold', fill: '#ffaa00' });
            let txt = this.add.text(30, y + 10, infoText, { fontSize: '14px', fill: '#fff', lineHeight: 1.5 });
            
            let okBtn = this.add.text(this.width - 25, y + 15, "✅", { fontSize: '24px', backgroundColor: '#005500', padding: 8 }).setOrigin(1, 0.5).setInteractive();
            let noBtn = this.add.text(this.width - 25, y + 65, "❌", { fontSize: '24px', backgroundColor: '#880000', padding: 8 }).setOrigin(1, 0.5).setInteractive();

            okBtn.on('pointerdown', () => this.showActionPopup(this.width, this.height, w, "approve", "withdraw"));
            noBtn.on('pointerdown', () => this.showActionPopup(this.width, this.height, w, "reject", "withdraw"));

            this.contentGroup.addMultiple([rect, txtMode, txt, okBtn, noBtn]);
        });
    }

    // ==========================================
    // CÁC HÀM POPUP DÙNG CHUNG BÊN DƯỚI
    // ==========================================
    showActionPopup(width, height, dataItem, actionType, dataType) {
        let overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.85).setInteractive();
        let panel = this.add.rectangle(width/2, height/2, width * 0.85, 200, 0x111111).setStrokeStyle(3, actionType === "approve" ? 0x00ff00 : 0xff0000);

        let titleStr = actionType === "approve" ? "✅ DUYỆT ĐƠN NÀY?" : "❌ TỪ CHỐI ĐƠN NÀY?";
        let subStr = "";

        if (dataType === "deposit") {
            subStr = actionType === "approve" 
                ? `Cấp ${dataItem.amount.toLocaleString()} VND\ncho User ${dataItem.uid}` 
                : `Hủy đơn nạp của User ${dataItem.uid}`;
        } else {
            subStr = actionType === "approve" 
                ? `Xác nhận đã Bank: ${dataItem.receive.toLocaleString()} VND\ncho User ${dataItem.uid}` 
                : `Hoàn lại ${dataItem.amount_vnt.toLocaleString()} VNT\ncho User ${dataItem.uid}`;
        }

        let title = this.add.text(width/2, height/2 - 60, titleStr, { fontSize: '20px', fontStyle: 'bold', fill: actionType === "approve" ? '#00ff00' : '#ff0000' }).setOrigin(0.5);
        let sub = this.add.text(width/2, height/2 - 15, subStr, { fontSize: '15px', fill: '#ccc', align: 'center', lineHeight: 1.5 }).setOrigin(0.5);

        let uiElements = [overlay, panel, title, sub];

        let yesBtn = this.add.text(width/2 - 60, height/2 + 50, "[ CHẮC CHẮN ]", { fontSize: '16px', backgroundColor: actionType === "approve" ? '#006600' : '#880000', padding: 8 }).setOrigin(0.5).setInteractive();
        yesBtn.on('pointerdown', async () => {
            uiElements.forEach(el => el.destroy()); yesBtn.destroy(); noBtn.destroy();
            let loading = this.add.text(width/2, height/2, "⏳ Đang xử lý...", { fontSize: '20px', fill: '#00ffcc', backgroundColor: '#000' }).setOrigin(0.5);
            
            let r;
            if (dataType === "deposit") r = await adminActionDeposit(this.adminId, dataItem.id, actionType);
            else r = await adminActionWithdrawal(this.adminId, dataItem.id, actionType);
            
            loading.destroy();
            this.showPopup(width, height, r.message, true, dataType); 
        });

        let noBtn = this.add.text(width/2 + 60, height/2 + 50, "[ HỦY BỎ ]", { fontSize: '14px', backgroundColor: '#444', padding: 8 }).setOrigin(0.5).setInteractive();
        noBtn.on('pointerdown', () => { uiElements.forEach(el => el.destroy()); yesBtn.destroy(); noBtn.destroy(); });
    }

    showPopup(width, height, message, reloadTab = false, dataType = null) {
        // Tắt thông báo alert mặc định bằng popup in-game mượt mà
        let bg = this.add.rectangle(width/2, height/2, width * 0.8, 150, 0x000000, 0.95).setInteractive();
        bg.setStrokeStyle(2, 0x00ffcc); 
        let txt = this.add.text(width/2, height/2, message, { fontSize: '18px', fill: '#fff', align: 'center', wordWrap: { width: width * 0.7 } }).setOrigin(0.5);

        bg.on('pointerdown', () => {
            bg.destroy(); txt.destroy();
            if (reloadTab) {
                if (dataType === "deposit") this.showDeposits();
                else if (dataType === "withdraw") this.showWithdrawals();
            }
        });
    }
}