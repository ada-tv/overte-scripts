// SPDX-License-Identifier: CC0-1.0

const CONTEXT_MENU_PUBLIC = false;
const CONTEXT_MENU_PARENTED = false;
const ACTIONS_PER_PAGE = 6;

// Roboto
// Inconsolata
// Courier
// Timeless
// https://*
const CONTEXT_MENU_FONT = "Roboto";
const MENU_TOGGLE_ACTION = Controller.Standard.RightPrimaryThumb;
const TARGET_HOVER_ACTION = Controller.Standard.RT;

const CLICK_FUNC_CHANNEL = "net.thingvellir.context-menu.click";
const ACTIONS_CHANNEL = "net.thingvellir.context-menu.actions";
const MAIN_CHANNEL = "net.thingvellir.context-menu";

const EMPTY_FUNCTION = () => {};

const SELF_ACTIONS = [
	(_target, _isAvatar) => {
		return {
			text: MyAvatar.getCollisionsEnabled() ? "[   ] Noclip" : "[X] Noclip",
			textColor: [127, 255, 255],
			clickFunc: (target, menuItemEntity) => MyAvatar.setCollisionsEnabled(!MyAvatar.getCollisionsEnabled()),
		};
	},
	(_target, _isAvatar) => {
		return {
			text: MyAvatar.getOtherAvatarsCollisionsEnabled() ? "[X] Avatar collisions" : "[   ] Avatar collisions",
			textColor: [127, 255, 255],
			clickFunc: (target, menuItemEntity) => MyAvatar.setOtherAvatarsCollisionsEnabled(!MyAvatar.getOtherAvatarsCollisionsEnabled()),
		};
	},
];

const OBJECT_ACTIONS = [
	(ent, isAvatar) => {
		if (isAvatar) { return; }
		const locked = Uuid.isNull(ent) || Entities.getEntityProperties(ent, "locked").locked;

		return {
			text: "Delete",
			textColor: locked ? [64, 64, 64] : [255, 0, 0],
			backgroundColor: locked ? [128, 128, 128] : [0, 0, 0],
			clickFunc: locked ? EMPTY_FUNCTION : (ent => Entities.deleteEntity(ent)),
		};
	},
	(ent, isAvatar) => {
		if (isAvatar) { return; }
		const props = Entities.getEntityProperties(ent, ["locked", "cloneable", "grab"]);
		const locked = Uuid.isNull(ent) || props.locked || !(props.cloneable && props.grab?.grabbable);

		return {
			text: "Clone",
			textColor: locked ? [64, 64, 64] : [0, 255, 0],
			backgroundColor: locked ? [128, 128, 128] : [0, 0, 0],
			clickFunc: locked ? EMPTY_FUNCTION : (ent => {
				const newEnt = Entities.cloneEntity(ent);
				Entities.editEntity(newEnt, {
					position: Vec3.sum(MyAvatar.position, Quat.getFront(MyAvatar.orientation)),
				});
			}),
		};
	},
];

const ROOT_ACTIONS = [
	(_target, _isAvatar) => ({
		text: "My Avatar",
		textColor: [127, 255, 255],
		keepMenuOpen: true,
		submenu: "_SELF",
		priority: -102,
	}),
	(target, isAvatar) => {
		if (isAvatar) { return; }
		if (!Entities.canRez() || Uuid.isNull(target)) { return; }

		return {
			text: "Object",
			textColor: [0, 255, 0],
			keepMenuOpen: true,
			submenu: "_OBJECT",
			priority: -101,
		};
	},
	(target, isAvatar) => {
		if (!isAvatar) { return; }

		const avatar = AvatarList.getAvatar(target);
		if (!avatar || Object.keys(avatar).length === 0) { return; }

		return {
			text: avatar.displayName,
			textColor: [255, 255, 0],
			keepMenuOpen: true,
			submenu: "_AVATAR",
			priority: -100,
		};
	},
];

let registeredActionSets = {
	"_ROOT": [...ROOT_ACTIONS],
	"_SELF": [...SELF_ACTIONS],
	"_OBJECT": [...OBJECT_ACTIONS],
	"_AVATAR": [],
};
let registeredActionSetParents = {};

const targetingPick = Picks.createPick(PickType.Ray, {
	enabled: true,
	filter: Picks.PICK_DOMAIN_ENTITIES | Picks.PICK_AVATAR_ENTITIES | Picks.PICK_LOCAL_ENTITIES | Picks.PICK_INCLUDE_NONCOLLIDABLE | Picks.PICK_AVATARS,
	maxDistance: 20 * MyAvatar.getAvatarScale(),
	joint: HMD.active ? "_CAMERA_RELATIVE_CONTROLLER_RIGHTHAND" : "Mouse",
});

let currentMenuOpen = false;
let currentMenuEntities = new Set();
let currentMenuActionFuncs = [];
let currentMenuTarget = Uuid.NULL;
let currentMenuTargetIsAvatar = false;
let currentMenuInSubmenu = false;
let currentMenuTargetLine = Uuid.NULL;

function ContextMenu_DeleteMenu() {
	currentMenuEntities.forEach((_, e) => Entities.deleteEntity(e));
	currentMenuEntities.clear();
	currentMenuActionFuncs = [];
	currentMenuOpen = false;
	currentMenuInSubmenu = false;
	currentMenuTargetIsAvatar = false;
	currentMenuTarget = Uuid.NULL;
	currentMenuTargetLine = Uuid.NULL;
	Controller.releaseEntityClickEvents();
}

function ContextMenu_EntityClick(eid, event) {
	if (!currentMenuEntities.has(eid)) { return; }

	currentMenuInSubmenu = false;

	try {
		const data = JSON.parse(Entities.getEntityProperties(eid, "userData").userData);
		if (data.nextPage !== undefined && data.actionSetName !== undefined) {
			ContextMenu_OpenActions(data.actionSetName, data.nextPage);
		} else {
			const func = data.actionFunc;
			currentMenuActionFuncs[func][0](currentMenuTarget, eid);
			if (!currentMenuActionFuncs[func][1] && !currentMenuInSubmenu) {
				ContextMenu_DeleteMenu();
			}
		}
	} catch (e) {}
}

function ContextMenu_FindTarget() {
	currentMenuTargetIsAvatar = false;

	const ray = Picks.getPrevPickResult(targetingPick);
	if (!ray.intersects) {
		currentMenuTarget = Uuid.NULL;
		return;
	}

	if (ray.type === 3) {
		currentMenuTarget = ray.objectID;
		currentMenuTargetIsAvatar = true;
	} else {
		currentMenuTarget = ray.objectID;
	}
}

function ContextMenu_OpenActions(actionSetName, page = 0) {
	currentMenuEntities.forEach((_, e) => Entities.deleteEntity(e));
	currentMenuTargetLine = Uuid.NULL;
	currentMenuActionFuncs = [];

	currentMenuInSubmenu = true;

	Controller.captureEntityClickEvents();

	const scale = MyAvatar.getAvatarScale();
	const myAvatar = MyAvatar.sessionUUID;

	const baseActions = registeredActionSets[actionSetName];

	let actionEnts = [];
	let origin;
	if (HMD.active) {
		origin = Vec3.sum(
			Camera.position,
			Vec3.multiplyQbyV(
				Camera.orientation,
				[0, -0.25 * scale, -1.0 * scale]
			)
		);
	} else {
		const remap = (low1, high1, low2, high2, value) => low2 + (value - low1) * (high2 - low2) / (high1 - low1);
		const spawnDist = remap(20, 130, 1.2, 0.25, Camera.frustum.fieldOfView);
		origin = Vec3.sum(
			Camera.position,
			Vec3.multiplyQbyV(
				Camera.orientation,
				[0, 0, -spawnDist * scale]
			)
		);
	}
	let angle = Quat.lookAtSimple(Camera.position, origin);

	let activeActions = [];

	let actions = [...baseActions];

	for (const [setName, parent] of Object.entries(registeredActionSetParents)) {
		if (parent === actionSetName) {
			actions.push(...Object.values(registeredActionSets[setName]));
		}
	}

	for (const action of actions) {
		let actionData = action(currentMenuTarget, currentMenuTargetIsAvatar);

		if (!actionData || Object.keys(actionData).length === 0) { continue; }

		// the menu item is only valid for a target entity
		if (action.requiredTargets !== undefined && !(currentMenuTarget in action.requiredTargets)) {
			continue;
		}

		activeActions.push(actionData);
	}

	const hasPages = activeActions.length > ACTIONS_PER_PAGE;
	page = Math.max(0, Math.min(page, Math.floor(activeActions.length / ACTIONS_PER_PAGE)));
	activeActions.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
	activeActions = activeActions.slice(
		page * ACTIONS_PER_PAGE,
		(page * ACTIONS_PER_PAGE) + ACTIONS_PER_PAGE
	);

	let yPos = Math.max(1, activeActions.length) * 0.02 * scale;
	let bgHeight = (yPos / 2.0) - (0.03 * scale);

	if (!Uuid.isNull(currentMenuTarget)) {
		let targetPos;
		if (currentMenuTargetIsAvatar) {
			targetPos = AvatarList.getAvatar(currentMenuTarget).position;
		} else {
			targetPos = Entities.getEntityProperties(currentMenuTarget, "position").position;
		}

		currentMenuTargetLine = Entities.addEntity({
			type: "PolyLine",
			grab: {grabbable: false},
			parentID: CONTEXT_MENU_PARENTED ? myAvatar : undefined,
			position: origin,
			linePoints: [
				[0, 0, 0],
				[targetPos.x - origin.x, targetPos.y - origin.y, targetPos.z - origin.z],
			],
			normals: [
				[0, 0, 1],
				[0, 0, 1],
			],
			strokeWidths: [0.1, 0.0],
			color: [127, 255, 255],
			glow: true,
			faceCamera: true,
		}, CONTEXT_MENU_PUBLIC ? "avatar" : "local");
		currentMenuEntities.add(currentMenuTargetLine);
	}

	let titleText;
	if (currentMenuTargetIsAvatar) {
		const data = AvatarList.getAvatar(currentMenuTarget);
		if (data.displayName === "unnamed" || data.displayName == "NoName") {
			titleText = `Avatar (${currentMenuTarget})`;
		} else {
			titleText = `Avatar (${data.displayName})`;
		}
	} else if (currentMenuTarget) {
		const data = Entities.getEntityProperties(currentMenuTarget, ["type", "name"]);
		const type = data.type ?? "UNKNOWN";
		if (data.name) {
			titleText = `${type} (${data.name})`;
		} else {
			titleText = `${type}`;
		}
	} else {
		titleText = "Self";
	}

	actionEnts.push({
		grab: {grabbable: false},
		type: "Text",
		position: Vec3.sum(origin, Vec3.multiplyQbyV(angle, [0, yPos, 0])),
		rotation: angle,
		renderLayer: "front",
		dimensions: [0.215 * scale, 0.04 * scale, 0.01 * scale],
		text: titleText,
		textColor: [230, 230, 230],
		backgroundColor: [0, 0, 0],
		backgroundAlpha: 0.9,
		unlit: true,
		lineHeight: 0.018 * scale,
		verticalAlignment: "center",
		alignment: "center",
		triggerable: false,
	});

	actionEnts.push({
		grab: {grabbable: false},
		type: "Text",
		position: Vec3.sum(origin, Vec3.multiplyQbyV(angle, [-0.13, yPos, 0])),
		rotation: angle,
		renderLayer: "front",
		dimensions: [0.04 * scale, 0.04 * scale, 0.01 * scale],
		text: hasPages ? "<" : "",
		textColor: [230, 230, 230],
		backgroundColor: [0, 0, 0],
		backgroundAlpha: 0.9,
		unlit: true,
		lineHeight: 0.05 * scale,
		verticalAlignment: "top",
		alignment: "center",
		triggerable: false,
		leftMargin: 0.003 * scale,
		topMargin: -0.008 * scale,
		userData: JSON.stringify({nextPage: page - 1, actionSetName: actionSetName}),
	});

	actionEnts.push({
		grab: {grabbable: false},
		type: "Text",
		position: Vec3.sum(origin, Vec3.multiplyQbyV(angle, [0.13, yPos, 0])),
		rotation: angle,
		renderLayer: "front",
		dimensions: [0.04 * scale, 0.04 * scale, 0.01 * scale],
		text: hasPages ? ">" : "",
		textColor: [230, 230, 230],
		backgroundColor: [0, 0, 0],
		backgroundAlpha: 0.9,
		unlit: true,
		lineHeight: 0.05 * scale,
		verticalAlignment: "top",
		alignment: "center",
		triggerable: false,
		leftMargin: -0.002 * scale,
		topMargin: -0.008 * scale,
		userData: JSON.stringify({nextPage: page + 1, actionSetName: actionSetName}),
	});

	yPos -= 0.047 * scale;
	bgHeight += 0.047;

	for (let i = 0; i < activeActions.length; i++) {
		let action = activeActions[i];

		let pos = Vec3.sum(origin, Vec3.multiplyQbyV(angle, [0, yPos, 0]));
		actionEnts.push({
			grab: {grabbable: false},
			type: "Text",
			position: pos,
			rotation: angle,
			renderLayer: "front",
			dimensions: [0.3 * scale, 0.05 * scale, 0.0001 * scale],
			text: action.text,
			textColor: action.textColor ?? [255, 255, 255],
			backgroundColor: action.backgroundColor ?? [0, 0, 0],
			backgroundAlpha: action.backgroundAlpha ?? 0.8,
			unlit: true,
			lineHeight: 0.025 * scale,
			verticalAlignment: "center",
			alignment: "left",
			triggerable: true,
			leftMargin: 0.05 * scale,
			rightMargin: 0.05 * scale,
			userData: JSON.stringify({actionFunc: i}),
		});
		if (action.iconImage) {
			let pos = Vec3.sum(origin, Vec3.multiplyQbyV(angle, [-0.125 * scale, yPos, 0.0001]));
			actionEnts.push({
				grab: {grabbable: false},
				type: "Image",
				position: pos,
				rotation: angle,
				renderLayer: "front",
				dimensions: [0.03 * scale, 0.03 * scale, 0.01 * scale],
				imageURL: action.iconImage,
				emissive: true,
				userData: JSON.stringify({actionFunc: i}),
			});
		}
		let clickFunc = EMPTY_FUNCTION;
		if (action.submenu) {
			if (registeredActionSets[action.submenu]) {
				clickFunc = (_target, _isAvatar) => ContextMenu_OpenActions(action.submenu);
			} else {
				print(`Unregistered action set "${action.submenu}"!`);
			}
		} else if (action.clickFunc) {
			clickFunc = action.clickFunc;
		} else if (action.remoteClickFunc) {
			clickFunc = (target, isAvatar) => {
				Messages.sendMessage(CLICK_FUNC_CHANNEL, JSON.stringify({
					funcName: action.remoteClickFunc,
					targetEntity: target,
					isTargetAvatar: isAvatar,
				}));
			};
		} else if (action.localClickFunc) {
			clickFunc = (target, isAvatar) => {
				Messages.sendLocalMessage(CLICK_FUNC_CHANNEL, JSON.stringify({
					funcName: action.localClickFunc,
					targetEntity: target,
					isTargetAvatar: isAvatar,
				}));
			};
		}
		currentMenuActionFuncs.push([clickFunc, action.keepMenuOpen ?? false]);
		yPos -= 0.0525 * scale;
		bgHeight += 0.0525;
	}

	if (activeActions.length === 0) {
		let pos = Vec3.sum(origin, Vec3.multiplyQbyV(angle, [0, yPos, 0]));
		actionEnts.push({
			grab: {grabbable: false},
			type: "Text",
			position: pos,
			rotation: angle,
			renderLayer: "front",
			dimensions: [0.3 * scale, 0.05 * scale, 0.0001 * scale],
			text: "(No actions)",
			textColor: [230, 230, 230],
			backgroundColor: [64, 64, 64],
			backgroundAlpha: 0.8,
			unlit: true,
			lineHeight: 0.025 * scale,
			verticalAlignment: "center",
			alignment: "left",
			triggerable: true,
			leftMargin: 0.05 * scale,
			rightMargin: 0.05 * scale,
		});
		yPos -= 0.0525 * scale;
		bgHeight += 0.0525;
	}

	// background quad
	/*actionEnts.push({
		grab: {grabbable: false},
		type: "Box",
		position: Vec3.sum(origin, Vec3.multiplyQbyV(angle, [0, 0, -0.01 * scale])),
		rotation: angle,
		renderLayer: "front",
		dimensions: [0.32 * scale, bgHeight, 0.0001 * scale],
		color: [59, 102, 155],
		alpha: 0.75,
		unlit: true,
	});*/

	for (let a of actionEnts) {
		if (CONTEXT_MENU_PARENTED) { a["parentID"] = myAvatar; }
		a["font"] = CONTEXT_MENU_FONT;
		const e = Entities.addEntity(a, CONTEXT_MENU_PUBLIC ? "avatar" : "local");
		currentMenuEntities.add(e);
	}

	currentMenuOpen = true;
}

let mouseButtonHeld = false;
function ContextMenu_MousePressEvent(event) {
	if (event.isLeftButton) { mouseButtonHeld = true; }
}
function ContextMenu_MouseReleaseEvent(event) {
	if (event.isLeftButton) { mouseButtonHeld = false; }
}

function ContextMenu_OpenRoot() {
	ContextMenu_OpenActions("_ROOT");
}

function ContextMenu_KeyEvent(event) {
	if (event.text === "t" && !event.isAutoRepeat) {
		if (currentMenuOpen) {
			ContextMenu_DeleteMenu();
		} else {
			if (mouseButtonHeld) { ContextMenu_FindTarget(); }
			ContextMenu_OpenRoot();
		}
	}
}

let controllerHovering = false;
function ContextMenu_ActionEvent(action, value) {
	if (action === TARGET_HOVER_ACTION) { controllerHovering = value > 0.5; }

	if (action === MENU_TOGGLE_ACTION && value > 0.5) {
		if (currentMenuOpen) {
			ContextMenu_DeleteMenu();
		} else {
			if (controllerHovering) { ContextMenu_FindTarget(); }
			ContextMenu_OpenRoot();
		}
	}
}

function ContextMenu_Update() {
	if (!Uuid.isNull(currentMenuTargetLine)) {
		if (currentMenuTargetIsAvatar) {
			targetPos = AvatarList.getAvatar(currentMenuTarget).position;
		} else {
			targetPos = Entities.getEntityProperties(currentMenuTarget, "position").position;
		}

		const myPos = Entities.getEntityProperties(currentMenuTargetLine, "position").position;

		Entities.editEntity(currentMenuTargetLine, {
			linePoints: [
				[0, 0, 0],
				[targetPos.x - myPos.x, targetPos.y - myPos.y, targetPos.z - myPos.z],
			],
			rotation: Quat.IDENTITY,
		});
	}
}

function ContextMenu_Message(channel, msg, senderID, localOnly) {
	if (channel !== ACTIONS_CHANNEL) { return; }

	let data; try { data = JSON.parse(msg); } catch (e) {}

	if (data.func === "register") {
		let tmp = {};
		for (const [k, v] of Object.entries(data.actionSet)) {
			tmp[k] = (_entity, _isAvatar) => v;
		}
		registeredActionSets[data.name] = tmp;
		if (data.parent) {
			registeredActionSetParents[data.name] = data.parent;
		}
	} else if (data.func === "unregister") {
		delete registeredActionSets[data.name];
		delete registeredActionSetParents[data.name];
	}
}

Messages.messageReceived.connect(ContextMenu_Message);
Controller.keyPressEvent.connect(ContextMenu_KeyEvent);
Controller.inputEvent.connect(ContextMenu_ActionEvent);
Controller.mousePressEvent.connect(ContextMenu_MousePressEvent);
Controller.mouseReleaseEvent.connect(ContextMenu_MouseReleaseEvent);
Entities.mousePressOnEntity.connect(ContextMenu_EntityClick);
Script.update.connect(ContextMenu_Update);
Messages.sendLocalMessage(MAIN_CHANNEL, JSON.stringify({func: "startup"}));

Script.scriptEnding.connect(() => {
	Messages.messageReceived.disconnect(ContextMenu_Message);
	Controller.keyPressEvent.disconnect(ContextMenu_KeyEvent);
	Controller.inputEvent.disconnect(ContextMenu_ActionEvent);
	Controller.mousePressEvent.disconnect(ContextMenu_MousePressEvent);
	Controller.mouseReleaseEvent.disconnect(ContextMenu_MouseReleaseEvent);
	Entities.mousePressOnEntity.disconnect(ContextMenu_EntityClick);
	Script.update.disconnect(ContextMenu_Update);
	Picks.removePick(targetingPick);
	ContextMenu_DeleteMenu();
	Messages.sendLocalMessage(MAIN_CHANNEL, JSON.stringify({func: "shutdown"}));
});
