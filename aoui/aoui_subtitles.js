// SPDX-License-Identifier: CC0-1.0
"use strict"
const SUB_CHANNEL = "AOUI.Subtitles.Write";
const SUB_SETTING_CHANNEL = "AOUI.Subtitles.Setting";
const LINE_HEIGHT = 0.05;
const VERTICAL_MARGIN = 0.02;

let settings = Settings.getValue("AOUI/Subtitles", {
	enabled: true,
	opaqueBg: false,
});

let subtitleEntities = new Set();

function Subtitle_WrapText(text = "", max_chars = 25) {
	const tokens = text.replace(/\s+/g, " ").split(/ +/);
	let lines = [];
	let line_accum = [];
	let line_width = 0;

	for (const token of tokens) {
		if (token.length + line_width > max_chars) {
			lines.push(line_accum.join(" "));
			line_accum = [];
			line_width = 0;
		}

		line_accum.push(token);
		line_width += token.length + 1;
	}

	lines.push(line_accum.join(" "));

	return [lines.join("\n"), lines.length];
}

function Subtitle_Spawn(props) {
	if (!settings.enabled && !props.alwaysShow) { return; }
	if (props.recipient !== undefined && props.recipient !== MyAvatar.sessionUUID) { return; }

	const [text, lineCount] = Subtitle_WrapText(props.text);
	console.error(JSON.stringify(text));

	const textHeight = LINE_HEIGHT * lineCount;

	const bgAlpha = settings.opaqueBg ? 1 : 0.6;

	const entity = Entities.addEntity({
		type: "Text",
		text: text,
		textColor: props.color ?? [255,255,255],
		backgroundColor: [0,0,0],
		backgroundAlpha: bgAlpha,
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
		const FADE_FPS = 30;
		const FADE_TIME = .3;
		let fade = 1;

		const fadeout_interval = Script.setInterval(() => {
			const fade_smooth = fade * fade * (3 - 2 * fade);
			Entities.editEntity(entity, { textAlpha: 1 * fade_smooth, backgroundAlpha: bgAlpha * fade_smooth });
			fade -= 1 / FADE_FPS;
		}, (FADE_TIME * 1000) / FADE_FPS);

		Script.setTimeout(() => {
			Script.clearInterval(fadeout_interval);
			Entities.deleteEntity(entity);
			subtitleEntities.delete(entity);
		}, (FADE_TIME * 1000));
	}, (props.lifetime ?? 5) * 1000);
}

function Subtitle_MessageRecv(channel, rawData, _senderID, _localOnly) {
	if (channel === SUB_CHANNEL) {
		try {
			let data = JSON.parse(rawData);

			if (!data.text) {
				console.error(`Subtitle_MessageRecv: Subtitle is missing text!`);
				return;
			}

			Subtitle_Spawn(data);
		} catch (e) {
			console.error(`Subtitle_MessageRecv (Write): ${e}`);
		}
	} else if (channel === SUB_SETTING_CHANNEL) {
		try {
			let data = JSON.parse(rawData);

			if (data.enabled !== undefined) {
				settings.enabled = !!data.enabled;

				if (!settings.enabled) {
					for (const entity of subtitleEntities.keys()) {
						Entities.deleteEntity(entity);
					}
				}
			}

			if (data.opaqueBg !== undefined) {
				settings.opaqueBg = !!data.opaqueBg;
			}

			Settings.setValue("AOUI/Subtitles", settings);
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

	Settings.setValue("AOUI/Subtitles", settings);
});
