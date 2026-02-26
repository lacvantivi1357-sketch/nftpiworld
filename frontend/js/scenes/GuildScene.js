class GuildScene extends Phaser.Scene {
    constructor() { super({ key: 'GuildScene' }); }
    
    init(data) { this.userId = data.userId; }

    async create() {
        this.width = this.cameras.main.width;
        this.height = this.cameras.main.height;

        // 1. NỀN ĐẠI SẢNH (Màu tím hoàng gia)
        this.add.rectangle(this.width/2, this.height/2, this.width, this.height, 0x1a0033);
        
        this.add.text(this.width/2, 40, "🛡️ ĐẠI SẢNH BANG HỘI", { 
            fontSize: '28px', fontStyle: 'bold', fill: '#ffcc00', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5);

        // Nút quay lại Menu
        let backBtn = this.add.text(15, 15, "⬅ MENU", { fontSize: '16px', backgroundColor: '#333', padding: 8 }).setInteractive();
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

        // 2. GỌI API KIỂM TRA TRẠNG THÁI BANG HỘI (Giả lập chờ Backend)
        let loadingTxt = this.add.text(this.width/2, 120, "⏳ Đang kết nối tới Lãnh chúa...", { fontSize: '18px', fill: '#00ffcc' }).setOrigin(0.5);
        
        // TODO: Hàm này sẽ được viết trong api.js ở bước sau
        // let guildData = await fetchUserGuild(this.userId); 
        let guildData = { success: true, hasGuild: false }; // Tạm thời giả lập là chưa có bang

        loadingTxt.destroy();

        if (guildData && guildData.hasGuild) {
            this.showMyGuildUI(guildData.guildInfo);
        } else {
            this.showNoGuildUI();
        }
    }

    // ==========================================
    // GIAO DIỆN 1: CHƯA CÓ BANG HỘI
    // ==========================================
    showNoGuildUI() {
        // Nút Thành Lập Bang
        let createBtn = this.add.text(this.width/2, 120, "[ 👑 THÀNH LẬP BANG HỘI ]", { 
            fontSize: '20px', fontStyle: 'bold', backgroundColor: '#aa0000', padding: 12, stroke: '#000', strokeThickness: 3 
        }).setOrigin(0.5).setInteractive();

        createBtn.on('pointerdown', () => {
            createBtn.setStyle({ backgroundColor: '#550000' });
            setTimeout(() => createBtn.setStyle({ backgroundColor: '#aa0000' }), 100);
            this.showCreateGuildPopup();
        });

        this.add.text(this.width/2, 160, "Phí thành lập: 50,000 VND", { fontSize: '14px', fill: '#ffaa00' }).setOrigin(0.5);

        // Danh sách Bang hội tuyển thành viên
        this.add.text(this.width/2, 220, "--- 📜 CÁC BANG HỘI NỔI BẬT ---", { fontSize: '18px', fill: '#aaaaaa' }).setOrigin(0.5);
        
        // Khung trống chờ update tính năng hiển thị danh sách bang
        let listBg = this.add.rectangle(this.width/2, 330, this.width * 0.9, 180, 0x000000, 0.5).setStrokeStyle(2, 0x444466);
        this.add.text(this.width/2, 330, "Đang tải danh sách...\n(Tính năng Xin gia nhập sẽ sớm ra mắt)", { 
            fontSize: '16px', fill: '#666666', align: 'center' 
        }).setOrigin(0.5);
    }

    // ==========================================
    // POPUP TẠO BANG HỘI
    // ==========================================
    showCreateGuildPopup() {
        let overlay = this.add.rectangle(this.width/2, this.height/2, this.width, this.height, 0x000000, 0.85).setInteractive();
        let panel = this.add.rectangle(this.width/2, this.height/2, this.width * 0.9, 220, 0x111122).setStrokeStyle(3, 0xffaa00);

        let title = this.add.text(this.width/2, this.height/2 - 70, "👑 LẬP BANG MỚI", { fontSize: '22px', fontStyle: 'bold', fill: '#ffcc00' }).setOrigin(0.5);
        
        // Nút giả lập ô nhập liệu
        let inputBtn = this.add.text(this.width/2, this.height/2 - 20, "[ BẤM ĐỂ NHẬP TÊN BANG ]", { 
            fontSize: '16px', backgroundColor: '#000', padding: 12, stroke: '#444', strokeThickness: 1 
        }).setOrigin(0.5).setInteractive();

        let uiElements = [overlay, panel, title, inputBtn];
        let guildName = "";

        inputBtn.on('pointerdown', () => {
            let name = window.prompt("Nhập tên Bang Hội của bạn (Tối đa 15 ký tự):");
            if (name && name.trim().length > 0) {
                guildName = name.trim().substring(0, 15);
                inputBtn.setText(`Tên Bang: ${guildName}`);
                inputBtn.setStyle({ fill: '#00ffcc' });
            }
        });

        // Nút Xác Nhận Tạo
        let confirmBtn = this.add.text(this.width/2 - 70, this.height/2 + 50, "[ XÁC NHẬN ]", { 
            fontSize: '16px', fontStyle: 'bold', backgroundColor: '#006600', padding: 10 
        }).setOrigin(0.5).setInteractive();

        confirmBtn.on('pointerdown', async () => {
            if (!guildName) return this.showToast("❌ Vui lòng nhập tên Bang!");
            
            uiElements.forEach(el => el.destroy()); confirmBtn.destroy(); cancelBtn.destroy();
            let loading = this.add.text(this.width/2, this.height/2, "⏳ Đang khắc ấn tín...", { fontSize: '20px', fill: '#ffcc00', backgroundColor: '#000', padding: 10 }).setOrigin(0.5);
            
            // TODO: Gọi API tạo bang ở đây (Sẽ code ở bước sau)
            // let res = await createGuildAPI(this.userId, guildName);
            
            setTimeout(() => { // Giả lập delay mạng
                loading.destroy();
                this.showToast("🚧 Backend chưa hoàn thiện!\nHãy báo sếp code tiếp API.");
            }, 1000);
        });

        // Nút Hủy
        let cancelBtn = this.add.text(this.width/2 + 70, this.height/2 + 50, "[ HỦY BỎ ]", { 
            fontSize: '14px', backgroundColor: '#444', padding: 10 
        }).setOrigin(0.5).setInteractive();

        cancelBtn.on('pointerdown', () => {
            uiElements.forEach(el => el.destroy()); confirmBtn.destroy(); cancelBtn.destroy();
        });
    }

    // ==========================================
    // GIAO DIỆN 2: ĐÃ CÓ BANG HỘI
    // ==========================================
    showMyGuildUI(guildInfo) {
        // Khung thông tin Bang
        this.add.rectangle(this.width/2, 140, this.width * 0.9, 100, 0x000000, 0.6).setStrokeStyle(2, 0xffcc00);
        this.add.text(this.width/2, 110, `👑 [Tên Bang Giả Lập]`, { fontSize: '24px', fontStyle: 'bold', fill: '#00ffcc' }).setOrigin(0.5);
        this.add.text(this.width/2, 150, `Cấp độ: 1  |  Thành viên: 1/50`, { fontSize: '16px', fill: '#aaaaaa' }).setOrigin(0.5);

        // Nút Đóng góp
        let donateBtn = this.add.text(this.width/2 - 70, 220, "[ 💰 ĐÓNG GÓP ]", { fontSize: '16px', backgroundColor: '#006666', padding: 10 }).setOrigin(0.5).setInteractive();
        
        // Nút Rời Bang
        let leaveBtn = this.add.text(this.width/2 + 70, 220, "[ 🚪 RỜI BANG ]", { fontSize: '16px', backgroundColor: '#8b0000', padding: 10 }).setOrigin(0.5).setInteractive();
    }

    // Hiển thị thông báo nhanh tự tắt
    showToast(msg) {
        let bg = this.add.rectangle(this.width/2, this.height/2, this.width * 0.8, 80, 0x000000, 0.9).setStrokeStyle(2, 0xffaa00);
        let txt = this.add.text(this.width/2, this.height/2, msg, { fontSize: '16px', fill: '#fff', align: 'center' }).setOrigin(0.5);
        
        this.time.delayedCall(2000, () => {
            bg.destroy(); txt.destroy();
        });
    }
}