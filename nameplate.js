const ContextMenu = Script.require(Script.resolvePath("contextMenuApi.js"));
const myScale = MyAvatar.getAvatarScale();

let visible = false;

const root = Entities.addEntity({
	parentID: MyAvatar.sessionUUID,
	name: "Nameplate",
	type: "Box",
	billboardMode: "yaw",
	collisionless: true,
	dimensions: [0.7 * myScale, 0.3 * myScale, 0.001 * myScale],
	localPosition: [0, 1.4 * myScale, 0],
	color: [0, 0, 0],
	alpha: 0,
	unlit: true,
}, "avatar");

let ents = {
	root: root,
	name: Entities.addEntity({
		parentID: root,
		type: "Text",
		billboardMode: "yaw",
		visible: visible,
		collisionless: true,
		dimensions: [0.3 * myScale, 0.11 * myScale, 0.001 * myScale],
		localPosition: [0, -0.2 * myScale, 0],
		unlit: true,
		text: "Ada",
		verticalAlignment: "top",
		alignment: "center",
		backgroundAlpha: 0.7,
		lineHeight: 0.1,
	}, "avatar"),
	pronouns: Entities.addEntity({
		parentID: root,
		type: "Text",
		billboardMode: "yaw",
		visible: visible,
		collisionless: true,
		dimensions: [0.3 * myScale, 0.04 * myScale, 0.001 * myScale],
		localPosition: [0, -0.12 * myScale, 0],
		unlit: true,
		text: "they/them",
		verticalAlignment: "top",
		alignment: "center",
		backgroundAlpha: 0.7,
		lineHeight: 0.03,
		textColor: [255, 200, 0],
	}, "avatar"),
	loggedIn: Account.isLoggedIn() ? undefined : Entities.addEntity({
		parentID: root,
		type: "Text",
		billboardMode: "yaw",
		visible: visible,
		collisionless: true,
		dimensions: [0.3 * myScale, 0.04 * myScale, 0.001 * myScale],
		localPosition: [0, -0.075 * myScale, 0],
		unlit: true,
		text: "(not logged in)",
		verticalAlignment: "top",
		alignment: "center",
		backgroundAlpha: 0.7,
		lineHeight: 0.03,
		textColor: [255, 0, 0],
	}, "avatar"),
};

const ctxActionSet = [
	{
		text: "Toggle Nameplate",
		textColor: [255, 200, 0],
		localClickFunc: "customNameplate.toggle",
	}
];
const ctxActionFuncs = {
	"customNameplate.toggle": () => {
		visible = !visible;
		for (const ent of Object.values(ents)) {
			Entities.editEntity(ent, {visible: visible});
		}
	},
};

ContextMenu.registerActionSet("customNameplate", ctxActionSet, "_SELF");

Messages.messageReceived.connect((channel, msg, senderID, localOnly) => {
	if (channel !== ContextMenu.CLICK_FUNC_CHANNEL) { return; }
	if (senderID !== MyAvatar.sessionUUID) { return; }

	const data = JSON.parse(msg);

	if (!(data.funcName in ctxActionFuncs)) { return; }

	ctxActionFuncs[data.funcName]();
});

Script.scriptEnding.connect(() => {
	for (const ent of Object.values(ents)) {
		Entities.deleteEntity(ent);
	}
	ContextMenu.unregisterActionSet("customNameplate");
});
