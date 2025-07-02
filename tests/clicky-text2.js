const SOUND_HOVER = SoundCache.getSound(Script.resourcesPath() + "sounds/Button04.wav");

let prevClicks = [];

let clickCounter = 0;

const clickyText = Entities.addEntity({
	type: "Text",
	position: Vec3.sum(MyAvatar.getHeadPosition(), Vec3.multiplyQbyV(MyAvatar.headOrientation, [1, 0, -1])),
	dimensions: [2, 0.5, 0.1],
	text: "Clicks: 0",
	unlit: true,
	alignment: "left",
	verticalAlignment: "top",
	backgroundAlpha: 0.9,
	lineHeight: 0.01,
	font: "Inconsolata",
}, "local");

const closeButton = Entities.addEntity({
	type: "Text",
	parentID: clickyText,
	localPosition: [1.45, 0.3, 0],
	dimensions: [0.1, 0.1, 0.1],
	text: "X",
	unlit: true,
	alignment: "center",
	verticalAlignment: "center",
	backgroundColor: "#7f0000",
}, "local");

function click(entity, event) {
	if (entity === clickyText) {
		console.info(JSON.stringify(event));
		prevClicks.push(`${clickCounter}: ${JSON.stringify(event)}`);
		if (prevClicks.length > 6) {
			prevClicks = prevClicks.slice(prevClicks.length < 6);
		}

		Entities.editEntity(clickyText, {text: prevClicks.join("\n")});
		Audio.playSystemSound(SOUND_HOVER);
		clickCounter++;
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
