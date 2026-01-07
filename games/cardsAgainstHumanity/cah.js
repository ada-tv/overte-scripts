// Usage:
// - Set up userdata (see below) (optional)
// - Server script on Empty entity
//
// Userdata:
// - quittable: boolean? = true
//   If false, the "quit" button will be disabled.
// - whiteCardSources: string[] = ["./cards_white.json"]
// - blackCardSources: string[] = ["./cards_black.json"]
//
// SPDX-License-Identifier: CC-BY-NC-SA-2.0
(function() { "use strict";
	/** @type {string} */ const ICON_QUIT = Script.resolvePath("./quit.png");
	/** @type {string} */ const ICON_CLEANUP = Script.resolvePath("./put_away.png");
	/** @type {string} */ const ICON_DRAW_CARD = Script.resolvePath("./deal_card.png");
	/** @type {string} */ const ICON_DELETE = Script.resolvePath("./delete.png");
	/** @type {string} */ const FONT = Script.resolvePath("./Inter.arfont");

	const callEntityMethod = (
		Script.context === "entity_server" ?
		"callEntityServerMethod" :
		"callEntityMethod"
	);

	const CARD_FADEIN_PROPS = {
		duration: 0.3,
		noiseSize: [0.02, 0.02, 0.02],
	};

	const CARD_FADEOUT_PROPS = {
		duration: 2,
		noiseSize: [0.02, 0.02, 0.02],
		edgeWidth: 0.3,
		edgeInnerColor: [0, 0, 0],
		edgeInnerAlpha: 1,
		edgeOuterColor: [255, 47, 0],
		edgeOuterAlpha: 1,
	};

	const DECK_DIMS = [0.2, 0.15, 0.2];
	const WHITE_DECK_OFFSET = [DECK_DIMS[0], DECK_DIMS[1] / 2, 0.0];
	const BLACK_DECK_OFFSET = [-DECK_DIMS[0], DECK_DIMS[1] / 2, 0.0];

	const DISCARD_SWEEP_SEC = 2;
	const DISCARD_AREA_RADIUS = 0.3;
	const DISCARD_AREA_OFFSET = [-(DECK_DIMS[0] + DISCARD_AREA_RADIUS), DISCARD_AREA_RADIUS * 0.5, 0];

	/** @member {string} */
	this.rootID = "";

	/**
	 * URLs to JSON arrays of white card text entries.
	 * @member {string[]}
	 */
	this.whiteCardsSources = [];
	/**
	 * URLs to JSON arrays of black card text entries.
	 * @member {string[]}
	 */
	this.blackCardsSources = [];

	/**
	 * All possible white card entries, retrieved from {@link whiteCardsSources}.
	 * @member {string[]}
	 */
	this.whiteCardPool = [];
	/**
	 * All possible black card entries, retrieved from {@link whiteCardsSources}.
	 * @member {string[]}
	 */
	this.blackCardPool = [];

	/**
	 * The white cards remaining in the deck for this round.
	 * @member {string[]}
	 */
	this.whiteCardDeck = [];

	/**
	 * The black cards remaining in the deck for this round.
	 * @member {string[]}
	 */
	this.blackCardDeck = [];

	/** @member {boolean} */ this.setup = false;
	/** @member {boolean} */ this.quittable = true;

	/** @member {string[]} */
	this.remotelyCallable = ["quit", "cleanup", "drawWhiteCard", "drawBlackCard", "deleteAll"];

	/** @member {string[]} */ this.cardEntities = [];
	/** @member {string[]} */ this.guiEntities = [];

	this.whiteDeckEntity = "";
	this.blackDeckEntity = "";
	this.loadingEntity = "";
	this.discardAreaEntity = "";
	this.discardAreaInterval = {};

	this.preload = function(eid) {
		this.rootID = eid;

		let userData = {};
		try {
			const raw = Entities.getEntityProperties(this.rootID, "userData").userData;
			userData = JSON.parse(raw);
		} catch(e) {
			console.error(e);
		}

		this.quittable = userData?.quittable ?? true;
		this.whiteCardSources = userData?.whiteCardSources ?? [Script.resolvePath("./cards_white.json")];
		this.blackCardSources = userData?.blackCardSources ?? [Script.resolvePath("./cards_black.json")];

		this.whiteDeckEntity = Entities.addEntity({
			type: "Box",
			name: "White deck",
			parentID: this.rootID,
			dimensions: DECK_DIMS,
			localPosition: WHITE_DECK_OFFSET,
			color: [255, 255, 255],
			collisionless: true,
			grab: { grabbable: false },
			script: `(function() { this.mousePressOnEntity = (eid, e) => {
				if (e.button !== "Primary") { return; }
				if (Settings.getValue("io.highfidelity.isEditing", false)) { return; }
				Entities.${callEntityMethod}(${JSON.stringify(this.rootID)}, "drawWhiteCard");
			}; })`,
			fadeOutMode: "enabled",
			fadeOut: CARD_FADEOUT_PROPS,
		});
		this.guiEntities.push(this.whiteDeckEntity);

		this.blackDeckEntity = Entities.addEntity({
			type: "Box",
			name: "Black deck",
			parentID: this.rootID,
			dimensions: DECK_DIMS,
			localPosition: BLACK_DECK_OFFSET,
			color: [0, 0, 0],
			collisionless: true,
			grab: { grabbable: false },
			script: `(function() { this.mousePressOnEntity = (eid, e) => {
				if (e.button !== "Primary") { return; }
				if (Settings.getValue("io.highfidelity.isEditing", false)) { return; }
				Entities.${callEntityMethod}(${JSON.stringify(this.rootID)}, "drawBlackCard");
			}; })`,
			fadeOutMode: "enabled",
			fadeOut: CARD_FADEOUT_PROPS,
		});
		this.guiEntities.push(this.blackDeckEntity);

		for (const deck of [this.whiteDeckEntity, this.blackDeckEntity]) {
			this.guiEntities.push(Entities.addEntity({
				type: "Image",
				parentID: deck,
				localPosition: [0, DECK_DIMS[1], 0],
				alpha: 0.8,
				ignorePickIntersection: true,
				grab: { grabbable: false },
				dimensions: [0.15, 0.15, 0],
				emissive: true,
				keepAspectRatio: true,
				billboardMode: "full",
				imageURL: ICON_DRAW_CARD,
				fadeOutMode: "enabled",
				fadeOut: CARD_FADEOUT_PROPS,
			}));
		}

		if (this.quittable) {
			this.guiEntities.push(Entities.addEntity({
				type: "Image",
				parentID: this.rootID,
				dimensions: [0.15, 0.2, 0.2],
				keepAspectRatio: true,
				localPosition: [-0.2, 0.5, -0.15],
				imageURL: ICON_QUIT,
				emissive: true,
				collisionless: true,
				grab: { grabbable: false },
				script: `(function() { this.mousePressOnEntity = (eid, e) => {
					if (e.button !== "Primary") { return; }
					if (Settings.getValue("io.highfidelity.isEditing", false)) { return; }
					Entities.${callEntityMethod}(${JSON.stringify(this.rootID)}, "quit");
				}; })`,
				fadeOutMode: "enabled",
				fadeOut: CARD_FADEOUT_PROPS,
			}));
		}

		this.guiEntities.push(Entities.addEntity({
			type: "Image",
			parentID: this.rootID,
			dimensions: [0.2, 0.2, 0.2],
			keepAspectRatio: true,
			localPosition: [this.quittable ? 0.15 : 0, 0.5, -0.15],
			imageURL: ICON_CLEANUP,
			emissive: true,
			collisionless: true,
			grab: { grabbable: false },
			script: `(function() { this.mousePressOnEntity = (eid, e) => {
				if (e.button !== "Primary") { return; }
				if (Settings.getValue("io.highfidelity.isEditing", false)) { return; }
				Entities.${callEntityMethod}(${JSON.stringify(this.rootID)}, "cleanup");
			}; })`,
			fadeOutMode: "enabled",
			fadeOut: CARD_FADEOUT_PROPS,
		}));

		this.guiEntities.push(Entities.addEntity({
			type: "Text",
			parentID: this.rootID,
			dimensions: [0.8, 0.1, 0.2],
			localPosition: [0, 0.35, -0.15],
			localRotation: Quat.fromPitchYawRollDegrees(0, 0, 0),
			collisionless: true,
			grab: { grabbable: false },
			fadeOutMode: "enabled",
			fadeOut: CARD_FADEOUT_PROPS,
			text: "Cards Against Humanity",
			textEffect: "outline fill",
			textEffectThickness: 0.2,
			textEffectColor: [0, 0, 0],
			lineHeight: 0.05,
			alignment: "center",
			verticalAlignment: "center",
			font: FONT,
		}));

		this.discardAreaEntity = Entities.addEntity({
			type: "Image",
			name: "Discard area",
			parentID: this.rootID,
			billboardMode: "full",
			dimensions: [0.15, 0.15, 0.15],
			keepAspectRatio: true,
			localPosition: DISCARD_AREA_OFFSET,
			imageURL: ICON_DELETE,
			emissive: true,
			collisionless: true,
			ignorePickIntersection: true,
			grab: { grabbable: false },
			fadeOutMode: "enabled",
			fadeOut: CARD_FADEOUT_PROPS,
		});
		this.guiEntities.push(this.discardAreaEntity);

		this.loadingEntity = Entities.addEntity({
			type: "Text",
			parentID: this.rootID,
			dimensions: [1, 1, 1],
			localPosition: [0, 0.5, 0],
			text: "Loading...",
			billboardMode: "full",
			ignorePickIntersection: true,
			grab: { grabbable: false },
			lineHeight: 0.2,
			backgroundAlpha: 0,
			alignment: "center",
			verticalAlignment: "center",
			textEffect: "outline fill",
			textEffectColor: [0, 0, 0],
			unlit: true,
			textEffectThickness: 0.3,
			font: FONT,
		});

		for (const source of this.whiteCardSources) {
			const data = Script.require(source);

			// require'd json arrays aren't actually Array, they're weird objects
			for (let i = 0; i < data.length; i++) {
				this.whiteCardPool.push(data[i]);
			}
		}

		for (const source of this.blackCardSources) {
			const data = Script.require(source);

			// require'd json arrays aren't actually Array, they're weird objects
			for (let i = 0; i < data.length; i++) {
				this.blackCardPool.push(data[i]);
			}
		}

		this.whiteCardDeck = [...this.whiteCardPool];
		this.blackCardDeck = [...this.blackCardPool];

		Script.setTimeout(() => Entities.deleteEntity(this.loadingEntity), 500);
		this.discardAreaInterval = Script.setInterval(() => this.tryDiscard(), DISCARD_SWEEP_SEC * 1000);

		this.setup = true;
	};

	this.tryDiscard = function() {
		const { position: center } = Entities.getEntityProperties(this.discardAreaEntity, "position");

		const candidates = Entities.findEntitiesByTags(["discardable"], center, DISCARD_AREA_RADIUS / 2);
		for (const e of candidates) {
			Entities.deleteEntity(e);

			const index = this.whiteCardPool.indexOf(e);

			if (index === -1) { continue; }

			this.whiteCardPool.splice(index, 1);
		}
	};

	this.drawCard = function(black, text) {
		if (!this.setup) { return; }

		const offset = black ? BLACK_DECK_OFFSET : WHITE_DECK_OFFSET;

		const card = Entities.addEntity({
			type: "Text",
			tags: black ? [] : ["discardable"],
			parentID: this.rootID,
			collisionless: true,
			grab: { grabbable: true },
			dimensions: [DECK_DIMS[0], DECK_DIMS[2], 0],
			localPosition: [offset[0], 0.2, offset[2]],
			localRotation: Quat.fromPitchYawRollDegrees(90, 0, 0),
			fadeInMode: "enabled",
			fadeOutMode: "enabled",
			fadeIn: CARD_FADEIN_PROPS,
			fadeOut: CARD_FADEOUT_PROPS,
			font: FONT,
			text: text,
			textColor: black ? [255, 255, 255] : [0, 0, 0],
			backgroundAlpha: 1,
			backgroundColor: black ? [0, 0, 0] : [255, 255, 255],
			textEffect: "outline fill",
			textEffectColor: black ? [0, 0, 0] : [255, 255, 255],
			textEffectThickness: 0.3,
			leftMargin: 0.005,
			rightMargin: 0.005,
			topMargin: 0.005,
			bottomMargin: 0.005,
			lineHeight: 0.02,

			// HACK: Entities.findEntities can only see entities with a server script on them
			serverScripts: "(function() {})",
		});

		this.cardEntities.push(card);
	};

	this.drawWhiteCard = function() {
		let choice = Math.floor(Math.random() * this.whiteCardDeck.length);
		const text = this.whiteCardDeck[choice];
		this.whiteCardDeck.splice(choice, 1);

		if (this.whiteCardDeck.length > 0) {
			const amount = this.whiteCardDeck.length / this.whiteCardPool.length;
			Entities.editEntity(this.whiteDeckEntity, {
				localPosition: [
					WHITE_DECK_OFFSET[0],
					WHITE_DECK_OFFSET[1] - (DECK_DIMS[1] * (1.0 - amount) * 0.5),
					WHITE_DECK_OFFSET[2],
				],
				dimensions: [
					DECK_DIMS[0],
					DECK_DIMS[1] * amount,
					DECK_DIMS[2],
				]
			});
		} else {
			Entities.editEntity(this.whiteDeckEntity, { visible: false });
		}

		this.drawCard(false, text);
	};

	this.drawBlackCard = function() {
		let choice = Math.floor(Math.random() * this.blackCardDeck.length);
		const text = this.blackCardDeck[choice];
		this.blackCardDeck.splice(choice, 1);

		if (this.blackCardDeck.length > 0) {
			const amount = this.blackCardDeck.length / this.blackCardPool.length;
			Entities.editEntity(this.blackDeckEntity, {
				localPosition: [
					BLACK_DECK_OFFSET[0],
					BLACK_DECK_OFFSET[1] - (DECK_DIMS[1] * (1.0 - amount) * 0.5),
					BLACK_DECK_OFFSET[2],
				],
				dimensions: [
					DECK_DIMS[0],
					DECK_DIMS[1] * amount,
					DECK_DIMS[2],
				]
			});
		} else {
			Entities.editEntity(this.blackDeckEntity, { visible: false });
		}

		this.drawCard(true, text);
	};

	this.cleanup = function() {
		for (const e of this.cardEntities) { Entities.deleteEntity(e); }

		this.whiteCardDeck = [...this.whiteCardPool];
		this.blackCardDeck = [...this.blackCardPool];

		Entities.editEntity(this.blackDeckEntity, {
			visible: true,
			dimensions: DECK_DIMS,
			localPosition: BLACK_DECK_OFFSET,
		});
		Entities.editEntity(this.whiteDeckEntity, {
			visible: true,
			dimensions: DECK_DIMS,
			localPosition: WHITE_DECK_OFFSET,
		});
	};

	this.deleteAll = function() {
		for (const e of this.cardEntities) { Entities.deleteEntity(e); }
		for (const e of this.guiEntities) { Entities.deleteEntity(e); }
	};

	this.quit = function() { this.unload(); };

	this.unload = function() {
		Script.clearInterval(this.discardAreaInterval);

		for (const e of this.cardEntities) { Entities.deleteEntity(e); }
		for (const e of this.guiEntities) { Entities.deleteEntity(e); }

		Entities.deleteEntity(this.rootID);
	};
})
