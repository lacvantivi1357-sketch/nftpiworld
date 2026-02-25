class AdminScene extends Phaser.Scene {
    constructor() { super({ key: 'AdminScene' }); }
    init(data) { this.adminId = data.userId; }

    async create() {
        this.width = this.cameras.main.width;
        this.height = this.cameras.main.height;

        this.add.rectangle(this.width/2, this.height/2, this.width, this.height, 0x000000, 0.95);
        this.add.text(this.width/2, 40, "🛠 TRUNG TÂM KIỂM SOÁT", { fontSize: '28px', fontStyle: 'bold', fill: '#ff0000' }).setOrigin(0.5);

        // NÚT CHUYỂN TAB
        let userTab = this.add.text(this.width/2 - 80, 100, "[ 👥 NGƯỜI CHƠI ]", { backgroundColor: '#444', padding: 8 }).setOrigin(0.5).setInteractive();
        let wdTab = this.add.text(this.width/2 + 80, 100, "[ 🏧 RÚT TIỀN ]", { backgroundColor: '#444', padding: 8 }).setOrigin(0.5).setInteractive();

        this.contentGroup = this.add.group();

        userTab.on('pointerdown', () => {
            userTab.setStyle({ fill: '#00ffcc' }); wdTab.setStyle({ fill: '#fff' });
            this.showUsers();
        });
        
        wdTab.on('pointerdown', () => {
            wdTab.setStyle({ fill: '#00ffcc' }); userTab.setStyle({ fill: '#fff' });
            this.showWithdrawals();
        });

        let backBtn = this.add.text(20, 20, "⬅ THOÁT", { backgroundColor: '#333', padding: 8 }).setInteractive();
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

        // Mặc định hiển thị tab Rút Tiền khi vừa vào
        wdTab.emit('pointerdown');
    }

    async showUsers() {
        this.contentGroup.clear(true, true);
        let res = await adminFetchUsers(this.adminId);
        if (!res.success) return;

        let startY = 160;
        res.users.forEach((u, i) => {
            let y = startY + (i * 75);
            let txt = this.add.text(20, y, `ID: ${u.id}\nVND: ${u.vnd} | VNT: ${u.vnt}`, { fontSize: '15px' });
            
            let editBtn = this.add.text(this.width - 20, y + 10, "[ SỬA VNT ]", { backgroundColor: '#006600', padding: 5 }).setOrigin(1, 0.5).setInteractive();
            editBtn.on('pointerdown', async () => {
                let newVnt = prompt(`Nhập số VNT mới cho ID ${u.id}:`, u.vnt);
                if (newVnt) {
                    await adminEditUser(this.adminId, u.id, { vnt: parseInt(newVnt) });
                    this.showUsers(); // Tải lại danh sách
                }
            });
            this.contentGroup.addMultiple([txt, editBtn]);
        });
    }

    async showWithdrawals() {
        this.contentGroup.clear(true, true);
        this.contentGroup.add(this.add.text(this.width/2, 140, "⏳ Đang tải dữ liệu...", { fill: '#ffcc00' }).setOrigin(0.5));
        
        let res = await adminFetchWithdrawals(this.adminId);
        this.contentGroup.clear(true, true); // Xóa chữ loading
        
        if (!res.success) return alert(res.message);

        if(res.withdrawals.length === 0) {
            let noData = this.add.text(this.width/2, 250, "✅ Sạch sẽ! Không có đơn nào.", { fontSize: '18px', fill: '#00ff00' }).setOrigin(0.5);
            this.contentGroup.add(noData);
            return;
        }

        let startY = 160;
        res.withdrawals.forEach((w, i) => {
            let y = startY + (i * 120);
            
            // Khung viền đơn rút
            let rect = this.add.rectangle(this.width/2, y + 30, this.width - 20, 100, 0x222222).setStrokeStyle(2, 0x555555);
            
            let modeTxt = w.mode === "fast" ? "⚡ NHANH (-30%)" : "🐢 THƯỜNG (100%)";
            let txt = this.add.text(20, y - 10, 
                `👤 User: ${w.uid}\n💰 Rút: ${w.amount_vnt.toLocaleString()} VNT\n💸 TRẢ KHÁCH: ${w.receive.toLocaleString()} VND\n🏦 Info: ${w.info}\n🚀 Kiểu: ${modeTxt}`, 
                { fontSize: '13px', fill: '#fff' }
            );
            
            let okBtn = this.add.text(this.width - 25, y + 10, "✅", { fontSize: '24px', backgroundColor: '#006600', padding: 5 }).setOrigin(1, 0.5).setInteractive();
            let noBtn = this.add.text(this.width - 25, y + 55, "❌", { fontSize: '24px', backgroundColor: '#8b0000', padding: 5 }).setOrigin(1, 0.5).setInteractive();

            okBtn.on('pointerdown', async () => {
                if(confirm(`Xác nhận bạn đã Bank cho khách ${w.receive.toLocaleString()} VND và DUYỆT đơn này?`)) {
                    let r = await adminActionWithdrawal(this.adminId, w.id, "approve");
                    alert(r.message);
                    this.showWithdrawals(); // Tải lại danh sách
                }
            });

            noBtn.on('pointerdown', async () => {
                if(confirm("TỪ CHỐI đơn này và hoàn trả VNT lại cho người chơi?")) {
                    let r = await adminActionWithdrawal(this.adminId, w.id, "reject");
                    alert(r.message);
                    this.showWithdrawals();
                }
            });

            this.contentGroup.addMultiple([rect, txt, okBtn, noBtn]);
        });
    }
}