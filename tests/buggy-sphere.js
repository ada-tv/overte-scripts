const sphere = Entities.addEntity({
	type: "Shape",
	shape: "Sphere",
	dimensions: [3, 3, 3],
	position: MyAvatar.position,
}, "local");

const material = Entities.addEntity({
	type: "Material",
	parentID: sphere,
	priority: 1,
	materialURL: "materialData",
	materialData: JSON.stringify({
		materialVersion: 1,
		materials: {
			model: "hifi_pbr",
			unlit: true,
			albedo: [0, 0, 0],
			cullFaceMode: "CULL_FRONT",
			opacity: 0.5,
		}
	}),
}, "local");

Script.scriptEnding.connect(() => {
	Entities.deleteEntity(sphere);
	Entities.deleteEntity(material);
});

//Script.setTimeout(() => Script.stop(), 5000);
