// avatarTouchApi.js - Ada <ada@thingvellir.net> 2026-10-25
// SPDX-License-Identifier: CC0-1.0
"use strict";

/** @type {string} */
const MSG_CHANNEL = "AvatarTouch";

/** @type {boolean} */
let backendAlive = false;

/** @type {Map<Uuid,TouchArea>} */
let registeredAreas = new Map();

class Signal {
    #callbacks = new Set();

    connect(callback) { this.#callbacks.add(callback); }
    disconnect(callback) { this.#callbacks.delete(callback); }

    emit(...args) {
        for (const callback of this.#callbacks.values()) {
            callback(...args);
        }
    }
}

class TouchArea {
    /** @type {Uuid} */
    #uuid = Uuid.generate();

    /**
     * The name of this touch area. Used for the debug visualiser.
     * @type {string}
     */
    name;

    /**
     * The name of the joint this area will be parented to.
     * @type {string}
     */
    jointName;

    /**
     * The offset from this area's parent joint, in meters relative to the avatar's scale.
     * @type {Vec3}
     */
    offset;

    /**
     * The collision radius of this area, in meters relative to the avatar's scale.
     * @type {number}
     */
    radius;

    /**
     * Emitted when this area is touched. Only one touch is reported,
     * and the area cannot be 'touched' again until it is released.
     * @type {Signal<(toucher: Uuid, speed: number, position: Vec3, hand: string) => void>}
     */
    touched = new Signal();

    /**
     * Emitted when this area has stopped being touched.
     * @type {Signal<() => void>}
     */
    released = new Signal();

    /**
     * `true` if this area is currently touched, else `false`.
     * @type {boolean}
     */
    isTouched = false;

    /**
     * Emitted when `isTouched` changes. Convenience wrapper for `touched` and `released`.
     * @type {Signal<(touched: bool) => void>}
     */
    isTouchedChanged = new Signal();

    /**
     * How deeply this area is being pressed. A touch directly on the edge of the area
     * is 0, and a touch pressed into the center of the area is 1.
     * @type {number}
     */
    pressure = 0;

    /**
     * Emitted when `pressure` changes.
     * @type {Signal<(pressure: number) => void>}
     */
    pressureChanged = new Signal();

    /**
     * @param {Object} args
     * @param {string} [args.name="Unnamed"] - The name of this area. Used for the debug visualiser.
     * @param {string} jointName - The name of the joint this area will be parented to.
     * @param {number} [radius=0.05] - The radius of this area's collision sphere.
     * @param {Vec3} [offset=[0, 0, 0]] - The offset from this area's parent joint, in meters relative to the avatar's scale.
     */
    constructor({
        name = "Unnamed",
        jointName,
        radius = 0.05,
        offset = [0, 0, 0],
    }) {
        this.name = name;
        this.jointName = jointName;
        this.radius = radius;
        this.offset = offset;

        registeredAreas.set(this.#uuid, this);

        if (backendAlive) {
            Messages.sendLocalMessage(MSG_CHANNEL, JSON.stringify({
                event: "add_area",
                uuid: this.#uuid,
                name: name,
                jointName: jointName,
                offset: offset,
                radius: radius,
            }));
        }
    }

    /**
     * Removes this area from backend processing.
     * You don't need to call this unless your script is creating
     * and removing areas at runtime, any areas active when the script
     * stops running are automatically disposed of.
     */
    destroy() {
        registeredAreas.delete(this.#uuid);

        if (backendAlive) {
            Messages.sendLocalMessage(MSG_CHANNEL, JSON.stringify({
                event: "remove_area",
                uuid: this.#uuid,
            }));
        }
    }
}

Messages.messageReceived.connect((channel, rawMsg, _senderID, localOnly) => {
    if (!localOnly || channel !== MSG_CHANNEL) { return; }

    const msg = JSON.parse(rawMsg);

    if (msg.event === "system_shutdown") {
        backendAlive = false;
        return;
    }

    // we can't do anything with add/remove events
    if (msg.event === "add_area" || msg.event === "remove_area") {
        return;
    }

    // the backend has started talking,
    // so inform it of the touch areas we've got
    if (!backendAlive) {
        for (const [areaID, area] of registeredAreas.entries()) {
            Messages.sendLocalMessage(MSG_CHANNEL, JSON.stringify({
                event: "add_area",
                uuid: areaID,
                name: area.name,
                jointName: area.jointName,
                offset: area.offset,
                radius: area.radius,
            }));
        }

        backendAlive = true;
    }

    /** @type {TouchArea?} */
    const area = registeredAreas.get(msg.area);

    // not one of our ones, owned by someone else
    if (!area) { return; }

    if (msg.event === "touch") {
        if (!area.isTouched) {
            area.isTouchedChanged.emit(true);
        }
        area.isTouched = true;
        area.touched.emit(msg.toucher, msg.speed, msg.position, msg.hand);
    } else if (msg.event === "touch_release") {
        if (area.isTouched) {
            area.isTouchedChanged.emit(false);
        }
        area.isTouched = false;
        area.released.emit();
    } else if (msg.event === "touch_pressure") {
        area.pressure = msg.pressure;
        area.pressureChanged.emit(area.pressure);
    }
});

Script.scriptEnding.connect(() => {
    for (const area of registeredAreas.values()) {
        area.destroy();
    }
});

module.exports = { TouchArea };
