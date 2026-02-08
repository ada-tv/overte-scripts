"use strict";

const POINT_COUNT = 32;

let pointProps = {
	linePoints: Array(POINT_COUNT),
	strokeAlphas: Array(POINT_COUNT),
};

let t = 0;

function updatePointProps() {
	for (let i = 0; i < POINT_COUNT; i++) {
		const theta = i / (POINT_COUNT - 1);
		const thetaTau = theta * Math.PI * 2;

		pointProps.linePoints[i] = [Math.sin(thetaTau), Math.sin(thetaTau * 4 + t) * 0.2, Math.cos(thetaTau)];
		pointProps.strokeAlphas[i] = (0.5 * Math.sin(thetaTau * 4 + t * 4)) + 0.5;
	}
}

updatePointProps();

const lineEntity = Entities.addEntity({
	type: "PolyLine",
	faceCamera: true,
	isUVModeStretch: false,
	position: Vec3.sum(MyAvatar.position, [0, 0.5, 0]),
	textures: Script.resolvePath("./polylinePixels.png"),
	strokeWidths: Array(POINT_COUNT).fill(0.1),
	normals: Array(POINT_COUNT).fill([0, 0, 1]),
	sampler: {
		filter: "point",
		wrap: "mirror",
	},
	...pointProps,
}, "local");

Script.update.connect(dt => {
	t += dt;
	updatePointProps();
	Entities.editEntity(lineEntity, pointProps);
});

Script.scriptEnding.connect(() => Entities.deleteEntity(lineEntity));
