const CanvasCommand = Script.require("canvasCommand");

const canvas = Entities.addEntity({
    type: "Canvas",
    position: Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0, z: -1 })),
    dimensions: { x: 1, y: 0.5, z: 0.01 },
    lifetime: 30,  // Delete after 30 seconds.
    width: 256,
    height: 128,
    unlit: true,
    transparent: true,
}, "local");

Entities.canvasPushCommands(canvas, [
    CanvasCommand.color([255, 255, 255, 255]),
    CanvasCommand.font("sans-serif", 20),
    CanvasCommand.fillText(
        "Hello, world!",
        0, 0,
        256, 128,
        CanvasCommand.TEXT_ALIGN_HCENTER | CanvasCommand.TEXT_ALIGN_VCENTER
    ),
]);

Entities.canvasCommit(canvas);
