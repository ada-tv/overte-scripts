const MODEL_URL = Script.resolvePath("../dungeoncrawl/assets/models/sword.glb");

const entities = [
	// attached to sensor-to-world joint
	Entities.addEntity({
		type: "Text",
		parentID: MyAvatar.SELF_ID,
		parentJointIndex: 65534,
		localPosition: [-0.1, 1.5, -0.5],
		dimensions: [0.2, 0.1, 0.1],
		unlit: true,
		text: "S-W Joint",
		lineHeight: 0.05,
	}, "local"),

	Entities.addEntity({
		type: "Model",
		parentID: MyAvatar.SELF_ID,
		parentJointIndex: 65534,
		localPosition: [0.1, 1.5, -0.5],
		dimensions: [0.1, 0.1, 0.1],
		modelURL: MODEL_URL
	}, "local"),

	// attached to avatar without joint
	Entities.addEntity({
		type: "Text",
		parentID: MyAvatar.SELF_ID,
		localPosition: [-0.1, 0.6, -0.7],
		dimensions: [0.2, 0.1, 0.1],
		unlit: true,
		text: "Avatar",
		lineHeight: 0.05,
	}, "local"),

	Entities.addEntity({
		type: "Model",
		parentID: MyAvatar.SELF_ID,
		localPosition: [0.1, 0.6, -0.7],
		dimensions: [0.1, 0.1, 0.1],
		modelURL: MODEL_URL
	}, "local"),
];

Script.scriptEnding.connect(() => {
	for (const entity of entities) {
		Entities.deleteEntity(entity);
	}
});
