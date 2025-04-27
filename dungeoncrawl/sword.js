// SPDX-License-Identifier: CC0-1.0
const EQUIP_SOUND = SoundCache.getSound(Script.resolvePath("assets/weapon_equip.wav"));
const SWING_SOUND = SoundCache.getSound(Script.resolvePath("assets/weapon_swing.wav"));
const HIT_SOUND = SoundCache.getSound(Script.resolvePath("assets/weapon_hit.wav"));

EQUIP_SOUND.ready.connect(() => {
	Audio.playSound(EQUIP_SOUND, {
		position: MyAvatar.position,
		volume: 0.3,
	});
});

let weaponEntity;

const HAND_POS_REST = {x: -0.3, y: 0.3, z: 0.2};
const HAND_ROT_REST = Quat.fromPitchYawRollDegrees(90, 0, 110);

let handTargetPosition = HAND_POS_REST;
let handTargetRotation = HAND_ROT_REST;
let updateTime = 0;
let handAnimTime = 0.0;
let isSwinging = false;

function update(delta) {
	const pi = Math.PI;
	const t = handAnimTime + 0.5;

	const restPos = {
		x: -0.3 + Math.sin(updateTime) * -0.005,
		y: 0.3 + Math.sin(updateTime * 0.5) * 0.02,
		z: 0.2 + Math.cos(updateTime * 0.5) * 0.01,
	};
	const restRot = Quat.fromPitchYawRollDegrees(
		90 + Math.cos(updateTime * 0.5) * 2,
		0,
		110 + Math.sin(updateTime) * 2
	);

	if (isSwinging) {
		handTargetPosition = {
			x: -0.3 + Math.cos(-t * pi) * 0.2,
			y: 0.3 + Math.sin(-t * pi) * 0.2,
			z: 0.3 + Math.cos(-t * pi) * 0.5,
		};

		handTargetRotation = Quat.fromPitchYawRollDegrees(
			90 + Math.sin((pi / 3) + -t * pi) * 50,
			0 + Math.sin(-t * pi - (pi / 3)) * 50,
			90 - Math.cos(-t * pi) * 30,
		);

		handAnimTime += delta * 4;
	} else {
		handTargetPosition = Vec3.mix(handTargetPosition, restPos, delta * 4);
		handTargetRotation = Quat.slerp(handTargetRotation, restRot, delta * 4);
	}

	if (handAnimTime >= 2.05) {
		isSwinging = false;
		handAnimTime = 0.0;
	}

	updateTime += delta;
}

function animationHandler(_props) {
	return {
		rightHandType: 0,
		rightHandPosition: handTargetPosition,
		rightHandRotation: handTargetRotation,
	};
}

function clickEvent(event) {
	if (event.isLeftButton) {
		handAnimTime = 0.0;
		isSwinging = true;

		Audio.playSound(SWING_SOUND, {
			position: MyAvatar.position,
			volume: 0.3,
		});
	}
}

function weaponHit(avatarID) {
	if (Uuid.isEqual(avatarID, MyAvatar.sessionUUID)) { return; }

	const avatar = AvatarList.getAvatar(avatarID);

	Audio.playSound(HIT_SOUND, {
		position: avatar.position,
		volume: 0.3,
	});
}

weaponEntity = Entities.addEntity({
	type: "Model",
	name: "Sword",
	modelURL: Script.resolvePath("assets/models/sword.glb"),
	useOriginalPivot: true,
	collisionless: true,
	parentID: MyAvatar.sessionUUID,
	parentJointIndex: MyAvatar.getJointIndex("RightHand"),
	localPosition: [0.0, 0.1, 0.03],
	localRotation: Quat.fromPitchYawRollDegrees(0, 0, -90),
	grab: {grabbable: false},
}, "avatar");

let animStateHandler;

// if you're in vr you can just swing your arm
if (!HMD.active) {
	animStateHandler = MyAvatar.addAnimationStateHandler(animationHandler, [
		"rightHandType",
		"rightHandPosition",
		"rightHandRotation",
	]);

	Script.update.connect(update);
	Controller.mousePressEvent.connect(clickEvent);
}

Entities.enterEntity.connect(weaponHit);

Script.scriptEnding.connect(() => {
	Entities.deleteEntity(weaponEntity);
	MyAvatar.removeAnimationStateHandler(animStateHandler);
	Script.update.disconnect(update);
	Controller.mousePressEvent.disconnect(clickEvent);
	Entities.enterEntity.disconnect(weaponHit);
});
