const grabThing = Entities.addEntity({
	type: "Box",
	dimensions: [0.2, 0.2, 0.2],
	position: Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, [0, 0, -1])),
	grab: { grabbable: true },
}, "local");

Script.setTimeout(() => Script.stop(), 10 * 1000);

Script.scriptEnding.connect(() => {
	Entities.deleteEntity(grabThing);
});
