let lightEntity = Entities.addEntity({
	type: "Light",
	parentID: MyAvatar.sessionUUID,
	localPosition: [0, 1, -1],
	dimensions: [20, 20, 20],
	intensity: 50,
}, "local");

Script.scriptEnding.connect(() => {
	Entities.deleteEntity(lightEntity);
});
