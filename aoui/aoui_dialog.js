// SPDX-License-Identifier: CC0-1.0
const DIALOG_CHANNEL = "AOUI.Dialog.Open";
const DIALOG_PRESS_CHANNEL = "AOUI.Dialog.OptionPress";

const LINE_HEIGHT = 0.05;

let dlgEntities = new Set();
let clickEntities = {};

function Dialog_Close() {
	for (const entity of dlgEntities.keys()) {
		Entities.deleteEntity(entity);
	}

	dlgEntities.clear();
	clickEntities = {};
}

/**
 * {
 *   id: string,
 *   title: string?,
 *   font: string?,
 *   text: string,
 *   options: [
 *     { text: string, color: (string | list | object)?, requires: string[]?, func: string? }
 *   ]?,
 *   position: list | object,
 *   dimensions: list,
 *   yaw: number,
 *   fulfills: string[]?,
 * }
 */
function Dialog_Open(data) {
	const position = data.position ??
		Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, [0, 0, -2]));
	const rotation = data.yaw === undefined ?
		Quat.lookAtSimple(MyAvatar.position, position) :
		Quat.fromPitchYawRollDegrees(0, data.yaw, 0);
	const font = data.font ?? undefined;
	const options = data.options ?? [{ text: "Goodbye" }];
	const text = data.text ?? "There's no defined text! Check your script.";
	const dimensions = data.dimensions ?? [2, 1];

	if (data.title) {
		const titleEnt = Entities.addEntity({
			type: "Text",
			dimensions: [dimensions[0], LINE_HEIGHT * 1.5, 1],
			position: Vec3.sum(position, [0, (dimensions[1] + (LINE_HEIGHT * 2)) / 2, 0]),
			rotation: rotation,
			font: font,
			text: data.title,
			backgroundAlpha: 0.9,
			lineHeight: LINE_HEIGHT,
			leftMargin: LINE_HEIGHT / 2,
			textEffect: "outline fill",
			textEffectColor: [0, 0, 0],
			textEffectThickness: 0.4,
			alignment: "left",
			verticalAlignment: "center",
			unlit: true,
			grab: {grabbable: false},
		}, "local");
		dlgEntities.add(titleEnt);
	}

	const bodyEnt = Entities.addEntity({
			type: "Text",
			dimensions: [dimensions[0], dimensions[1], 1],
			position: position,
			rotation: rotation,
			font: font,
			text: text,
			backgroundAlpha: 0.9,
			lineHeight: LINE_HEIGHT,
			leftMargin: LINE_HEIGHT / 2,
			rightMargin: LINE_HEIGHT / 2,
			topMargin: LINE_HEIGHT / 2,
			bottomMargin: LINE_HEIGHT / 2,
			textEffect: "outline fill",
			textEffectColor: [0, 0, 0],
			textEffectThickness: 0.4,
			alignment: "left",
			verticalAlignment: "top",
			unlit: true,
			grab: {grabbable: false},
	}, "local");
	dlgEntities.add(bodyEnt);

	let optionY = (dimensions[1] + (LINE_HEIGHT * 2)) / -2;

	for (const option of options) {
		let fulfills = new Set(data.fulfills);
		let requires = new Set(option.requires);
		let fulfilled = true;

		// Set.prototype.isSupersetOf isn't in node 18, we'll have
		// to wait until we get the next lts version of node in
		// if (!fulfills.isSupersetOf(requires)) { continue; }
		if (fulfills.size < requires.size) { fulfilled = false; }
		for (const key of requires.keys()) {
			if (!fulfills.has(key)) { fulfilled = false; break; }
		}
		if (!fulfilled) { continue; }

		const optionEnt = Entities.addEntity({
			type: "Text",
			dimensions: [dimensions[0], LINE_HEIGHT * 1.5, 1],
			position: Vec3.sum(position, [0, optionY, 0]),
			rotation: rotation,
			font: font,
			text: option.text,
			backgroundAlpha: 0.9,
			lineHeight: LINE_HEIGHT,
			textColor: option.color ?? [255, 255, 255],
			leftMargin: LINE_HEIGHT,
			textEffect: "outline fill",
			textEffectColor: [0, 0, 0],
			textEffectThickness: 0.4,
			alignment: "left",
			verticalAlignment: "center",
			unlit: true,
			grab: {grabbable: false},
		}, "local");
		dlgEntities.add(optionEnt);

		if (option.func === "AOUI.CloseDialog") {
			clickEntities[optionEnt] = Dialog_Close;
		} else if (!option.func) {
			clickEntities[optionEnt] = () => console.warn("Option has no func");
		} else {
			clickEntities[optionEnt] = () => {
				Dialog_Close();
				Messages.sendLocalMessage(DIALOG_PRESS_CHANNEL, option.func);
			};
		}

		optionY -= LINE_HEIGHT * 1.55;
	}
}

function Dialog_MessageRecv(channel, rawData, _senderID, _localOnly) {
	if (channel !== DIALOG_CHANNEL) { return; }

	let data;
	try {
		data = JSON.parse(rawData);
	} catch (e) {
		console.error(`Dialog_MessageRecv: ${e}`);
	}

	Dialog_Open(data);
}

let lastHoveredEntity;

function Dialog_EntityHover(entity, _event) {
	if (lastHoveredEntity in clickEntities) {
		Entities.editEntity(lastHoveredEntity, { backgroundColor: [0, 0, 0] });
	}

	if (entity in clickEntities) {
		Entities.editEntity(entity, { backgroundColor: [64, 64, 64] });
	}

	lastHoveredEntity = entity;
}

function Dialog_EntityClick(entity, event) {
	if (!(entity in clickEntities) || !event.isPrimaryButton) { return; }

	clickEntities[entity]();
}

Entities.mouseMoveOnEntity.connect(Dialog_EntityHover);
Entities.mousePressOnEntity.connect(Dialog_EntityClick);
Messages.subscribe(DIALOG_CHANNEL);
Messages.messageReceived.connect(Dialog_MessageRecv);

/*Controller.keyPressEvent.connect(event => {
	if (event.text !== "|" || event.isAutoRepeat) { return; }

	Dialog_Open({
		id: Uuid.generate(),
		title: "Chatty Bloke",
		text: "Lorem ipsum and whatever.",
		options: [
			{text: "Wasn't that a printing error?"},
			{text: "Potato smash! (Punch him in the face)"},
			{text: "[Furry] :3 awa,,!", color: [0, 255, 255], requires: ["test"]},
			{text: "[Unavailable] You shouldn't see this.", color: [255, 0, 0], requires: ["false"]},
			{text: "Goodbye", func: "AOUI.CloseDialog"},
		],
		fulfills: ["test"],
		dimensions: [1, 0.5],
		yaw: 0,
		position: [50, 51.8, 50],
	});
});*/

Script.scriptEnding.connect(() => {
	Entities.mouseMoveOnEntity.disconnect(Dialog_EntityHover);
	Entities.mousePressOnEntity.disconnect(Dialog_EntityClick);
	Messages.unsubscribe(DIALOG_CHANNEL);
	Messages.messageReceived.disconnect(Dialog_MessageRecv);

	for (const entity of dlgEntities.keys()) {
		Entities.deleteEntity(entity);
	}
});
