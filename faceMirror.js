// SPDX-License-Identifier: CC0-1.0
"use strict";
const ContextMenu = Script.require("contextMenu");
const SecondaryCamera = Render.getConfig("SecondaryCamera");

const RADIUS = 0.3;

let mirrorEnabled = Settings.getValue("faceMirror/enabled", true);
let mirrorActive = false;
let sensorScale = MyAvatar.sensorToWorldScale;
let mirrorEntity = null;
let cameraPoint = null;

function userScaled(x) {
    if (typeof(x) === "number") {
        return x * sensorScale;
    } else {
        return Vec3.multiply(x, sensorScale);
    }
}

function showMirror() {
    if (mirrorActive) { return; }

    mirrorEntity = Entities.addEntity({
        parentID: MyAvatar.SELF_ID,
        parentJointIndex: 65529,
        type: "Image",
        name: "Face mirror",
        imageURL: "resource://spectatorCameraFrame",
        ignorePickIntersection: true,
        grab: { grabbable: false },
        emissive: true,
        keepAspectRatio: true,
        isVisibleInSecondaryCamera: false,
        localDimensions: userScaled([RADIUS, RADIUS, RADIUS]),
        localPosition: userScaled([0, -0.3, -0.8]),
        localRotation: Quat.IDENTITY,
        collisionless: true,
        renderLayer: "front",
        alpha: 0.8,
    }, "local");

    cameraPoint = Entities.addEntity({
        type: "Empty",
        name: "Face mirror camera pivot",
        parentID: MyAvatar.SELF_ID,
        parentJointIndex: MyAvatar.getJointIndex("Head"),
        grab: { grabbable: false },
        ignorePickIntersection: true,
        collisionless: true,
        localPosition: userScaled([0, 0, 0.8]),
        localRotation: Quat.fromPitchYawRollDegrees(0, 0, 180),
    }, "local");

    SecondaryCamera.enableSecondaryCameraRenderConfigs(true);
    SecondaryCamera.resetSizeSpectatorCamera(512, 512);
    SecondaryCamera.attachedEntityId = cameraPoint;
    SecondaryCamera.nearClipPlaneDistance = userScaled(0.4);
    SecondaryCamera.farClipPlaneDistance = userScaled(1);
    SecondaryCamera.vFoV = 30;

    mirrorActive = true;
}

MyAvatar.sensorToWorldScaleChanged.connect(scale => {
    sensorScale = scale;

    if (!mirrorActive) { return; }

    Entities.editEntity(mirrorEntity, {
        localDimensions: userScaled([RADIUS, RADIUS, RADIUS]),
        localPosition: userScaled([0, -0.3, -0.8]),
    });
    Entities.editEntity(cameraPoint, {
	    localPosition: userScaled([0, 0, 0.8]),
    });

    SecondaryCamera.nearClipPlaneDistance = userScaled(0.4);
    SecondaryCamera.farClipPlaneDistance = userScaled(1);
});

function closeMirror() {
    if (!mirrorActive) { return; }

	SecondaryCamera.vFoV = 90;
	SecondaryCamera.attachedEntityId = null;
	SecondaryCamera.enableSecondaryCameraRenderConfigs(false);

	Entities.deleteEntity(mirrorEntity);
	Entities.deleteEntity(cameraPoint);

    mirrorEntity = null;
    cameraPoint = null;

    mirrorActive = false;
}

const actionSet = [
    {
        text: `[${mirrorEnabled ? "X" : "  "}] Face mirror`,
        localClickFunc: "faceMirror.toggle",
    }
];

ContextMenu.registerActionSet("faceMirror", actionSet, ContextMenu.SELF_SET);

Messages.messageReceived.connect((channel, msg, _senderID, localOnly) => {
	if (channel !== ContextMenu.CLICK_FUNC_CHANNEL) { return; }
	if (!localOnly) { return; }

	const data = JSON.parse(msg);

	if (data.func === "faceMirror.toggle") {
        mirrorEnabled = !mirrorEnabled;
        Settings.setValue("faceMirror/enabled", mirrorEnabled);

        actionSet[0].text = `[${mirrorEnabled ? "X" : "  "}] Face mirror`;
        ContextMenu.editActionSet("faceMirror", actionSet);

        if (mirrorEnabled) {
            showMirror();
        } else {
            closeMirror();
        }
    }
});

Script.scriptEnding.connect(() => {
    closeMirror();
    ContextMenu.unregisterActionSet("faceMirror");
});

if (mirrorEnabled) { showMirror(); }
