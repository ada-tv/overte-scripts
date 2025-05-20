// SPDX-License-Identifier: CC0-1.0
const CanvasCommand = Script.require("canvasCommand");

const canvas = Entities.addEntity({
	type: "Canvas",
	position: Vec3.sum(MyAvatar.getHeadPosition(), Vec3.multiplyQbyV(MyAvatar.orientation, [0, 0, -2])),
	rotation: MyAvatar.headOrientation,
	dimensions: [2, 2, 2],
	width: 256,
	height: 256,
	unlit: true,
	transparent: true,
	collisionless: true,
});

let ticks = 0;
const buffer = new Uint8Array(256 * 256 * 4);
const img = {data: buffer.buffer, width: 256, height: 256};

const tickInterval = Script.setInterval(() => {
	for (let x = 0; x < 256; x++) {
		for (let y = 0; y < 256; y++) {
			buffer[(y * 256 * 4) + (x * 4) + 0] = (x + ticks) ^ y;
			buffer[(y * 256 * 4) + (x * 4) + 1] = (x + ticks) ^ (y + ticks);
			buffer[(y * 256 * 4) + (x * 4) + 2] = x ^ (y + ticks);
			buffer[(y * 256 * 4) + (x * 4) + 3] = x ^ y;
		}
	}

	Entities.canvasPushPixels(canvas, img);
	Entities.canvasPushCommands(canvas, [
		CanvasCommand.strokeWidth(16),
		CanvasCommand.color([255, 0, 255, 128]),
		CanvasCommand.line(0, 0, 256, 256),
		CanvasCommand.line(256, 0, 0, 256),
		CanvasCommand.color([255, 255, 255, (Math.sin(ticks / 30) * 128) + 127]),
		CanvasCommand.font("sans-serif", 20, 600, false),
		CanvasCommand.fillText("Hello, world!", 0, 0, 256, 256, CanvasCommand.TEXT_ALIGN_HCENTER | CanvasCommand.TEXT_ALIGN_VCENTER),
		CanvasCommand.strokeWidth(4),
		CanvasCommand.strokeRect(16, 16, 256 - 32, 256 - 32),
	]);
	Entities.canvasCommit(canvas);
	ticks += 1;
	ticks &= 0xff;
}, 50);

Script.scriptEnding.connect(() => {
	Script.clearInterval(tickInterval);
	Entities.deleteEntity(canvas);
});
