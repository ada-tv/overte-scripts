"use strict";

const BLINK_TIME_MS = 10 * 1000;

const TITLE_PROPS = {
	type: "Text",
	localDimensions: [1, 0.5, 0],
	unlit: true,
	backgroundAlpha: 0,
	textEffect: "outline fill",
	textEffectThickness: 0.3,
	textEffectColor: "black",
	alignment: "center",
	verticalAlignment: "center",
};

const LIGHT_PROPS = {
	type: "Light",
	dimensions: [2, 2, 2],
	intensity: 50,
	falloffRadius: 5,
};

const data = [
	{
		title: "Disabled",
		props: {
			position: [-1, 0, -2],
			fadeInMode: "disabled",
			fadeOutMode: "disabled",
			color: [255, 0, 0,],
			...LIGHT_PROPS,
		}
	},
	{
		title: "Inherit",
		props: {
			position: [0, 0, -2],
			fadeInMode: "inherit",
			fadeOutMode: "inherit",
			color: [255, 255, 255],
			...LIGHT_PROPS,
		}
	},
	{
		title: "Fade",
		props: {
			position: [1, 0, -2],
			fadeInMode: "enabled",
			fadeOutMode: "enabled",
			fadeIn: {
				duration: 4,
				timing: "easeOut",
			},
			fadeOut: {
				duration: 4,
				timing: "easeOut",
			},
			color: [0, 255, 255],
			...LIGHT_PROPS,
		}
	},
];

const startPos = MyAvatar.position;
const startAngle = MyAvatar.orientation;

let titleEntities = [];
let demoEntities = [];

for (const datum of data) {
	titleEntities.push(Entities.addEntity({
			...TITLE_PROPS,
			text: datum.title,
			//rotation: MyAvatar.orientation,
			position: Vec3.sum(startPos, Vec3.multiplyQbyV(startAngle, datum.props.position)),
			billboardMode: "full",
	}, "local"));

	demoEntities.push(Entities.addEntity({
			...LIGHT_PROPS,
			...datum.props,
			position: Vec3.sum(startPos, Vec3.multiplyQbyV(startAngle, datum.props.position)),
	}, "local"));
}

let state = true;

const interval = Script.setInterval(() => {
	if (state) {
		for (const e of demoEntities) {
			Entities.deleteEntity(e);
		}
		demoEntities = [];
	} else {
		for (const datum of data) {
			demoEntities.push(Entities.addEntity({
					...LIGHT_PROPS,
					...datum.props,
					position: Vec3.sum(startPos, Vec3.multiplyQbyV(startAngle, datum.props.position)),
			}, "local"));
		}
	}

	state = !state;
}, BLINK_TIME_MS);

Script.scriptEnding.connect(() => {
	Script.clearInterval(interval);

	for (const e of titleEntities) {
		Entities.deleteEntity(e);
	}

	for (const e of demoEntities) {
		Entities.deleteEntity(e);
	}
});
