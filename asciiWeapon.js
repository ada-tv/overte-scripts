// SPDX-License-Identifier: CC0-1.0
const WEAPON_TEXT = "<-{=====>";
const WEAPON_FONT = "Courier";
const WEAPON_COLOR = "#0ff";
const WEAPON_OUTLINE_COLOR = "#00f";
const EQUIP_SOUND = SoundCache.getSound(Script.resolvePath("ascii_weapon_equip.wav"));
const SWING_SOUND = SoundCache.getSound(Script.resolvePath("ascii_weapon_swing.wav"));
const HIT_SOUND = SoundCache.getSound(Script.resolvePath("ascii_weapon_hit.wav"));

EQUIP_SOUND.ready.connect(() => {
	Audio.playSound(EQUIP_SOUND, {
		position: MyAvatar.position,
		volume: 0.3,
	});
});

let weaponEntity, weaponBackEntity;

const HAND_POS_REST = {x: -0.3, y: 0.3, z: 0.2};
const HAND_ROT_REST = Quat.fromPitchYawRollDegrees(90, 0, 110);

let handTargetPosition = HAND_POS_REST;
let handTargetRotation = HAND_ROT_REST;
let handAnimTime = 0.0;
let isSwinging = false;

function update(delta) {
	const pi = Math.PI;
	const t = handAnimTime + 0.5;

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
		handTargetPosition = Vec3.mix(handTargetPosition, HAND_POS_REST, delta * 4);
		handTargetRotation = Quat.slerp(handTargetRotation, HAND_ROT_REST, delta * 4);
	}

	if (handAnimTime >= 2.05) {
		isSwinging = false;
		handAnimTime = 0.0;
	}
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
	type: "Text",
	name: "ASCII Weapon",
	collisionless: true,
	parentID: MyAvatar.sessionUUID,
	parentJointIndex: MyAvatar.getJointIndex("RightHand"),
	text: WEAPON_TEXT,
	lineHeight: 0.25,
	font: WEAPON_FONT,
	textColor: WEAPON_COLOR,
	textEffect: "outline fill",
	textEffectColor: WEAPON_OUTLINE_COLOR,
	textEffectThickness: 0.4,
	alignment: "left",
	verticalAlignment: "center",
	unlit: true,
	dimensions: [1.25, 0.3, 0.01],
	backgroundAlpha: 0,
	localPosition: [0.42, 0.15, 0.04],
	grab: {grabbable: false},
}, "avatar");

weaponBackEntity = Entities.addEntity({
	type: "Text",
	name: "ASCII Weapon Backface",
	collisionless: true,
	parentID: weaponEntity,
	text: WEAPON_TEXT,
	lineHeight: 0.25,
	font: WEAPON_FONT,
	textColor: WEAPON_COLOR,
	textEffect: "outline fill",
	textEffectColor: WEAPON_OUTLINE_COLOR,
	textEffectThickness: 0.4,
	alignment: "left",
	verticalAlignment: "center",
	unlit: true,
	dimensions: [3, 1, 0.01],
	backgroundAlpha: 0,
	localRotation: Quat.fromPitchYawRollDegrees(180, 0, 0),
	localPosition: [0.94, -0.05, 0.02],
	grab: {grabbable: false},
}, "avatar");

const animStateHandler = MyAvatar.addAnimationStateHandler(animationHandler, [
	"rightHandType",
	"rightHandPosition",
	"rightHandRotation",
]);

// if you're in vr you can just swing your arm
if (!HMD.active) {
	Script.update.connect(update);
	Controller.mousePressEvent.connect(clickEvent);
}

Entities.enterEntity.connect(weaponHit);

Script.scriptEnding.connect(() => {
	Entities.deleteEntity(weaponBackEntity);
	Entities.deleteEntity(weaponEntity);
	MyAvatar.removeAnimationStateHandler(animStateHandler);
	Script.update.disconnect(update);
	Controller.mousePressEvent.disconnect(clickEvent);
	Entities.enterEntity.disconnect(weaponHit);
});
