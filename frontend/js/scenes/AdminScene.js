class AdminScene extends Phaser.Scene {
    constructor() { super({ key: 'AdminScene' }); }
    init(data) { this.adminId = data.userId; }

    async create() {
        const width = this.cameras.main.width;
        this.add.rectangle(width/2, 300, width, 600, 0x000000, 0.9);
        this.add.text(width/2, 40, "🛠 QUẢN TRỊ VIÊN", { fontSize: '32px', fill: '#ff0000' }).setOrigin(0.5);

        let res = await adminFetchUsers(this.adminId);
        if (!res.success) return alert("Bạn không có quyền!");

        let startY = 100;
        res.users.forEach((u, i) => {
            let y = startY + (i * 80);
            this.add.text(20, y, `ID: ${u.id}\nVND: ${u.vnd} | VNT: ${u.vnt}`, { fontSize: '16px' });

            let editBtn = this.add.text(width - 20, y + 15, "[ SỬA ]", { backgroundColor: '#444', padding: 5 }).setOrigin(1, 0.5).setInteractive();
            editBtn.on('pointerdown', async () => {
                let newVnt = prompt(`Nhập số VNT mới cho ${u.id}:`, u.vnt);
                if (newVnt !== null) {
                    await adminEditUser(this.adminId, u.id, { vnt: parseInt(newVnt) });
                    this.scene.restart();
                }
            });
        });

        let backBtn = this.add.text(20, 20, "⬅ THOÁT", { backgroundColor: '#333', padding: 8 }).setInteractive();
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    }
}