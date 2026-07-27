// SPDX-License-Identifier: CC0-1.0
"use strict";

Messages.messageReceived.connect((channel, message, senderID, _localOnly) => {
	if (channel === "chat") {
		const data = JSON.parse(message);
		OSCSocket.sendPacket("/chatbox/output", data.displayName, data.message);
	} else if (channel === "Chat-Typing") {
		const data = JSON.parse(message);
		const avatar = AvatarManager.getAvatar(senderID);

		let name = avatar.sessionDisplayName;
		if (!name) { name = avatar.displayName; }
		if (!name) { name = senderID; }

		OSCSocket.sendPacket("/chatbox/typing", data.action === "typing_start", name);
	}
});

OSCSocket.packetReceived.connect((address, args) => {
	args = args.map(x => x.value);

	if (address === "/chatbox/input") {
		let name = MyAvatar.sessionDisplayName;
		if (!name) { name = MyAvatar.displayName; }

		Messages.sendMessage("chat", JSON.stringify({
				position: MyAvatar.position,
				displayName: name,
				channel: "local",
				action: "send_chat_message",
				message: args[0],
		}));
	} else if (address === "/chatbox/typing") {
		Messages.sendMessage("Chat-Typing", JSON.stringify({
				position: MyAvatar.position,
				action: args[0] ? "typing_start" : "typing_stop",
		}));
	}
});
