const config = {
    type: Phaser.AUTO,
    // Tự động scale vừa khít màn hình điện thoại
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'game-container',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth,
        height: window.innerHeight
    },
    backgroundColor: '#1a1a2e', // Màu nền tím đen
    scene: [MenuScene, HuntScene, PetScene, InventoryScene, CraftScene]
};

// Kích hoạt Game
const game = new Phaser.Game(config);