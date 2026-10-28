// avatarTouch.js - Ada <ada@thingvellir.net> 2026-10-24
// SPDX-License-Identifier: CC0-1.0
"use strict";

const UtilMath = require("utilMath");

/** @type {string} */
const MSG_CHANNEL = "AvatarTouch";

/**
 * If `true`, will show debug indicators
 * for touch areas and avatar fingertips.
 * White spheres are touch areas, and cyan
 * spheres are fingertips.
 * @type {boolean}
 */
const DEBUG = Settings.getValue("avatarTouch/debug", false);

/**
 * If `true`, you won't trigger touch events on your own avatar.
 * @type {boolean}
 */
let IGNORE_MY_AVATAR = Settings.getValue("avatarTouch/ignoreMe", false);

/**
 * If `true` then other avatars won't trigger touch events on your avatar.
 * If [IGNORE_MY_AVATAR] is `true` too then touch events will never be triggered.
 * @type {boolean}
 */
let IGNORE_OTHER_AVATARS = Settings.getValue("avatarTouch/ignoreOthers", false);

/**
 * How often to refresh the list of nearby avatars, in seconds.
 * @type {number}
 */
const NEARBY_AVATARS_INTERVAL = 2;

/**
 * The maximum distance to check for nearby avatars, in meters.
 * @type {number}
 */
const MAX_AVATAR_DIST = 3;

/** @type {number} */
const TICK_INTERVAL = 1.0 / 30.0;

/**
 * Ignore touches that happen within this interval in milliseconds,
 * so slight jitters in position don't trigger multiple touch events.
 * @type {number}
 */
const TOUCH_DEBOUNCE_MS = 250;

/**
 * The default radius for fingertips when an avatar doesn't have fingertip bones.
 * @type {number}
 */
const FINGER_TOUCH_RADIUS = 0.02;

/**
 * A fallback radius for an avatar's hand, if we can't find distal or middle finger joints.
 * @type {number}
 */
const FALLBACK_HAND_RADIUS = 0.07;

class TouchArea {
    /** @type {string} */
    name;
    /** @type {string} */
    jointName;
    /** @type {Vec3} */
    offset;
    /** @type {number} */
    radius;

    /** @type {Vec3} */
    worldPos = [0, 0, 0];
    /** @type {number} */
    jointIndex = -1;
    /** @type {boolean} */
    isTouched = false;
    /** @type {boolean} */
    wasTouched = false;
    /** @type {Uuid} */
    debugVisual = null;
    /** @type {number} */
    touchTime = 0;
    /** @type {number} */
    releaseTime = 0;

    constructor({
        name,
        jointName,
        offset = [0, 0, 0],
        radius = 0.04
    }) {
        this.name = name;
        this.jointName = jointName;
        this.offset = offset;
        this.radius = radius;
    }
}

/** @type {Map<Uuid, TouchArea>} */
let touchAreas = new Map();

/** @type {Map<Uuid, Object>} */
let nearbyAvatars = new Map();

let nearbyAvatarsInterval = null;
let tickInterval = null;

function resetAreaJoints() {
    for (let area of touchAreas.values()) {
        area.jointIndex = MyAvatar.getJointIndex(area.jointName);
    }

    if (DEBUG) {
        for (const area of touchAreas.values()) {
            Entities.deleteEntity(area.debugVisual);

            if (area.jointIndex === -1) { continue; }

            const localRadius = area.radius * MyAvatar.scale;

            area.debugVisual = Entities.addEntity({
                type: "Sphere",
                localPosition: area.offset,
                dimensions: [
                    localRadius * 2,
                    localRadius * 2,
                    localRadius * 2,
                ],
                alpha: 0.5,
                ignorePickIntersection: true,
                grab: { grabbable: false },
                renderLayer: "front",
            }, "local");

            Entities.addEntity({
                type: "Text",
                parentID: area.debugVisual,
                ignorePickIntersection: true,
                grab: { grabbable: false },
                renderLayer: "front",
                backgroundAlpha: 0.0,
                textAlpha: 0.5,
                text: area.name,
                billboardMode: "full",
                localPosition: [0, 0.06 + localRadius, 0],
                localDimensions: [1, 0.1, 0],
                unlit: true,
                lineHeight: 0.03,
                textEffect: "outline fill",
                textEffectThickness: 0.4,
                textEffectColor: [0, 0, 0],
                alignment: "center",
                verticalAlignment: "bottom",
            }, "local");
        }
    }
}

function refreshNearbyAvatars() {
    // nothing to process, don't bother
    if (touchAreas.length === 0 || (IGNORE_MY_AVATAR && IGNORE_OTHER_AVATARS)) { return; }

    /** @type {Vec3} */
    const myPos = MyAvatar.position;

    /** @type {Uuid} */
    const myID = MyAvatar.sessionUUID;

    {
        // remove anyone that's too far away
        let avatarsToPrune = [];

        for (const [id, avatar] of nearbyAvatars.entries()) {
            if (Vec3.distance(avatar.object.position, myPos) > MAX_AVATAR_DIST) {
                avatarsToPrune.push(id);
            }
        }

        for (const id of avatarsToPrune) {
            nearbyAvatars.get(id).destroy();
            nearbyAvatars.delete(id);
        }
    }

    /** @type {Array<Uuid>} */
    const avatars = (
        IGNORE_OTHER_AVATARS ?
        [MyAvatar.sessionUUID] :
        AvatarManager.getAvatarsInRange(myPos, MAX_AVATAR_DIST)
    );

    // add anyone new
    for (const id of avatars) {
        if (nearbyAvatars.has(id)) { continue; }
        if (IGNORE_MY_AVATAR && (id === myID)) { continue; }

        let object = AvatarManager.getAvatar(id);

        let state = {
            object,
            leftHandJoint: -1,
            rightHandJoint: -1,
            leftHandPos: [0, 0, 0],
            rightHandPos: [0, 0, 0],
            leftHandRadius: FINGER_TOUCH_RADIUS,
            rightHandRadius: FINGER_TOUCH_RADIUS,
            leftDebugVisual: null,
            rightDebugVisual: null,

            destroy() {
                if (DEBUG) {
                    Entities.deleteEntity(this.leftDebugVisual);
                    Entities.deleteEntity(this.rightDebugVisual);
                }
                this.object.skeletonModelURLChanged.disconnect(this.modelCallback);
            },

            refreshHandStates() {
                this.leftHandJoint = this.object.getJointIndex("LeftHandIndex3");
                this.rightHandJoint = this.object.getJointIndex("RightHandIndex3");

                let radii = [FINGER_TOUCH_RADIUS, FINGER_TOUCH_RADIUS];

                // if the avatar has fingertip bones use them for sizing,
                // otherwise assume a reasonable default
                if (this.leftHandJoint !== -1 && this.rightHandJoint !== -1) {
                    const leftTipJoint = this.object.getJointIndex("LeftHandIndex4");
                    const rightTipJoint = this.object.getJointIndex("RightHandIndex4");

                    for (const [i, joint] of [leftTipJoint, rightTipJoint].entries()) {
                        if (joint === -1) { continue; }

                        let length = this.object.getJointTranslation(joint).y;

                        // this model is probably an FBX in centimeters
                        // if the fingers seem particularly huge
                        if (length > 1.0) { length /= 100.0; }

                        radii[i] = length / 2.0;
                    }
                } else {
                    // couldn't find an appropriate finger, fall back to using the whole hand
                    this.leftHandJoint = this.object.getJointIndex("LeftHand");
                    this.rightHandJoint = this.object.getJointIndex("RightHand");
                    radii[0] = FALLBACK_HAND_RADIUS;
                    radii[1] = FALLBACK_HAND_RADIUS;
                }

                this.leftHandRadius = radii[0];
                this.rightHandRadius = radii[1];

                if (DEBUG) {
                    Entities.deleteEntity(this.leftDebugVisual);
                    Entities.deleteEntity(this.rightDebugVisual);

                    const props = {
                        type: "Sphere",
                        color: [0, 255, 255],
                        alpha: 0.5,
                        dimensions: [
                            this.leftHandRadius * 2 * this.object.scale,
                            this.leftHandRadius * 2 * this.object.scale,
                            this.leftHandRadius * 2 * this.object.scale,
                        ],
                        ignorePickIntersection: true,
                        grab: { grabbable: false },
                        renderLayer: "front",
                    };

                    this.leftDebugVisual = Entities.addEntity(props, "local");
                    this.rightDebugVisual = Entities.addEntity(props, "local");
                }
            },
        };

        state.refreshHandStates();

        // forced delay, overte-org/overte#2419
        state.modelCallback = () => Script.setTimeout(() => state.refreshHandStates(), 1000);

        object.skeletonModelURLChanged.connect(state.modelCallback);

        nearbyAvatars.set(id, state);
    }
}

function tick() {
    // nothing to process, don't bother
    if (
        touchAreas.size === 0 ||
        nearbyAvatars.size === 0 ||
        (IGNORE_MY_AVATAR && IGNORE_OTHER_AVATARS)
    ) { return; }

    const myID = MyAvatar.sessionUUID;
    const myScale = MyAvatar.scale;

    for (let area of touchAreas.values()) {
        if (area.jointIndex === -1) { continue; }

        area.worldPos = Entities.localToWorldPosition(area.offset, myID, area.jointIndex, true);
        area.wasTouched = area.isTouched;

        if (DEBUG) {
            const touchColors = [
                UtilMath.color(255, 192, 0, 240),
                UtilMath.color(255, 192, 0, 128),
            ];
            const releaseColors = [
                UtilMath.color(0, 192, 255, 240),
                UtilMath.color(255, 255, 255, 64),
            ];

            /** @type {Color8} */
            let color;

            if (area.isTouched) {
                color = touchColors[0].lerpTo(
                    touchColors[1],
                    Math.min((Date.now() - area.touchTime) / 500, 1.0)
                );
            } else {
                color = releaseColors[0].lerpTo(
                    releaseColors[1],
                    Math.min((Date.now() - area.releaseTime) / 500, 1.0)
                );
            }

            Entities.editEntity(area.debugVisual, {
                color,
                alpha: color.a / 255,
                position: area.worldPos,
                dimensions: [
                    area.radius * 2 * myScale,
                    area.radius * 2 * myScale,
                    area.radius * 2 * myScale,
                ],
            });
        }

        area.isTouched = false;
    }

    for (const [avatarID, state] of nearbyAvatars.entries()) {
        const yourScale = state.object.scale;
        const leftRadius = yourScale * state.leftHandRadius;
        const rightRadius = yourScale * state.rightHandRadius;

        const prevLeftPos = state.leftHandPos;
        const prevRightPos = state.rightHandPos;

        state.leftHandPos = Entities.localToWorldPosition(
            [0, leftRadius, 0], avatarID, state.leftHandJoint);
        state.rightHandPos = Entities.localToWorldPosition(
            [0, rightRadius, 0], avatarID, state.rightHandJoint);

        const leftHandSpeed = Vec3.distance(state.leftHandPos, prevLeftPos) / TICK_INTERVAL;
        const rightHandSpeed = Vec3.distance(state.rightHandPos, prevRightPos) / TICK_INTERVAL;

        if (DEBUG) {
            Entities.editEntity(state.leftDebugVisual, {
                position: state.leftHandPos,
                dimensions: [ leftRadius * 2, leftRadius * 2, leftRadius * 2 ],
            });
            Entities.editEntity(state.rightDebugVisual, {
                position: state.rightHandPos,
                dimensions: [ rightRadius * 2, rightRadius * 2, rightRadius * 2 ],
            });
        }

        for (let [areaID, area] of touchAreas.entries()) {
            if (area.jointIndex === -1) { continue; }

            const touchRadius = area.radius * myScale;

            const leftDist = Vec3.distance(state.leftHandPos, area.worldPos);
            const rightDist = Vec3.distance(state.rightHandPos, area.worldPos);

            const leftTouching = leftDist < (touchRadius + leftRadius);
            const rightTouching = rightDist < (touchRadius + rightRadius);

            area.isTouched = area.isTouched || rightTouching || leftTouching;

            const now = Date.now()

            if (!area.wasTouched && area.isTouched && (area.touchTime + TOUCH_DEBOUNCE_MS) < now) {
                const rightHand = rightTouching;

                area.touchTime = now;

                Messages.sendLocalMessage(MSG_CHANNEL, JSON.stringify({
                    event: "touch",
                    area: areaID,
                    toucher: avatarID,
                    hand: rightHand ? "right" : "left",
                    speed: rightHand ? rightHandSpeed : leftHandSpeed,
                    position: area.worldPos,
                }));
            } else if (!area.isTouched && area.wasTouched) {
                area.releaseTime = now;

                Messages.sendLocalMessage(MSG_CHANNEL, JSON.stringify({
                    event: "touch_release",
                    area: areaID,
                }));
            }

            if (area.isTouched) {
                const dist = ((rightTouching) ? rightDist : leftDist) / area.radius;

                Messages.sendLocalMessage(MSG_CHANNEL, JSON.stringify({
                    event: "touch_pressure",
                    area: areaID,
                    pressure: 1.0 - UtilMath.clamp(dist, 0.0, 1.0),
                }));
            }
        }
    }
}

function shutdown() {
    Messages.sendLocalMessage(MSG_CHANNEL, JSON.stringify({ event: "system_shutdown" }));

    if (DEBUG) {
        for (const area of touchAreas.values()) {
            Entities.deleteEntity(area.debugVisual);
        }
    }

    for (const avatar of nearbyAvatars.values()) {
        avatar.destroy();
    }

    Script.clearInterval(tickInterval);
    Script.clearInterval(nearbyAvatarsInterval);
}

function startup() {
    // forced delay, overte-org/overte#2419
    const jointWaitHack = () => Script.setTimeout(resetAreaJoints, 1000);

    MyAvatar.onLoadComplete.connect(resetAreaJoints);
    AvatarManager.avatarRemovedEvent.connect(id => {
        nearbyAvatars.get(id)?.destroy();
        nearbyAvatars.delete(id);
    });
    nearbyAvatarsInterval = Script.setInterval(refreshNearbyAvatars, NEARBY_AVATARS_INTERVAL * 1000);
    tickInterval = Script.setInterval(tick, TICK_INTERVAL * 1000);
    jointWaitHack();

    const ping = () => {
        Messages.sendLocalMessage(MSG_CHANNEL, JSON.stringify({ event: "system_ping" }));
    };

    Script.setInterval(ping, 1000);
    ping();
}

Messages.messageReceived.connect((channel, rawMsg, _senderID, localOnly) => {
    if (!localOnly || channel !== MSG_CHANNEL) { return; }

    const msg = JSON.parse(rawMsg);

    switch (msg.event) {
        case "add_area": {
            if (
                !Object.hasOwn(msg, "uuid") ||
                !Object.hasOwn(msg, "name") ||
                !Object.hasOwn(msg, "jointName") ||
                !Object.hasOwn(msg, "offset") ||
                !Object.hasOwn(msg, "radius")
            ) {
                throw new Error("add_area message missing required fields");
            }

            touchAreas.set(msg.uuid, new TouchArea(msg));
            resetAreaJoints();
        } break;

        case "remove_area": {
            if (!Object.hasOwn(msg, "uuid")) {
                throw new Error("remove_area message missing required field `uuid`");
            }

            const area = touchAreas.get(msg.uuid);

            if (DEBUG && area) { Entities.deleteEntity(area.debugVisual); }

            touchAreas.delete(msg.uuid);
        } break;
    }
});

Script.scriptEnding.connect(shutdown);
startup();
