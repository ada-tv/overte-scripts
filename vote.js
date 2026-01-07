// vote.js
// Created by Ada <ada@thingvellir.net> on 2025-12-16
// SPDX-License-Identifier: CC0-1.0
// Usage:
// - Server script on a Text entity spawns everything out
// - Send "Voting-Topic: my topic" in chat to change the vote topic
(class VotingPanel {
	static defaultTextProperties = {
		type: "Text",
		unlit: true,
		lineHeight: 0.2,
		backgroundAlpha: 0.95,
		backgroundColor: "#403849",
		textColor: "white",
		textEffect: "outline fill",
		textEffectThickness: 0.2,
		textEffectColor: "#403849",
		leftMargin: 0.02,
		rightMargin: 0.02,
		topMargin: 0.02,
		bottomMargin: 0.02,
		grab: { grabbable: false },
	};

	remotelyCallable = ["submitVote"];

	selfID;
	helpID;
	topicID;
	optionYesID;
	optionNoID;
	optionAbstainID;
	votesRevealed = false;
	activeVotes = new Map();

	topicText = "No topic set";

	chatMessage(message) {
		if (message.startsWith("Voting-Topic: ")) {
			this.topicText = message.slice("Voting-Topic: ".length);
			this.activeVotes.clear();
			this.votesRevealed = false;
			try {
			this.refresh();
			} catch (e) { console.error(e); }
		} else if (message.startsWith("Voting-Done")) {
			this.votesRevealed = true;
			this.topicText = `${this.topicText} (Done)`;
			this.refresh();
		} else if (message.startsWith("Voting-Finished")) {
			this.votesRevealed = true;
			this.unload();
		}
	}

	submitVote(_selfID, rawParams) {
		if (this.votesRevealed) { return; }

		let params;
		try {
			params = JSON.parse(rawParams[0]);
		} catch (e) {
			console.error(e);
			return;
		}

		this.activeVotes.set(params.avatarUUID, {
			displayName: params.displayName,
			vote: params.vote,
		});

		this.refresh();

		console.debug(`${params.displayName} voted ${params.vote}`);
	}

	refresh() {
		let yesVotes = 0;
		let abstainVotes = 0;
		let noVotes = 0;

		let voteListText = [];
		for (const [_, entry] of this.activeVotes) {
			voteListText.push(entry.displayName);

			switch (entry.vote) {
				case "yes": yesVotes++; break;
				case "abstain": abstainVotes++; break;
				case "no": noVotes++; break;
			}
		}

		if (voteListText.length > 0) {
			voteListText = `Submitted votes:\n  ${voteListText.join("\n  ")}`;
		} else {
			voteListText = "No votes";
		}

		Entities.editEntity(this.selfID, { text: voteListText });
		Entities.editEntity(this.topicID, { text: this.topicText });

		if (this.votesRevealed) {
			Entities.editEntity(this.optionYesID, { text: `Yes (${yesVotes})` });
			Entities.editEntity(this.optionAbstainID, { text: `Abstain (${abstainVotes})` });
			Entities.editEntity(this.optionNoID, { text: `No (${noVotes})` });
		} else {
			Entities.editEntity(this.optionYesID, { text: "Yes" });
			Entities.editEntity(this.optionAbstainID, { text: "Abstain" });
			Entities.editEntity(this.optionNoID, { text: "No" });
		}

		console.debug(`Yes (${yesVotes}), Abstain (${abstainVotes}), No (${noVotes})`);
	}

	buttonClickScript(vote) {
		const callEntityMethod = (
			Script.context === "entity_server" ?
			"callEntityServerMethod" :
			"callEntityMethod"
		);

		return `(function() {
			this.mousePressOnEntity = (_, event) => {
				if (!event.isPrimaryButton) { return; }
				Entities.${callEntityMethod}(
					${JSON.stringify(this.selfID)},
					"submitVote",
					[JSON.stringify({
						avatarUUID: MyAvatar.sessionUUID,
						displayName: MyAvatar.displayName,
						vote: ${JSON.stringify(vote)},
					})]
				);
			};
		})`;
	}

	preload(_selfID) {
		this.selfID = _selfID;
		Entities.editEntity(this.selfID, {
			name: "Voting Panel",
			dimensions: [4, 2, 0.01],
			text: "No votes",
			...VotingPanel.defaultTextProperties,
			lineHeight: 0.15,
			grab: {
				grabbable: true,
				grabDelegateToParent: true,
			},
		});

		this.helpID = Entities.addEntity({
			name: "Voting Panel: Help",
			parentID: this.selfID,
			text: `Info for voting leader:\n\n-  Type "Voting-Topic: <topic>" into the chat to change the voting topic. This will automatically clear the vote counts.\n\n-  Type "Voting-Done" into the chat to finish a round of voting and show the results.\n\n-  Type "Voting-Finished" into the chat to delete the voting panel.`,
			dimensions: [1.5, 2, 0.01],
			localPosition: [-2.78, 0, 0],
			...VotingPanel.defaultTextProperties,
			lineHeight: 0.08,
		});

		this.topicID = Entities.addEntity({
			name: "Voting Panel: Topic",
			parentID: this.selfID,
			text: this.topicText,
			dimensions: [4, 0.25, 0.01],
			localPosition: [0, 1.15, 0],
			...VotingPanel.defaultTextProperties,
		});

		this.optionYesID = Entities.addEntity({
			name: "Voting Panel: Vote Yes",
			parentID: this.selfID,
			text: "Yes",
			alignment: "center",
			dimensions: [(4 / 3) - 0.01, 0.25, 0.01],
			localPosition: [-(4 / 3) - 0.01, -1.15, 0],
			...VotingPanel.defaultTextProperties,
			backgroundColor: "#3a753a",
			textEffectColor: "#3a753a",
			script: `(${this.buttonClickScript("yes")})`,
		});

		this.optionAbstainID = Entities.addEntity({
			name: "Voting Panel: Vote Abstain",
			parentID: this.selfID,
			text: "Abstain",
			alignment: "center",
			dimensions: [(4 / 3) - 0.01, 0.25, 0.01],
			localPosition: [0, -1.15, 0],
			...VotingPanel.defaultTextProperties,
			script: `(${this.buttonClickScript("abstain")})`,
		});

		this.optionNoID = Entities.addEntity({
			name: "Voting Panel: Vote No",
			parentID: this.selfID,
			text: "No",
			alignment: "center",
			dimensions: [(4 / 3) - 0.01, 0.25, 0.01],
			localPosition: [(4 / 3) + 0.01, -1.15, 0],
			...VotingPanel.defaultTextProperties,
			backgroundColor: "#823d3d",
			textEffectColor: "#823d3d",
			script: `(${this.buttonClickScript("no")})`,
		});

		Messages.subscribe("chat");
		Messages.messageReceived.connect((channel, message, _senderID, _localOnly) => {
			if (channel !== "chat") { return; }

			try {
				const data = JSON.parse(message);
				if (data?.action === "send_chat_message") {
					this.chatMessage(data.message);
				}
			} catch (e) {
				console.error(e);
			}
		});
	}

	unload() {
		Entities.editEntity(this.selfID, { text: "Voting is over.\nThis text entity may be deleted." });
		Entities.deleteEntity(this.helpID);
		Entities.deleteEntity(this.topicID);
		Entities.deleteEntity(this.optionYesID);
		Entities.deleteEntity(this.optionNoID);
		Entities.deleteEntity(this.optionAbstainID);
	}
})
