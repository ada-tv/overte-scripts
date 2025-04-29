// SPDX-License-Identifier: CC0-1.0
// Avatar Grab, written by Ada <ada@thingvellir.net> 2025
const DEBUG = false;
const msgChannel = "AvatarGrab";
const leave_action = Controller.findAction("TranslateY");

const ContextMenu = Script.require(Script.resolvePath("contextMenuApi.js"));

let grabActiveEnabled = true, grabTargetEnabled = false;

const contextActionSet = {
	toggleActive: {
		text: "[X] Can grab avatars",
		localClickFunc: "avatarGrabSettings.toggleActive",
	},
	toggleTarget: {
		text: "[   ] Can be grabbed",
		localClickFunc: "avatarGrabSettings.toggleTarget",
	},
};

let lastPositions = [];
let currentGrabHostID;
let currentGrabJoint;

let S_Dbg = DEBUG ? ((msg) => print(msg)) : ((_msg) => {});

function S_Leave() {
	MyAvatar.endSit(MyAvatar.position, Quat.IDENTITY);
	MyAvatar.setParentID(Uuid.NULL);
	MyAvatar.setOtherAvatarsCollisionsEnabled(true);
	MyAvatar.setCollisionsEnabled(true);
	Controller.actionEvent.disconnect(S_LeaveEvent);

	let avgPosition = Vec3.ZERO;
	for (const pos of lastPositions) {
		avgPosition = Vec3.sum(avgPosition, pos);
	}
	avgPosition = Vec3.multiply(1.0 / lastPositions.length, avgPosition);
	MyAvatar.velocity = Vec3.subtract(MyAvatar.position, avgPosition);

	S_Dbg(`S_Leave: ${JSON.stringify(MyAvatar.velocity)}`);

	currentGrabHostID = undefined;
	currentGrabJoint = undefined;
	lastPositions = [];
	Script.update.disconnect(S_Update);
}

function S_LeaveEvent(action, value) {
	if (action != leave_action || value < 0.1) { return; }

	S_Dbg(`S_LeaveEvent(${action}, ${value})`);

	S_Leave();
}

function S_Update(_delta) {
	if (lastPositions.length > 4) { lastPositions.splice(0); }
	lastPositions.push(MyAvatar.position);
}

function S_SphereCapsuleTest(org, handRadius) {
	const radius = MyAvatar.getCollisionCapsule().radius + handRadius;
	const cap_top = Vec3.sum(MyAvatar.position, {x: 0, y: MyAvatar.getHeight() / 2, z: 0});
	const cap_bottom = Vec3.sum(MyAvatar.position, {x: 0, y: -MyAvatar.getHeight() / 2, z: 0});
	const center_top = Vec3.mix(cap_top, cap_bottom, 0.25);
	const center = Vec3.mix(cap_top, cap_bottom, 0.5);
	const center_bottom = Vec3.mix(cap_top, cap_bottom, 0.75);

	S_Dbg(`S_PointCapsuleTest((${org.x}, ${org.y}, ${org.z}), ${radius}}`);

	if (DEBUG) {
		Entities.addEntity({
			type: "Sphere",
			lifetime: 2,
			position: cap_top,
			dimensions: {x: radius * 2, y: radius * 2, z: radius * 2},
			alpha: 0.3,
			color: {r: 0, g: 255, b: 255},
			collisionless: true,
			unlit: true,
		}, "local");
		Entities.addEntity({
			type: "Sphere",
			lifetime: 2,
			position: cap_bottom,
			dimensions: {x: radius * 2, y: radius * 2, z: radius * 2},
			alpha: 0.3,
			color: {r: 0, g: 255, b: 255},
			collisionless: true,
			unlit: true,
		}, "local");
		Entities.addEntity({
			type: "Sphere",
			lifetime: 2,
			position: center,
			dimensions: {x: radius * 2, y: radius * 2, z: radius * 2},
			alpha: 0.3,
			color: {r: 0, g: 255, b: 255},
			collisionless: true,
			unlit: true,
		}, "local");
		Entities.addEntity({
			type: "Sphere",
			lifetime: 2,
			position: center_top,
			dimensions: {x: radius * 2, y: radius * 2, z: radius * 2},
			alpha: 0.3,
			color: {r: 0, g: 255, b: 255},
			collisionless: true,
			unlit: true,
		}, "local");
		Entities.addEntity({
			type: "Sphere",
			lifetime: 2,
			position: center_bottom,
			dimensions: {x: radius * 2, y: radius * 2, z: radius * 2},
			alpha: 0.3,
			color: {r: 0, g: 255, b: 255},
			collisionless: true,
			unlit: true,
		}, "local");
	}

	if (Vec3.distance(org, cap_top) < radius) { return true; }
	if (Vec3.distance(org, cap_bottom) < radius) { return true; }
	if (Vec3.distance(org, center) < radius) { return true; }
	if (Vec3.distance(org, center_top) < radius) { return true; }
	if (Vec3.distance(org, center_bottom) < radius) { return true; }

	return false;
}

function S_GrabRecv(grabberID, jointName, radius, origin) {
	if (!grabTargetEnabled) { return; }

	S_Dbg(`S_GrabRecv(${grabberID}, ${jointName}, ${radius}, ${JSON.stringify(origin)})`);

	if (Uuid.isNull(grabberID) || Uuid.isEqual(MyAvatar.sessionUUID, grabberID)) { return; }

	const target_id = grabberID;
	const targ_joint_name = jointName;
	const target = AvatarList.getAvatar(target_id);
	const targ_joint = target.getJointIndex(targ_joint_name);

	if (!S_SphereCapsuleTest(origin, radius)) { return; }

	MyAvatar.setParentID(target_id);
	MyAvatar.setParentJointIndex(targ_joint);
	MyAvatar.beginSit(MyAvatar.position, MyAvatar.orientation);
	MyAvatar.setOtherAvatarsCollisionsEnabled(false);
	MyAvatar.setCollisionsEnabled(false);
	currentGrabHostID = grabberID;
	currentGrabJoint = jointName;

	Controller.actionEvent.connect(S_LeaveEvent);
	Script.update.connect(S_Update);
}

function S_ReleaseRecv(grabberID, jointName) {
	S_Dbg(`S_ReleaseRecv(${grabberID}, ${jointName})`);
	if (!Uuid.isEqual(grabberID, currentGrabHostID) || jointName !== currentGrabJoint) { return; }
	S_Leave();
}

function S_GrabSend(joint = "RightHand") {
	if (!grabActiveEnabled) { return; }

	S_Dbg(`S_GrabSend(${joint})`);

	const jointIndex = MyAvatar.getJointIndex(joint);
	const handOrigin = Vec3.sum(
		MyAvatar.position,
		Vec3.multiplyQbyV(
			MyAvatar.orientation,
			MyAvatar.getAbsoluteJointTranslationInObjectFrame(jointIndex)
		)
	);

	if (DEBUG) {
		Entities.addEntity({
			type: "Sphere",
			lifetime: 2,
			position: handOrigin,
			dimensions: {x: 0.3, y: 0.3, z: 0.3},
			alpha: 0.3,
			color: {r: 0, g: 255, b: 0},
			collisionless: true,
			unlit: true,
		}, "local");
	}

	const data = {
		type: "grab",
		grabberID: MyAvatar.sessionUUID,
		jointName: joint,
		origin: handOrigin,
		radius: 0.3 * MyAvatar.scale,
	};
	Messages.sendMessage(msgChannel, JSON.stringify(data));
}

function S_ReleaseSend(jointName) {
	S_Dbg(`S_ReleaseSend(${jointName})`);

	if (DEBUG) {
		const jointIndex = MyAvatar.getJointIndex(jointName);
		const handOrigin = Vec3.sum(
			MyAvatar.position,
			Vec3.multiplyQbyV(
				MyAvatar.orientation,
				MyAvatar.getAbsoluteJointTranslationInObjectFrame(jointIndex)
			)
		);

		Entities.addEntity({
			type: "Sphere",
			lifetime: 2,
			position: handOrigin,
			dimensions: {x: 0.3, y: 0.3, z: 0.3},
			alpha: 0.3,
			color: {r: 255, g: 0, b: 0},
			collisionless: true,
			unlit: true,
		}, "local");
	}

	const data = {type: "release", grabberID: MyAvatar.sessionUUID, jointName: jointName};
	Messages.sendMessage(msgChannel, JSON.stringify(data));
}

let leftGrabAlreadySent = false;
let rightGrabAlreadySent = false;
let leftReleaseAlreadySent = false;
let rightReleaseAlreadySent = false;

function S_InputEvent(action, value) {
	if (action === Controller.Standard.LeftGrip) {
		if (value > 0.9 && !leftGrabAlreadySent) {
			S_GrabSend("LeftHand");
			leftGrabAlreadySent = true;
			leftReleaseAlreadySent = false;
		} else if (value < 0.2 && !leftReleaseAlreadySent) {
			S_ReleaseSend("LeftHand");
			leftGrabAlreadySent = false;
			leftReleaseAlreadySent = true;
		}
		return;
	}

	if (action === Controller.Standard.RightGrip) {
		if (value > 0.9 && !rightGrabAlreadySent) {
			S_GrabSend("RightHand");
			rightGrabAlreadySent = true;
			rightReleaseAlreadySent = false;
		} else if (value < 0.2 && !rightReleaseAlreadySent) {
			S_ReleaseSend("RightHand");
			rightGrabAlreadySent = false;
			rightReleaseAlreadySent = true;
		}
		return;
	}
}

function S_KeyPressEvent(event) {
	if (event.text !== "g" || event.isAutoRepeat) { return; }
	S_Dbg(`S_KeyPressEvent(${JSON.stringify(event)})`);
	S_GrabSend("RightHand");
}

function S_KeyReleaseEvent(event) {
	if (event.text !== "g" || event.isAutoRepeat) { return; }
	S_Dbg(`S_KeyReleaseEvent(${JSON.stringify(event)})`);
	S_ReleaseSend("RightHand");
}

function S_MsgRecv(channel, rawdata, senderID, localOnly) {
	if (ContextMenu && channel === ContextMenu.CLICK_FUNC_CHANNEL) {
		if (senderID !== MyAvatar.sessionUUID) { return; }

		const data = JSON.parse(rawdata);

		switch (data.funcName) {
			case "avatarGrabSettings.toggleActive":
				grabActiveEnabled = !grabActiveEnabled;
				contextActionSet.toggleActive.text = (grabActiveEnabled ? "[X]" : "[   ]") + " Can grab avatars";
				ContextMenu.editActionSet("avatarGrabSettings", contextActionSet);
				break;

			case "avatarGrabSettings.toggleTarget":
				grabTargetEnabled = !grabTargetEnabled;
				contextActionSet.toggleTarget.text = (grabTargetEnabled ? "[X]" : "[   ]") + " Can be grabbed";
				ContextMenu.editActionSet("avatarGrabSettings", contextActionSet);
				break;
		}

		return;
	}

	if (channel !== msgChannel) { return; }

	S_Dbg(`S_MsgRecv(${channel}, ${rawdata}, ${senderID}, ${localOnly})`);

	const data = JSON.parse(rawdata);

	if (data.type === "grab") {
		S_GrabRecv(data.grabberID, data.jointName, data.radius, data.origin);
	} else if (data.type === "release") {
		S_ReleaseRecv(data.grabberID, data.jointName);
	}
}

Messages.subscribe(msgChannel);
Messages.messageReceived.connect(S_MsgRecv);
Controller.inputEvent.connect(S_InputEvent);
Controller.keyPressEvent.connect(S_KeyPressEvent);
Controller.keyReleaseEvent.connect(S_KeyReleaseEvent);

if (ContextMenu) {
	ContextMenu.registerActionSet("avatarGrabSettings", contextActionSet, "_SELF");
}

Script.scriptEnding.connect(() => {
	S_Leave();
	Controller.inputEvent.disconnect(S_InputEvent);
	Controller.actionEvent.disconnect(S_LeaveEvent);
	Controller.keyPressEvent.disconnect(S_KeyPressEvent);
	Controller.keyReleaseEvent.disconnect(S_KeyReleaseEvent);
	Messages.messageReceived.disconnect(S_MsgRecv);
	Messages.unsubscribe(msgChannel);

	if (ContextMenu) {
		ContextMenu.unregisterActionSet("avatarGrabSettings");
	}
});
