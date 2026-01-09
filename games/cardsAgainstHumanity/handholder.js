(function() { "use strict";
	const { Color8 } = Script.require(Script.resolvePath("./utilMath.js"));

	const HOLDER_SPRITE = Script.resolvePath("./handholder.png");
	const DRAW_CARD = Script.resolvePath("./draw_to_hand.png");

	const ON_SERVER = Script.context === "entity_server";

	const callEntityMethodStr = (
		ON_SERVER ?
		"callEntityServerMethod" :
		"callEntityMethod"
	);

	this.remotelyCallable = ["takeCardOwnership", "dropCardOwnership"];

	this.holderID = "";
	this.rootID = "";

	this.sprite = "";
	this.drawButton = "";
	this.ownerNameplate = "";
	this.cards = [];

	this.preload = function(holderID) {
		this.holderID = holderID;
		const { parentID, userData } = Entities.getEntityProperties(this.holderID, ["parentID", "userData"]);
		this.rootID = parentID;

		const { ownerID } = JSON.parse(userData);
		const ownerAvatar = AvatarList.getAvatar(ownerID);
		let ownerName = ownerAvatar.sessionDisplayName;

		if (ownerName === "") { ownerName = ownerAvatar.displayName; }
		if (ownerName === "") { ownerName = "?"; }

		console.info("ownerID", ownerID);
		console.info("ownerName", ownerName);

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
			imageURL: DRAW_CARD,
			emissive: true,
			keepAspectRatio: true,
			grab: { grabbable: false },
			script: `(function(){
				this.mousePressOnEntity = function(eid) {
					Entities.${callEntityMethodStr}(
						${JSON.stringify(this.rootID)},
						"drawWhiteCardToHand",
						[${JSON.stringify(this.holderID)}
					]);
				};
			})`,
		});
	};

	this.organizeCards = function() {
		for (let i = 0; i < this.cards.length; i++) {
			const row = Math.floor(i / 5);
			const columnSmooth = ((i + 0.5) / 5) % 1;
			const columnSmoothNorm = (columnSmooth * 2) - 1;

			const rot = Quat.fromPitchYawRollDegrees(0, 0, columnSmoothNorm * -20);
			const pos = [
				columnSmoothNorm * 0.3,
				(Math.sin(columnSmooth * Math.PI) * 0.1) + (row * 0.1),
				-0.1 + (columnSmooth * 0.01) - (row * 0.01),
			];

			Entities.editEntity(this.cards[i], {
				localPosition: pos,
				localRotation: rot,
			});
		}
	};

	this.takeCardOwnership = function(_id, args) {
		console.log("takeCardOwnership", _id, args[0]);

		const card = args[0];
		this.cards.push(card);

		Entities.editEntity(card, { parentID: this.holderID });
		this.organizeCards();
	};

	this.dropCardOwnership = function(_id, args) {
		console.log("dropCardOwnership", _id, args[0]);

		const card = args[0];
		const index = this.cards.indexOf(card);

		if (index === -1) { return; }

		this.cards.splice(index, 1);

		Entities.editEntity(card, { parentID: this.rootID });
		this.organizeCards();
	};

	this.unload = function() {
		Entities.deleteEntity(this.sprite);
		Entities.deleteEntity(this.drawButton);
		Entities.deleteEntity(this.ownerNameplate);

		for (const card of this.cards) { Entities.deleteEntity(card); }
	};
})
