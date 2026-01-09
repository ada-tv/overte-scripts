(function() { "use strict";
	const {
		Color8,
		Vector3,
		Quaternion,
		vec3,
		quat,
		euler,
	} = Script.require(Script.resolvePath("./utilMath.js"));

	const HOLDER_SPRITE = Script.resolvePath("./handholder.png");
	const DRAW_CARD_SPRITE = Script.resolvePath("./draw_to_hand.png");
	const LOCK_SPRITE = Script.resolvePath("./lock.png");
	const UNLOCK_SPRITE = Script.resolvePath("./unlock.png");

	const UPDATE_TPS = 60;
	const ON_SERVER = Script.context === "entity_server";

	const callEntityMethodStr = (
		ON_SERVER ?
		"callEntityServerMethod" :
		"callEntityMethod"
	);

	const callEntityMethod = (
		ON_SERVER ?
		Entities.callEntityServerMethod :
		Entities.callEntityMethod
	);

	this.remotelyCallable = [
		"takeCardOwnership",
		"dropCardOwnership",
		"lockPosition",
		"unlockPosition",
	];

	this.holderID = "";
	this.rootID = "";

	this.sprite = "";
	this.drawButton = "";
	this.lockButton = "";
	this.ownerNameplate = "";
	this.cards = [];
	this.cardTargetTransforms = new Map();
	this.tickInterval = {};
	this.positionLocked = false;
	this.owner = {};

	this.preload = function(holderID) {
		this.holderID = holderID;
		const { parentID, userData } = Entities.getEntityProperties(this.holderID, ["parentID", "userData"]);
		this.rootID = parentID;

		const { ownerID, ownerName } = JSON.parse(userData);
		this.owner = AvatarList.getAvatar(ownerID);

		const colorHue = Math.random() * Math.PI * 2;
		const color = Color8.oklch(0.95, 0.2, colorHue);
		const colorOutline = Color8.oklch(0.4, 0.05, colorHue);

		this.sprite = Entities.addEntity({
			type: "Image",
			parentID: this.holderID,
			localPosition: [0, 0, 0],
			dimensions: [0.1, 0.1, 0],
			color: color,
			imageURL: HOLDER_SPRITE,
			emissive: true,
			keepAspectRatio: true,
			billboardMode: "full",
			collisionless: true,
			ignorePickIntersection: true,
			grab: { grabbable: false },
		});

		this.ownerNameplate = Entities.addEntity({
			type: "Text",
			parentID: this.holderID,
			localPosition: [0, -0.2, 0],
			dimensions: [0.5, 0.25, 0],
			unlit: true,
			billboardMode: "full",
			collisionless: true,
			ignorePickIntersection: true,
			grab: { grabbable: false },
			text: ownerName,
			textColor: color,
			textEffect: "outline fill",
			textEffectColor: colorOutline,
			textEffectThickness: 0.4,
			lineHeight: 0.1,
			backgroundAlpha: 0,
			alignment: "center",
		});

		this.drawButton = Entities.addEntity({
			type: "Image",
			parentID: this.holderID,
			localPosition: [0.15, -0.05, 0],
			dimensions: [0.1, 0.1, 0],
			imageURL: DRAW_CARD_SPRITE,
			emissive: true,
			collisionless: true,
			keepAspectRatio: true,
			grab: { grabbable: false },
			script: `(function(){
				this.mousePressOnEntity = function(eid) {
					const holderID = ${JSON.stringify(this.holderID)};
					Entities.callEntityServerMethod(
						${JSON.stringify(this.rootID)},
						"drawWhiteCardToHand",
						[holderID,MyAvatar.sessionUUID]
					);
				};
			})`,
		});

		this.lockButton = Entities.addEntity({
			type: "Image",
			parentID: this.holderID,
			localPosition: [-0.15, -0.05, 0],
			dimensions: [0.1, 0.1, 0],
			imageURL: UNLOCK_SPRITE,
			emissive: true,
			collisionless: true,
			keepAspectRatio: true,
			grab: { grabbable: false },
		});

		this.unlockPosition();

		this.tickInterval = Script.setInterval(() => this.update(1 / UPDATE_TPS), 1000 / UPDATE_TPS);
	};

	this.update = function(dt) {
		const epsilon = 0.005;

		for (let [card, { position: targetPos, rotation: targetRot }] of this.cardTargetTransforms) {
			let { localPosition, localRotation } = Entities.getEntityProperties(card, ["localPosition", "localRotation"]);
			localPosition = vec3(localPosition);
			localRotation = quat(localRotation);

			const smoothPos = localPosition.lerpTo(targetPos, dt * 3);
			const smoothRot = localRotation.slerpTo(targetRot, dt * 3).normalized();

			let alpha = Math.min(1, Math.pow(1.0 - smoothPos.distance(targetPos), 10.0));
			if (alpha > 0.9) { alpha = 1.0; }

			// only do edits if we're far enough away to care
			if (
				smoothPos.distance(targetPos) > epsilon ||
				smoothRot.dot(targetRot) > epsilon
			) {
				Entities.editEntity(card, {
					localPosition: smoothPos,
					localRotation: smoothRot,
					textAlpha: alpha,
				});
			}
		}

		if (this.positionLocked) { return; }

		const ownerPos = vec3(this.owner.getNeckPosition());
		const ownerRot = quat(this.owner.orientation);
		const ownerScale = vec3(Mat4.extractScale(this.owner.sensorToWorldMatrix)).length();

		if (false) {
			this.lockPosition();
			Entities.editEntity(this.ownerNameplate, { text: "Owner gone! :(" });
		}

		let { position, rotation } = Entities.getEntityProperties(this.holderID, ["position", "rotation"]);
		position = vec3(position);
		rotation = quat(rotation);

		const targetPos = ownerPos.add(
			ownerRot.multiply(
				vec3(0, -0.25, -0.6).multiply(ownerScale)
			)
		);
		const targetRot = ownerRot.multiply(euler(-15, 0, 0));

		const smoothPos = position.lerpTo(targetPos, dt * 3);
		const smoothRot = rotation.slerpTo(targetRot, dt * 3).normalized();

		if (
			smoothPos.distance(targetPos) > epsilon ||
			smoothRot.dot(targetRot) > epsilon
		) {
			Entities.editEntity(this.holderID, {
				position: smoothPos,
				rotation: smoothRot,
			});
		}
	};

	this.organizeCards = function() {
		for (let i = 0; i < this.cards.length; i++) {
			const row = Math.floor(i / 5);
			const columnSmooth = ((i + 0.5) / 5) % 1;
			const columnSmoothNorm = (columnSmooth * 2) - 1;

			const rot = Quaternion.fromPitchYawRollDegrees(0, 0, columnSmoothNorm * -20);
			const pos = vec3(
				columnSmoothNorm * 0.3,
				(Math.sin(columnSmooth * Math.PI) * 0.1) + (row * 0.1),
				-0.1 + (columnSmooth * 0.01) - (row * 0.01),
			);

			this.cardTargetTransforms.set(this.cards[i], {
				position: pos,
				rotation: rot,
			});
		}
	};

	this.takeCardOwnership = function(_id, args) {
		const card = args[0];
		this.cards.push(card);
		this.cardTargetTransforms.set(card, { position: Vector3.ZERO, rotation: Quaternion.IDENTITY });

		Entities.editEntity(card, {
			parentID: this.holderID,
			backgroundAlpha: 0.6,
			unlit: true,
		});
		this.organizeCards();
	};

	this.dropCardOwnership = function(_id, args) {
		const card = args[0];
		const index = this.cards.indexOf(card);

		if (index === -1) { return; }

		this.cards.splice(index, 1);
		this.cardTargetTransforms.delete(card);

		Entities.editEntity(card, {
			parentID: this.rootID,
			backgroundAlpha: 1.0,
			unlit: false,
			textAlpha: 1,
		});
		this.organizeCards();
	};

	this.lockPosition = function() {
		this.positionLocked = true;

		Entities.editEntity(this.lockButton, {
			imageURL: LOCK_SPRITE,
			script: `(function(){
				this.mousePressOnEntity = _ => {
					Entities.${callEntityMethodStr}(${JSON.stringify(this.holderID)}, "unlockPosition");
				};
			})`,
		});
	};

	this.unlockPosition = function() {
		this.positionLocked = false;

		Entities.editEntity(this.lockButton, {
			imageURL: UNLOCK_SPRITE,
			script: `(function(){
				this.mousePressOnEntity = _ => {
					Entities.${callEntityMethodStr}(${JSON.stringify(this.holderID)}, "lockPosition");
				};
			})`,
		});
	};

	this.unload = function() {
		Entities.deleteEntity(this.sprite);
		Entities.deleteEntity(this.drawButton);
		Entities.deleteEntity(this.ownerNameplate);

		for (const card of this.cards) { Entities.deleteEntity(card); }

		Script.clearInterval(this.tickInterval);
	};

	this.startNearGrab = function(_id, _args) {
		callEntityMethod(this.holderID, "lockPosition");
	};

	this.startDistanceGrab = function(_id, _args) {
		callEntityMethod(this.holderID, "lockPosition");
	};

	HMD.displayModeChanged.connect(vr => {
		if (vr) { callEntityMethod(this.holderID, "lockPosition"); }
	});
})
