const USE_UPDATE = true;

const display = Entities.addEntity({
	type: "Text",
	text: "Hops: 0\nTicks: 0",
	localPosition: [0, 0.5, -2],
	dimensions: [2, 1, 1],
	parentID: MyAvatar.sessionUUID,
	alignment: "center",
	verticalAlignment: "center",
	backgroundAlpha: 0,
	unlit: true,
	lineHeight: 0.2,
}, "local");

let hopsText = "";

const hopsDisplay = Entities.addEntity({
	type: "Text",
	text: hopsText,
	localPosition: [0, 2.5, -2],
	dimensions: [2, 2, 1],
	parentID: MyAvatar.sessionUUID,
	alignment: "left",
	verticalAlignment: "bottom",
	backgroundAlpha: 0,
	unlit: true,
	lineHeight: 0.1,
}, "local");

let domainChanges = 0;
let ticks = 0;

if (USE_UPDATE) {
	Script.update.connect(_dt => {
		ticks += 1;
		Entities.editEntity(display, {text: `Hops: ${domainChanges}\nTicks: ${ticks}`});
	});
} else {
	Script.setInterval(() => {
		ticks += 1;
		Entities.editEntity(display, {text: `Hops: ${domainChanges}\nTicks: ${ticks}`});
	}, 1000 / 10);
}

Window.domainChanged.connect(domain => {
	ticks = 0;
	hopsText += `[${domainChanges}]: "${domain}"\n`;
	domainChanges += 1;
	Entities.editEntity(hopsDisplay, {text: hopsText});
});

Script.scriptEnding.connect(() => {
	Entities.deleteEntity(display);
	Entities.deleteEntity(hopsDisplay);
});
