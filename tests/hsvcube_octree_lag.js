const { Color8, Vector3, Quaternion, vec3 } = require("utilMath");

let entities = [];

// so these have the Vector3/Quaternion method prototypes
const avatarPos = new Vector3(MyAvatar.position);
const avatarRot = new Quaternion(MyAvatar.orientation);

const RESOLUTION = 16;

for (let x = 0; x < RESOLUTION; x++) {
for (let y = 0; y < RESOLUTION; y++) {
for (let z = 0; z < RESOLUTION; z++) {
	entities.push(Entities.addEntity({
		type: "Box",
		dimensions: [0.05, 0.05, 0.05],
		color: Color8.hsv((x / RESOLUTION) * 360, y / RESOLUTION, z / RESOLUTION),
		collisionless: true,
		position: avatarRot.multiply(avatarPos.add(vec3(x * 0.2, y * 0.2, (z * 0.2) - 5))),
		unlit: true,
	}));
}}}

Script.scriptEnding.connect(() => {
	entities.forEach(e => Entities.deleteEntity(e));
});
