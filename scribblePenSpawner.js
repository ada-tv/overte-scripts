// SPDX-License-Identifier: CC0-1.0
// Usage: Client script on an Empty entity
(class {
    PEN_USERDATA = {
        autoCleanup: true,
        strokeWidth: 0.01,
    };

    PEN_PROPERTIES = {
        type: "Model",
        fadeInMode: "disabled",
        fadeOutMode: "disabled",
        modelURL: Script.resolvePath("assets/scribblePen.glb"),
        script: Script.resolvePath("scribblePen.js"),
        dimensions: [0.022 * 1.5, 0.022 * 1.5, 0.2 * 1.5],
        lifetime: 5 * 60,
        useOriginalPivot: true,
    };

    COLORS = [
        [0x00, 0x00, 0x00],
        [0xaa, 0x00, 0x00],
        [0x00, 0x88, 0x00],
        [0xbb, 0x66, 0x00],
        [0x44, 0x44, 0xcc],
        [0xaa, 0x44, 0x88],
        [0x00, 0x77, 0xaa],
        [0x99, 0x99, 0x99],

        [0x44, 0x44, 0x44],
        [0xdd, 0x66, 0x66],
        [0x88, 0xbb, 0x88],
        [0xee, 0xbb, 0x77],
        [0x88, 0x99, 0xdd],
        [0xcc, 0x77, 0x99],
        [0x77, 0xbb, 0xbb],
        [0xee, 0xee, 0xee],
    ];

    /** @type {Map<Uuid>} */
    colorButtons = new Map();

    /** @type {Uuid} */
    titleEntity;

    /** @type {Uuid} */
    id;

    spawnPen(color, leftHand) {
        const position = Entities.localToWorldPosition(
            [this.PEN_PROPERTIES.dimensions[2] / (leftHand ? 2 : -2), -0.3, 0.1], this.id);
        const rotation = Entities.localToWorldRotation(
            Quat.fromPitchYawRollDegrees(0, leftHand ? -90 : 90, 0), this.id);

        Entities.addEntity({
            ...this.PEN_PROPERTIES,
            position,
            rotation,
            userData: JSON.stringify({
                ...this.PEN_USERDATA,
                color: color.map(x => x / 255),
            }),
        });
    }

    preload(selfID) {
        this.id = selfID;

        Entities.editEntity(this.id, {
            grab: { grabbable: false },
            ignorePickIntersection: true,
        });

        const buttonSize = 0.05;
        const buttonPadding = 0.01;
        const totalWidth = (buttonSize + buttonPadding) * 8;

        this.titleEntity = Entities.addEntity({
            type: "Text",
            fadeInMode: "disabled",
            fadeOutMode: "disabled",
            parentID: this.id,
            dimensions: [totalWidth, buttonSize, 0],
            localPosition: [0, buttonSize + buttonPadding, 0],
            lineHeight: buttonSize,
            unlit: true,
            text: "Scribble Pen",
            alignment: "center",
            verticalAlignment: "top",
            textAlpha: 0.99,
            grab: { grabbable: false },
            ignorePickIntersection: true,
        }, "local");

        for (const [i, color] of this.COLORS.entries()) {
            const x = (i % 8) * (buttonSize + buttonPadding);
            const y = Math.floor(i / 8) * (buttonSize + buttonPadding);

            const button = Entities.addEntity({
                type: "Box",
                fadeInMode: "disabled",
                fadeOutMode: "disabled",
                parentID: this.id,
                unlit: true,
                color,
                dimensions: [buttonSize, buttonSize, 0.01],
                localPosition: [x - (totalWidth / 2) + ((buttonSize + buttonPadding) / 2), -y, 0],
                grab: { grabbable: false },
            }, "local");

            this.colorButtons.set(button, color);
        }

        Entities.mousePressOnEntity.connect(this.#clickCallback);
    }

    unload() {
        for (const button of this.colorButtons.keys()) {
            Entities.deleteEntity(button);
        }

        Entities.deleteEntity(this.titleEntity);
        Entities.mousePressOnEntity.disconnect(this.#clickCallback);
    }

    #clickCallback = (entityID, event) => {
        if (!event.isPrimaryButton) { return; }

        const color = this.colorButtons.get(entityID);

        if (!color) { return; }

        if (HMD.active) {
            // The docs say 1 is left controller and 2 is right controller, but it lies
            this.spawnPen(color, event.id % 2 === 0);
        } else {
            Window.displayAnnouncement("Scribble Pens only work in VR right now, sorry :(");
        }
    };
})
