const CanvasCommand = Script.require("canvasCommand");

const canvas = Entities.addEntity({
	type: "Canvas",
	position: Vec3.sum(MyAvatar.getHeadPosition(), Vec3.multiplyQbyV(MyAvatar.orientation, [0, 0, -2])),
	rotation: MyAvatar.orientation,
	dimensions: [2, 2, 0.1],
	width: 256,
	height: 256,
	unlit: true,
	collisionless: true,
}, "local");

const buffer = new Uint8Array(256 * 256 * 4);
const img = {data: buffer.buffer, width: 256, height: 256};

for (let x = 0; x < 256; x++) {
	for (let y = 0; y < 256; y++) {
		let color = x ^ y;
		buffer[(y * 256 * 4) + (x * 4) + 0] = color;
		buffer[(y * 256 * 4) + (x * 4) + 1] = color;
		buffer[(y * 256 * 4) + (x * 4) + 2] = color;
		buffer[(y * 256 * 4) + (x * 4) + 3] = 255;
	}
}

Entities.canvasPushPixels(canvas, img);
Entities.canvasCommit(canvas);

Script.scriptEnding.connect(() => Entities.deleteEntity(canvas));

// delete after 10 seconds
Script.setTimeout(() => Script.stop(), 1000 * 10);
