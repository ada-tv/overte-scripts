const { Vector3, Quaternion, ColorF } = require("utilMath");

const RESOLUTION = 109; // <= 109 works, > 109 doesn't
let properties = {
	type: "PolyLine",
	parentID: MyAvatar.SELF_ID,
	localPosition: Vector3.ZERO,
	linePoints: [],
	normals: [],
	strokeWidths: [],
	strokeColors: [],
	faceCamera: true,
};

for (let i = 0; i < RESOLUTION; i++) {
	const t = (i / RESOLUTION) * Math.PI;

	let vec = Vector3.UP;
	let yaw = Quaternion.fromPitchYawRollRadians(0, t * 8, 0);
	let pitch = Quaternion.fromPitchYawRollRadians(t, 0, 0);

	let angle = yaw.multiply(pitch);

	let pos = angle.multiply(vec).multiply(1);
	properties.linePoints.push(pos);
	properties.normals.push(Vector3.FORWARD);
	properties.strokeWidths.push(0.01);
	properties.strokeColors.push(ColorF.hsv((i / RESOLUTION) * 360, 0.5, 1));
}

let entity1 = Entities.addEntity({
	...properties
}, "domain");
let entity2 = Entities.addEntity({
	...properties
}, "domain");

let t = 0;
Script.update.connect(dt => {
	t += dt * Math.PI * 1;
	Entities.editEntity(entity1, { localRotation: Quaternion.fromPitchYawRollRadians(0, -t, 0) });
	Entities.editEntity(entity2, { localRotation: Quaternion.fromPitchYawRollRadians(0, -t + Math.PI, 0) });
});

Script.scriptEnding.connect(() => {
	Entities.deleteEntity(entity1);
	Entities.deleteEntity(entity2);
});
