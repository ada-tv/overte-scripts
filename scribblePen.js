// scribblePen.js - Ada <ada@thingvellir.net> 2026-11-18
// SPDX-License-Identifier: CC0-1.0
(class {
    // the hifi controller scripts are so weird...
    remotelyCallable = ["startNearGrab", "releaseGrab"];

    /**
     * The higher this constant, the less jagged drawn lines will look,
     * at the cost of creating more PolyLine entities (see MAX_POINT_COUNT below)
     * and potentially choking the entity server packet queue
     * @constant {number}
     */
    STROKE_POINT_INTERVAL = 50;

    /**
     * Empirically tested, the maximum point count the netcode supports is 109
     * before the properties become too big to fit into one MTU.
     * TODO: Automatic stroke simplification to make
     * the best use out of the limited points per line?
     * @constant {number}
     */
    MAX_POINT_COUNT = 100;

    HELP_TEXT = "Press the trigger to draw.\n\nFlick the stick on your primary hand down to undo the last stroke. Hold the stick down to erase all strokes you've drawn with this pen.";

    LT_INPUT = Controller.Standard.LT;
    RT_INPUT = Controller.Standard.RT;

    STICK_Y_INPUT = (
        MyAvatar.getDominantHand() === "left" ?
            Controller.Standard.LY :
            Controller.Standard.RY
    );

    UNDO_ALL_DELAY = 2000;

    /** @type {Uuid} */
    id;

    /** @type {Uuid} */
    penMaterial;

    /** @type {Uuid?} */
    currentStrokeEntity = null;

    currentStrokeData = {
        linePoints: [],
        normals: [],
        strokeWidths: [],
    };

    /** @type {Array<Uuid>} */
    drawnStrokes = [];

    /** @type {number} */
    strokeStrength = 0.0;

    /** @type {number} */
    strokeInterval;

    /** @type {ColorF} */
    color = [1.0, 0.0, 0.0];

    /** @type {number} */
    strokeWidth = 0.01;

    /** @type {boolean} */
    pressureSensitive = false;

    /** @type {boolean} */
    billboardLines = true;

    /** @type {boolean} */
    autoCleanup = true;

    /** @type {boolean} */
    grabbedLocally = false;

    /** @type {Uuid} */
    helpEntity;

    /** @type {boolean} */
    undoBtnPressed = false;

    /** @type {Uuid} */
    undoProgressRing;

    /** @type {number?} */
    undoProgressAnimInterval;

    /** @type {number?} */
    lifetimeInterval;

    preload(selfID) {
        const jsonParse = str => {
            try {
                return JSON.parse(str);
            } catch (_) {
                return undefined;
            }
        };

        this.id = selfID;

        let { userData, lifetime } = Entities.getEntityProperties(this.id, ["userData", "lifetime"]);
        userData = jsonParse(userData);

        this.color = userData?.color ?? this.color;
        this.strokeWidth = userData?.strokeWidth ?? this.strokeWidth;
        this.pressureSensitive = userData?.pressureSensitive ?? this.pressureSensitive;
        this.billboardLines = userData?.billboardLines ?? this.billboardLines;
        this.autoCleanup = userData?.autoCleanup ?? this.autoCleanup;

        this.penMaterial = Entities.addEntity({
            type: "Material",
            parentID: this.id,
            grab: { grabbable: false },
            ignorePickIntersection: true,
            priority: 1,
            parentMaterialName: "[mat::Color]",
            materialURL: "materialData",
            materialData: JSON.stringify({
                materialVersion: 1,
                materials: [
                    {
                        albedo: this.color,
                        unlit: true,
                    }
                ]
            }),
        }, "local");

        if (lifetime !== -1) {
            this.lifetimeInterval = Script.setInterval(this.#lifetimeCountdownCallback, 500);
        }
    }

    unload() {
        Entities.deleteEntity(this.penMaterial);

        if (this.autoCleanup) {
            for (const stroke of this.drawnStrokes) {
                Entities.deleteEntity(stroke);
            }
        }
    }

    getHelpText() {
        if (!this.lifetimeInterval) {
            return this.HELP_TEXT;
        } else {
            let { age, lifetime } = Entities.getEntityProperties(this.id, ["age", "lifetime"]);

            lifetime = lifetime - age;

            const timeText = (
                lifetime > 60 ?
                    `${Math.floor(lifetime / 60)} ${lifetime > 120 ? "minutes" : "minute"}` :
                    `${Math.ceil(lifetime)} seconds`
            );

            const strokeText = (
                this.autoCleanup ?
                    "and all drawn strokes " :
                    ""
            );

            return `This pen is temporary. It will delete itself ${strokeText}in ${timeText}.\n\n${this.HELP_TEXT}`;
        }
    }

    startNearGrab(_selfID, [hand, avatarID]) {
        if (avatarID !== MyAvatar.sessionUUID) { return; }
        if (this.grabbedLocally) { return; }

        this.strokeStrength = 0.0;
        this.grabbedLocally = hand;
        Controller.inputEvent.connect(this.#inputCallback);

        this.helpEntity = Entities.addEntity({
            type: "Text",
            parentID: this.id,
            fadeInMode: "disabled",
            fadeOutMode: "disabled",
            localPosition: [0, -0.1, 0.1],
            grab: { grabbable: false },
            ignorePickIntersection: true,
            renderLayer: "front",
            billboardMode: "full",
            backgroundAlpha: 0.9,
            textAlpha: 0.99,
            lineHeight: 0.01,
            dimensions: [0.16, this.lifetimeInterval ? 0.12 : 0.08, 0],
            verticalAlignment: "center",
            leftMargin: 0.005,
            rightMargin: 0.005,
            topMargin: 0.005,
            bottomMargin: 0.005,
            unlit: true,
            text: this.getHelpText(),
        }, "local");
    }

    releaseGrab(_selfID, [hand, avatarID]) {
        if (avatarID !== MyAvatar.sessionUUID) { return; }
        if (!this.grabbedLocally || this.grabbedLocally !== hand) { return; }

        if (this.currentStrokeEntity) {
            this.endStroke();
        }

        if (this.helpEntity) {
            Entities.deleteEntity(this.helpEntity);
            this.helpEntity = null;
        }

        Controller.inputEvent.disconnect(this.#inputCallback);
        this.grabbedLocally = null;
        this.strokeStrength = 0.0;
        this.helpEntity = null;
    }

    startStroke() {
        let { age, lifetime } = Entities.getEntityProperties(this.id, ["age", "lifetime"]);

        Entities.deleteEntity(this.helpEntity);
        this.helpEntity = null;

        this.currentStrokeEntity = Entities.addEntity({
            type: "PolyLine",
            color: this.color.map(x => x * 255),
            position: Entities.localToWorldPosition([0, 0, 0], this.id),
            grab: { grabbable: false },
            ignorePickIntersection: true,
            dimensions: [2, 2, 2],
            faceCamera: this.billboardLines,
            // make sure any lines a temporary pen spawns are also temporary
            lifetime: lifetime === -1 ? -1 : (lifetime - age),
        });

        this.strokeInterval = Script.setInterval(this.#intervalCallback, this.STROKE_POINT_INTERVAL);
        this.#intervalCallback();
    }

    endStroke() {
        Script.clearInterval(this.strokeInterval);
        this.drawnStrokes.push(this.currentStrokeEntity);
        this.currentStrokeEntity = null;
        this.currentStrokeData.linePoints = [];
        this.currentStrokeData.normals = [];
        this.currentStrokeData.strokeWidths = [];
    }

    #inputCallback = (input, value) => {
        if (
            (input === this.LT_INPUT && this.grabbedLocally === "left") ||
            (input === this.RT_INPUT && this.grabbedLocally === "right")
        ) {
            const THRESHOLD = 0.2;

            if (value > THRESHOLD && !this.currentStrokeEntity) {
                this.startStroke();
            } else if (value < THRESHOLD && this.currentStrokeEntity) {
                this.endStroke();
            }

            this.strokeStrength = ((value - THRESHOLD) / (1 - THRESHOLD)) + THRESHOLD;
        }

        const wasUndoPressed = this.undoBtnPressed;

        if (input === this.STICK_Y_INPUT) {
            this.undoBtnPressed = value >= 0.7;
        }

        if (this.undoBtnPressed && !wasUndoPressed) {
            this.undoAllTimeout = Script.setTimeout(() => {
                for (const stroke of this.drawnStrokes) {
                    Entities.deleteEntity(stroke);
                }

                this.drawnStrokes = [];

                Script.clearInterval(this.undoProgressAnimInterval);
                Entities.deleteEntity(this.undoProgressRing);
            }, this.UNDO_ALL_DELAY);

            const color = this.color.map(x => x * 255);

            this.undoProgressRing = Entities.addEntity({
                type: "Gizmo",
                parentID: this.id,
                fadeInMode: "disabled",
                fadeOutMode: "disabled",
                localPosition: [0, 0, 0],
                grab: { grabbable: false },
                ignorePickIntersection: true,
                renderLayer: "front",
                billboardMode: "full",
                dimensions: [0.05, 0.05, 0.05],
                gizmoType: "ring",
                ring: {
                    startAngle: 0,
                    endAngle: 0,
                    innerRadius: 0.5,
                    innerStartColor: color,
                    innerEndColor: color,
                    outerStartColor: color,
                    outerEndColor: color,
                },
            }, "local");

            const startTime = Date.now();

            this.undoProgressAnimInterval = Script.setInterval(() => {
                const alpha = Math.min(1, (Date.now() - startTime) / this.UNDO_ALL_DELAY);
                Entities.editEntity(this.undoProgressRing, { ring: { endAngle: alpha * 360 } });
            }, 1000 / 60);
        }

        if (!this.undoBtnPressed && wasUndoPressed) {
            Script.clearTimeout(this.undoAllTimeout);
            Script.clearInterval(this.undoProgressAnimInterval);
            Entities.deleteEntity(this.undoProgressRing);

            if (this.drawnStrokes.length > 0) {
                Entities.deleteEntity(this.drawnStrokes.pop());
            }
        }
    };

    #intervalCallback = () => {
        if (!this.currentStrokeEntity) { return; }

        if (this.currentStrokeData.linePoints.length >= this.MAX_POINT_COUNT) {
            const lastPoint = this.currentStrokeData.linePoints.at(-1);
            const lastNormal = this.currentStrokeData.normals.at(-1);
            const lastWidth = this.currentStrokeData.strokeWidths.at(-1);
            const lastEntity = this.currentStrokeEntity;

            this.endStroke();
            this.startStroke();

            const penPos = Entities.localToWorldPosition(lastPoint, lastEntity);
            const localPos = Entities.worldToLocalPosition(penPos, this.currentStrokeEntity);

            this.currentStrokeData.linePoints.push(localPos);
            // FIXME: this *should* work since all of the polylines spawn with identity rotation
            this.currentStrokeData.normals.push(lastNormal);
            this.currentStrokeData.strokeWidths.push(lastWidth);

            Entities.editEntity(this.currentStrokeEntity, this.currentStrokeData);
        }

        const FORWARD = [0, 0, 1];

        const penPos = Entities.localToWorldPosition([0, 0, 0], this.id);
        const penAngle = Entities.localToWorldRotation(Quat.IDENTITY, this.id);

        const localPos = Entities.worldToLocalPosition(penPos, this.currentStrokeEntity);
        const localAngle = Entities.worldToLocalRotation(penAngle, this.currentStrokeEntity);

        let width = this.strokeWidth;

        if (this.pressureSensitive) {
            width *= this.strokeStrength;
        }

        this.currentStrokeData.linePoints.push(localPos);
        this.currentStrokeData.strokeWidths.push(width);

        if (this.billboardLines) {
            this.currentStrokeData.normals.push(FORWARD);
        } else {
            this.currentStrokeData.normals.push(Vec3.multiplyQbyV(localAngle, FORWARD));
        }

        Entities.editEntity(this.currentStrokeEntity, this.currentStrokeData);
    };

    #lifetimeCountdownCallback = () => {
        if (this.helpEntity) {
            Entities.editEntity(this.helpEntity, { text: this.getHelpText() });
        }
    };
})
