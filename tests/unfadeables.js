"use strict";

const BLINK_TIME_MS = 5 * 1000;

const TITLE_PROPS = {
	type: "Text",
	renderLayer: "front",
	localDimensions: [1, 0.5, 0],
	unlit: true,
	backgroundAlpha: 0,
	textEffect: "outline fill",
	textEffectThickness: 0.3,
	textEffectColor: "black",
	alignment: "center",
	verticalAlignment: "center",
};

const data = [
	{
		title: "Box",
		props: {
			type: "Box",
			position: [-2, 0, -2],
			localDimensions: [0.5, 0.5, 0.5],
		}
	},
	{
		title: "Image",
		props: {
			type: "Image",
			position: [-1.5, 0, -2],
			localDimensions: [0.5, 0.5, 0.5],
			imageURL: Script.resolvePath("./polylinePixels.png"),
			keepAspectRatio: true,
			emissive: true,
		}
	},
	{
		title: "Grid",
		props: {
			type: "Grid",
			position: [-1.0, 0, -2],
			localDimensions: [0.5, 0.5, 0.5],
			color: "red",
			majorGridEvery: 0.3,
			minorGridEvery: 0.05,
			followCamera: false,
		}
	},
	{
		title: "Gizmo",
		props: {
			type: "Gizmo",
			position: [-0.5, 0, -2],
			localDimensions: [0.5, 0.5, 0.5],
			color: "red",
		}
	},
	{
		title: "Line",
		props: {
			type: "Line",
			position: [0.0, 0, -2],
			localDimensions: [0.5, 0.5, 0.5],
			color: [0, 255, 255],
			linePoints: [
				[0.0, -0.25, 0.0],
				[0.0, 0.25, 0.0],
				[0.25, 0.0, 0.0],
				[0.0, 0.25, 0.0],
				[-0.25, 0.0, 0.0],
			],
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
			position: Vec3.sum(startPos, Vec3.multiplyQbyV(startAngle, datum.props.position)),
			billboardMode: "full",
	}, "local"));

	demoEntities.push(Entities.addEntity({
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
