const SOUND_HOVER = SoundCache.getSound(Script.resourcesPath() + "sounds/Button04.wav");

let clickCounter = 0;

const clickyText = Entities.addEntity({
	type: "Text",
	position: Vec3.sum(MyAvatar.getHeadPosition(), Vec3.multiplyQbyV(MyAvatar.headOrientation, [0, 0, -1])),
	dimensions: [1, 0.5, 0.1],
	text: "Clicks: 0",
	unlit: true,
	alignment: "center",
	verticalAlignment: "center",
	backgroundAlpha: 0.9,
}, "local");

const closeButton = Entities.addEntity({
	type: "Text",
	parentID: clickyText,
	localPosition: [0.45, 0.3, 0],
	dimensions: [0.1, 0.1, 0.1],
	text: "X",
	unlit: true,
	alignment: "center",
	verticalAlignment: "center",
	backgroundColor: "#7f0000",
}, "local");

function click(entity, _event) {
	if (entity === clickyText) {
		clickCounter++;
		Entities.editEntity(clickyText, {text: `Clicks: ${clickCounter}`});
		Audio.playSystemSound(SOUND_HOVER);
	} else if (entity === closeButton) {
		Script.stop();
	}
}

Entities.mousePressOnEntity.connect(click);

Script.scriptEnding.connect(() => {
	Entities.deleteEntity(clickyText);
	Entities.deleteEntity(closeButton);
	Entities.mousePressOnEntity.disconnect(click);
});
