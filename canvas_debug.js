// SPDX-License-Identifier: CC0-1.0

const canvas = Entities.addEntity({
	type: "Canvas",
	position: MyAvatar.getHeadPosition(),
	dimensions: [2, 2, 2],
	width: 256,
	height: 256,
});

let ticks = 0;
const buffer = new Uint8Array(256 * 256 * 4);
const img = {buffer: buffer.buffer, width: 256, height: 256};

const tickInterval = Script.setInterval(() => {
	for (let x = 0; x < 256; x++) {
		for (let y = 0; y < 256; y++) {
			buffer[(y * 256 * 4) + (x * 4) + 0] = (x + ticks) ^ y;
			buffer[(y * 256 * 4) + (x * 4) + 1] = (x + ticks) ^ (y + ticks);
			buffer[(y * 256 * 4) + (x * 4) + 2] = x ^ (y + ticks);
			buffer[(y * 256 * 4) + (x * 4) + 3] = x ^ y;
		}
	}

	Entities.canvasPushImage(canvas, img);
	Entities.canvasPushCommands(canvas, [
		CanvasCommand.setStrokeWidth(16),
		CanvasCommand.setColor([255, 0, 255]),
		CanvasCommand.line(0, 0, 256, 256),
		CanvasCommand.line(256, 0, 0, 256),
		CanvasCommand.setColor([255, 255, 255]),
		CanvasCommand.setFont("sans-serif", 20, 600, false),
		CanvasCommand.fillText("Hello, world!", 0, 0, 256, 256, CanvasCommand.TEXT_ALIGN_HCENTER | CanvasCommand.TEXT_ALIGN_VCENTER),
		CanvasCommand.setStrokeWidth(4),
		CanvasCommand.strokeRect(16, 16, 256 - 32, 256 - 32),
	]);
	Entities.canvasCommit(canvas);
	ticks += 1;
	ticks &= 0xff;
}, 10);

Script.scriptEnding.connect(() => {
	Script.clearInterval(tickInterval);
	Entities.deleteEntity(canvas);
});
