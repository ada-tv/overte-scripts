// SPDX-License-Identifier: CC0-1.0
const CanvasCommand = Script.require("canvasCommand");

const canvas_1 = Entities.addEntity({
	type: "Canvas",
	position: Vec3.sum(MyAvatar.getHeadPosition(), Vec3.multiply(2, Quat.getForward(MyAvatar.orientation))),
	rotation: MyAvatar.orientation,
	dimensions: [2, 2, 2],
	width: 256,
	height: 256,
	unlit: true,
	transparent: true,
	collisionless: true,
});

const canvas_2 = Entities.addEntity({
	type: "Canvas",
	position: Vec3.sum(
		MyAvatar.getHeadPosition(),
		Vec3.sum(
			Vec3.multiply(1, Quat.getRight(MyAvatar.orientation)),
			Vec3.multiply(1, Quat.getForward(MyAvatar.orientation)),
		)),
	rotation: Quat.multiply(MyAvatar.orientation, Quat.fromPitchYawRollDegrees(0, -90, 0)),
	dimensions: [2, 2, 2],
	width: 256,
	height: 256,
	unlit: true,
	transparent: true,
	collisionless: true,
});

const elements_1 = [
	{
		type: "button",
		rect: [32, 32, 64, 20],
		text: "Button 1",
	},
	{
		type: "button",
		rect: [32 + 64 + 8, 32, 64, 20],
		text: "Button 2",
	},
	{
		type: "hr",
		rect: [32, 32 + 24, 192, 16],
	},
	{
		type: "input-text",
		rect: [32, 32 + 26 + 20, 192, 20],
		placeholder: "Text field",
	},
];

const elements_2 = [
	{
		type: "label",
		rect: [32, 32, 64, 20],
		text: "Label",
	},
	{
		type: "hr",
		rect: [32, 32 + 20, 192, 16],
	},
	{
		type: "input-text",
		rect: [32, 32 + 26 + 20, 192, 20],
		placeholder: "Text field",
	},
];

function UI_ElementCommands(elem) {
	const DEFAULT_BG = [40, 40, 40, 192];
	const DEFAULT_BORDER = [140, 140, 140];
	const DEFAULT_FG = [240, 240, 240];

	switch (elem.type) {
		case "button": return [
			CanvasCommand.font("sans-serif", 8, 400, false),
			CanvasCommand.strokeWidth(2),
			CanvasCommand.color(DEFAULT_BG),
			CanvasCommand.fillRect(elem.rect[0], elem.rect[1], elem.rect[2], elem.rect[3]),
			CanvasCommand.color(DEFAULT_BORDER),
			CanvasCommand.strokeRect(elem.rect[0], elem.rect[1], elem.rect[2], elem.rect[3]),
			CanvasCommand.color(DEFAULT_FG),
			CanvasCommand.fillText(elem.text, elem.rect[0], elem.rect[1], elem.rect[2], elem.rect[3], CanvasCommand.TEXT_ALIGN_CENTER),
		];
		case "input-text": return [
			CanvasCommand.font("sans-serif", 8, 400, false),
			CanvasCommand.strokeWidth(2),
			CanvasCommand.color(DEFAULT_BG),
			CanvasCommand.fillRect(elem.rect[0], elem.rect[1], elem.rect[2], elem.rect[3]),
			CanvasCommand.color(DEFAULT_BORDER),
			CanvasCommand.strokeRect(elem.rect[0], elem.rect[1], elem.rect[2], elem.rect[3]),
			CanvasCommand.color(elem.value === undefined ? [128, 128, 128] : DEFAULT_FG),
			CanvasCommand.fillText(elem.text ?? elem.placeholder, elem.rect[0] + 2, elem.rect[1] + 2, elem.rect[2] - 4, elem.rect[3] - 4, CanvasCommand.TEXT_ALIGN_LEFT | CanvasCommand.TEXT_ALIGN_VCENTER),
		];
		case "hr": return [
			CanvasCommand.strokeWidth(1),
			CanvasCommand.color([0, 0, 0, 192]),
			CanvasCommand.line(elem.rect[0], elem.rect[1] + (elem.rect[3] / 2), elem.rect[0] + elem.rect[2], elem.rect[1] + (elem.rect[3] / 2)),
			CanvasCommand.color([255, 255, 255, 32]),
			CanvasCommand.line(elem.rect[0], 1 + elem.rect[1] + (elem.rect[3] / 2), elem.rect[0] + elem.rect[2], 1 + elem.rect[1] + (elem.rect[3] / 2)),
		];
		case "label": return [
			CanvasCommand.font("sans-serif", 8, 400, false),
			CanvasCommand.color(DEFAULT_FG),
			CanvasCommand.fillText(elem.text, elem.rect[0], elem.rect[1], elem.rect[2], elem.rect[3], CanvasCommand.TEXT_ALIGN_LEFT | CanvasCommand.TEXT_ALIGN_VCENTER),
		];
	}
}

function UI_Redraw() {
	{
		let cmds = [
			CanvasCommand.clearRect(0, 0, 256, 256),
			CanvasCommand.color([40, 40, 40, 250]),
			CanvasCommand.fillRect(0, 0, 256, 256),
		];
		for (const elem of elements_1) { cmds.push(UI_ElementCommands(elem)); }
		Entities.canvasPushCommands(canvas_1, cmds.flat());
		Entities.canvasCommit(canvas_1);
	}

	{
		let cmds = [
			CanvasCommand.clearRect(0, 0, 256, 256),
			CanvasCommand.color([40, 40, 40, 250]),
			CanvasCommand.fillRect(0, 0, 256, 256),
		];
		for (const elem of elements_2) { cmds.push(UI_ElementCommands(elem)); }
		Entities.canvasPushCommands(canvas_2, cmds.flat());
		Entities.canvasCommit(canvas_2);
	}
}

UI_Redraw();

Script.scriptEnding.connect(() => {
	Entities.deleteEntity(canvas_1);
	Entities.deleteEntity(canvas_2);
});
