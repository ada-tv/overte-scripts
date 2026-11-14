// voting2.js
// Created by Ada <ada@thingvellir.net> 2026-11-15
// SPDX-License-Identifier: CC0-1.0
// Usage: Server script on Empty entity
module.exports = (class {
	/** Widget color presets */
	COLORS = {
		base_bg: [0x40, 0x38, 0x49],
		base_fg: [0xee, 0xee, 0xee],
		button_bg: [0x60, 0x58, 0x68, 0xff].map(x => x / 255),
		button_fg: [0xee, 0xee, 0xee, 0xff].map(x => x / 255),
		button_bg_no: [0x82, 0x3d, 0x3d, 0xff].map(x => x / 255),
		button_bg_yes: [0x3a, 0x75, 0x3a, 0xff].map(x => x / 255),
	};

	/** @type {number} */
	TOPIC_WIDTH = 4;

	/** @type {number} */
	TOPIC_HEIGHT = 2;

	/** @type {number} */
	BUTTON_HEIGHT = 0.4;

	/**
     * The session ID of the "voting manager" avatar.
     * @type {Uuid?}
	 */
	managerID = null;

	/**
	 * The root entity's (this) UUID.
	 * @type {Uuid}
	 */
	id;

	/**
     * Avatar IDs that are allowed to vote. An empty set means "anyone".
     * @type {Set<Uuid>}
     */
	allowedVoters = new Set();

	castVotes = new Map();
	canVote = false;

	/** @type {Uuid} */
	lbTopic;
	/** @type {string} */
	topicText;

	/** @type {boolean} */
	anonymousVoting = true;
	/** @type {Uuid} */
	cbAnonymous;

	/** @type {Uuid} */
	btFinishRound;

	/** @type {Uuid} */
	btYes;
	/** @type {Uuid} */
	btAbstain;
	/** @type {Uuid} */
	btNo;

	resetVotes() {
		for (const { label } of this.castVotes.values()) {
			Entities.deleteEntity(label);
		}

		this.castVotes = new Map();
		this.canVote = true;

		Entities.editEntity(this.lbTopic, { text: `${this.topicText}` });
	}

	finishRound() {
		this.canVote = false;

		let yesVotes = 0;
		let abstainVotes = 0;
		let noVotes = 0;

		for (const { state } of this.castVotes.values()) {
			if (state === "yes") {
				yesVotes += 1;
			} else if (state === "abstain") {
				abstainVotes += 1;
			} else if (state === "no") {
				noVotes += 1;
			}
		}

		Entities.editEntity(this.lbTopic, {
			text: `${this.topicText}\n\nYes: ${yesVotes}\nAbstain: ${abstainVotes}\nNo: ${noVotes}`,
		});
	}

	/**
     * @param {Uuid} voterID
     * @param {string} voterName
     * @param {"yes"|"abstain"|"no"} state
	 */
	vote(voterID, voterName, state) {
		if (this.allowedVoters.size !== 0 && !this.allowedVoters.has(voterID)) { return; }
		if (!this.canVote) { return; }

		if (this.castVotes.has(voterID)) {
			let data = this.castVotes.get(voterID);
			data.state = state;

			if (!this.anonymousVoting) {
				let stateColor;

				if (state === "yes") {
					stateColor = this.COLORS.button_bg_yes.map(x => x * 255);
				} else if (state === "no") {
					stateColor = this.COLORS.button_bg_no.map(x => x * 255);
				} else {
					stateColor = this.COLORS.button_bg.map(x => x * 255);
				}

				stateColor = stateColor.slice(0, 3);
				console.log(voterName, stateColor);

				Entities.editEntity(data.label, { backgroundColor: stateColor });
			}
		} else {
			let data = {
				voterName,
				state,
			};

			let stateColor;

			if (this.anonymousVoting) {
				stateColor = this.COLORS.base_bg;
			} else if (state === "yes") {
				stateColor = this.COLORS.button_bg_yes.map(x => x * 255);
			} else if (state === "no") {
				stateColor = this.COLORS.button_bg_no.map(x => x * 255);
			} else {
				stateColor = this.COLORS.button_bg.map(x => x * 255);
			}

			stateColor = stateColor.slice(0, 3);
			console.log(voterName, stateColor);

			const padding = 0.05;
			const width = 1.5 - (padding * 2);
			const height = (this.TOPIC_HEIGHT / 6) - (padding * 2);

			const yIndex = this.castVotes.size % 6;
			const xIndex = Math.floor(this.castVotes.size / 6);

			const x = (this.TOPIC_WIDTH / 2) + (width / 2) + padding + ((width + padding) * xIndex);
			const y = (this.TOPIC_HEIGHT - (height / 2)) - ((height + padding) * yIndex);

			data.label = Entities.addEntity({
				type: "Text",
				fadeInMode: "disabled",
				fadeOutMode: "disabled",
				parentID: this.id,
				grab: { grabbable: false },
				localDimensions: [width, height, 0],
				localPosition: [x, y, 0],
				backgroundColor: stateColor,
				textColor: this.COLORS.base_fg,
				textAlpha: 0.99,
				text: voterName,
				unlit: true,
				verticalAlignment: "center",
				horizontalAlignment: "center",
				collisionless: true,
			});

			this.castVotes.set(voterID, data);
		}
	}

	preload(id) {
		this.id = id;

		Messages.subscribe("WorldUI");
		Messages.messageReceived.connect(this.#messageCallback);

		this.lbTopic = Entities.addEntity({
			type: "Text",
			fadeInMode: "disabled",
			fadeOutMode: "disabled",
			parentID: this.id,
			localPosition: [0.0, this.TOPIC_HEIGHT / 2, 0.0],
			localDimensions: [this.TOPIC_WIDTH, this.TOPIC_HEIGHT, 0.0],
			grab: { grabbable: false },
			backgroundColor: this.COLORS.base_bg,
			textColor: this.COLORS.base_fg,
			textAlpha: 0.99,
			text: `Vote manager instructions:\nSend "Voting-Topic: <topic>" in chat to set a new topic.\nPress the "Finish round" button to lock in the final votes.`,
			leftMargin: 0.05,
			rightMargin: 0.05,
			topMargin: 0.05,
			rightMargin: 0.05,
			lineHeight: 0.17,
			unlit: true,
			collisionless: true,
		});

		this.cbAnonymous = Entities.addEntity({
			type: "Empty",
			fadeInMode: "disabled",
			fadeOutMode: "disabled",
			parentID: this.id,
			localPosition: [(this.TOPIC_WIDTH / 2) + 0.1, this.TOPIC_HEIGHT + 0.1, 0.0],
			ignorePickIntersection: true,
			grab: { grabbable: false },
			script: Script.resolvePath("./checkbox.js"),
			userData: JSON.stringify({
				checked: this.anonymousVoting,
				text: "Anonymous Voting",
				width: 1,
			}),
		});

		this.btFinishRound = Entities.addEntity({
			type: "Empty",
			parentID: this.id,
			localPosition: [-(this.TOPIC_WIDTH - 1) / 2, this.TOPIC_HEIGHT + 0.1, 0.0],
			ignorePickIntersection: true,
			grab: { grabbable: false },
			script: Script.resolvePath("./button.js"),
			userData: JSON.stringify({
				backgroundColor: this.COLORS.button_bg,
				textColor: this.COLORS.button_fg,
				dimensions: [1, 0.1, 0],
				text: "Finish round",
				lineHeight: 0.08,
			}),
		});

		const buttonPadding = 0.05;
		const buttonWidth = (this.TOPIC_WIDTH - (buttonPadding * 2)) / 3;

		this.btYes = Entities.addEntity({
			type: "Empty",
			parentID: this.id,
			localPosition: [-(buttonWidth + buttonPadding), -((this.BUTTON_HEIGHT / 2) + 0.05), 0.0],
			ignorePickIntersection: true,
			grab: { grabbable: false },
			script: Script.resolvePath("./button.js"),
			userData: JSON.stringify({
				backgroundColor: this.COLORS.button_bg_yes,
				textColor: this.COLORS.button_fg,
				dimensions: [buttonWidth, this.BUTTON_HEIGHT, 0],
				text: "Yes",
				lineHeight: this.BUTTON_HEIGHT - 0.05,
				localAnimation: true,
			}),
		});

		this.btAbstain = Entities.addEntity({
			type: "Empty",
			parentID: this.id,
			localPosition: [0, -((this.BUTTON_HEIGHT / 2) + 0.05), 0.0],
			ignorePickIntersection: true,
			grab: { grabbable: false },
			script: Script.resolvePath("./button.js"),
			userData: JSON.stringify({
				backgroundColor: this.COLORS.button_bg,
				textColor: this.COLORS.button_fg,
				dimensions: [buttonWidth, this.BUTTON_HEIGHT, 0],
				text: "Abstain",
				lineHeight: this.BUTTON_HEIGHT - 0.05,
				localAnimation: true,
			}),
		});

		this.btNo = Entities.addEntity({
			type: "Empty",
			parentID: this.id,
			localPosition: [buttonWidth + buttonPadding, -((this.BUTTON_HEIGHT / 2) + 0.05), 0.0],
			ignorePickIntersection: true,
			grab: { grabbable: false },
			script: Script.resolvePath("./button.js"),
			userData: JSON.stringify({
				backgroundColor: this.COLORS.button_bg_no,
				textColor: this.COLORS.button_fg,
				dimensions: [buttonWidth, this.BUTTON_HEIGHT, 0],
				text: "No",
				lineHeight: this.BUTTON_HEIGHT - 0.05,
				localAnimation: true,
			}),
		});
	}

	unload() {
		Entities.deleteEntity(this.lbTopic);
		Entities.deleteEntity(this.cbAnonymous);

		Messages.messageReceived.disconnect(this.#messageCallback);
	}

	uiMsg(msg, sender) {
		if (msg.source_id === this.id) { return; }

		if (
			msg.target_id === this.cbAnonymous &&
			msg.set_properties?.checked !== undefined
		) {
			if (sender === this.managerID) {
				this.anonymousVoting = msg.set_properties.checked;
			} else {
				Messages.sendMessage("WorldUI", JSON.stringify({
					source_id: this.id,
					target_id: this.cbAnonymous,
					set_properties: { checked: this.anonymousVoting },
				}));
			}
		}

		if (msg.target_id === this.btYes && msg.click) {
			this.vote(sender, sender, "yes");
		}

		if (msg.target_id === this.btAbstain && msg.click) {
			this.vote(sender, sender, "abstain");
		}

		if (msg.target_id === this.btNo && msg.click) {
			this.vote(sender, sender, "no");
		}

		if (sender === this.managerID && msg.target_id === this.btFinishRound && msg.click) {
			this.finishRound();
		}
	}

	#messageCallback = (channel, rawMsg, sender, _local) => {
		if (channel === "WorldUI") {
			this.uiMsg(JSON.parse(rawMsg), sender);
		} else if (channel === "chat" && sender === this.managerID && !this.canVote) {
			const msg = JSON.parse(rawMsg);

			if (msg.action !== "send_chat_message") { return; }

			const topicMatch = msg.message.match(/^voting-topic: (.+)/i);

			if (topicMatch) {
				this.topicText = topicMatch[1];
				this.resetVotes();
			}
		}
	};
})
