// SPDX-License-Identifier: CC0-1.0
"use strict"
const SUB_CHANNEL = "AOUI.Subtitles.Write";
const SUB_SETTING_CHANNEL = "AOUI.Subtitles.Setting";
const LINE_HEIGHT = 0.05;
const VERTICAL_MARGIN = 0.02;

let enabled = true;

let subtitleEntities = new Set();

function Subtitle_Spawn(props) {
	if (!enabled) { return; }

	let lineCount = 1;
	for (const char of props["text"]) {
		if (char === "\n") { lineCount++; }
	}

	const textHeight = LINE_HEIGHT * lineCount;

	const entity = Entities.addEntity({
		type: "Text",
		text: props["text"],
		textColor: props["color"] ?? [255,255,255],
		backgroundColor: [0,0,0],
		backgroundAlpha: 0.5,
		renderLayer: "hud",
		localPosition: [0, -0.5 + (textHeight / 2) + VERTICAL_MARGIN, -1.0],
		localDimensions: [1, textHeight + VERTICAL_MARGIN, 0.1],
		unlit: true,
		textEffect: "outline fill",
		textEffectColor: [0,0,0],
		textEffectThickness: 0.3,
		alignment: "center",
		topMargin: VERTICAL_MARGIN / 4,
		lineHeight: LINE_HEIGHT,
		grab: {grabbable:false},
		ignorePickIntersection: true,

		parentID: MyAvatar.sessionUUID,
		parentJointIndex: 65529, // CAMERA_MATRIX_INDEX
	}, "local");

	for (const entity of subtitleEntities.keys()) {
		const { localPosition } = Entities.getEntityProperties(entity, "localPosition");
		Entities.editEntity(entity, {
			localPosition: Vec3.sum(localPosition, [0, textHeight + VERTICAL_MARGIN, 0])
		});
	}

	subtitleEntities.add(entity);
	Script.setTimeout(() => {
		Entities.deleteEntity(entity);
		subtitleEntities.delete(entity);
	}, (props["lifetime"] ?? 5) * 1000);
}

function Subtitle_MessageRecv(channel, rawData, _senderID, _localOnly) {
	if (channel === SUB_CHANNEL) {
		if (!enabled) { return; }

		let data;
		try {
			data = JSON.parse(rawData);

			if (data["text"] === undefined) {
				console.error(`Subtitle_MessageRecv: Subtitle is missing text!`);
				return;
			}

			Subtitle_Spawn(data);
		} catch (e) {
			console.error(`Subtitle_MessageRecv (Write): ${e}`);
		}
	} else if (channel === SUB_SETTING_CHANNEL) {
		let data;
		try {
			data = JSON.parse(rawData);

			if (data["enabled"] !== undefined) {
				enabled = !!data["enabled"];

				if (!enabled) {
					for (const entity of subtitleEntities.keys()) {
						Entities.deleteEntity(entity);
					}
				}
			}
		} catch (e) {
			console.error(`Subtitle_MessageRecv (Setting): ${e}`);
		}
	}
}

Messages.subscribe(SUB_CHANNEL);
Messages.subscribe(SUB_SETTING_CHANNEL);
Messages.messageReceived.connect(Subtitle_MessageRecv);

Script.scriptEnding.connect(() => {
	Messages.unsubscribe(SUB_CHANNEL);
	Messages.unsubscribe(SUB_SETTING_CHANNEL);

	for (const entity of subtitleEntities.keys()) {
		Entities.deleteEntity(entity);
	}
});
