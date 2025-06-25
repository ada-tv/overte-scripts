const grabThing = Entities.addEntity({
	type: "Web",
	dimensions: [1, 0.5, 0.1],
	position: Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, [0, 0, -1])),
	grab: { grabbable: true },
}, "local");

Script.setTimeout(() => Script.stop(), 10 * 1000);

Script.scriptEnding.connect(() => {
	Entities.deleteEntity(grabThing);
});
