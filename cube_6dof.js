"use strict";

Window.displayAnnouncement("Press the Backspace key to stop flying.");

let entityType = "domain";
if (!Entities.canRez()) { entityType = "avatar"; }
if (!Entities.canRezAvatarEntities()) { entityType = "local"; }

const chair = Entities.addEntity({
	type: "Box",
	position: MyAvatar.position,
	dimensions: [0.5, 0.1, 0.5],
	collisionless: true,
	damping: 0.8,
	angularDamping: 0.8,
}, entityType);

MyAvatar.beginSit(MyAvatar.position, Quat.IDENTITY);
MyAvatar.setParentID(chair);
Camera.mode = "third person";

const input = {
	translate: [0, 0, 0],
	rotate: [0, 0, 0],
};

Controller.keyPressEvent.connect(event => {
	if (event.key === 0x01000003) { delayed_stop(); }

	switch (event.text) {
		case "w": input.translate[2] = -1.0; break;
		case "s": input.translate[2] = 1.0; break;
		case "a": input.translate[0] = -1.0; break;
		case "d": input.translate[0] = 1.0; break;
		case "e": input.translate[1] = 1.0; break;
		case "q": input.translate[1] = -1.0; break;

		case "i": input.rotate[0] = -1.0; break;
		case "k": input.rotate[0] = 1.0; break;
		case "j": input.rotate[1] = 1.0; break;
		case "l": input.rotate[1] = -1.0; break;
		case "u": input.rotate[2] = 1.0; break;
		case "o": input.rotate[2] = -1.0; break;
	}
});

Controller.keyReleaseEvent.connect(event => {
	switch (event.text) {
		case "w": input.translate[2] = 0; break;
		case "s": input.translate[2] = 0; break;
		case "a": input.translate[0] = 0; break;
		case "d": input.translate[0] = 0; break;
		case "e": input.translate[1] = 0; break;
		case "q": input.translate[1] = 0; break;

		case "i": input.rotate[0] = 0; break;
		case "k": input.rotate[0] = 0; break;
		case "j": input.rotate[1] = 0; break;
		case "l": input.rotate[1] = 0; break;
		case "u": input.rotate[2] = 0; break;
		case "o": input.rotate[2] = 0; break;
	}
});

let already_stopping = false;

Script.update.connect(dt => {
	if (already_stopping) { return; }

	const { rotation, velocity, angularVelocity } = Entities.getEntityProperties(chair, ["rotation", "velocity", "angularVelocity"]);
	Entities.editEntity(chair, {
		velocity: Vec3.sum(velocity, Vec3.multiply(Vec3.multiplyQbyV(rotation, input.translate), dt * 3)),
		angularVelocity: Vec3.sum(angularVelocity, Vec3.multiply(Vec3.multiplyQbyV(rotation, input.rotate), dt * 3)),
	});
	MyAvatar.orientation = rotation;
});

function delayed_stop() {
	already_stopping = true;

	MyAvatar.setParentID(Uuid.NONE);
	Entities.deleteEntity(chair);

	Script.setTimeout(() => {
		Camera.mode = "idependent";
		Camera.orientation = Quat.IDENTITY;
		MyAvatar.orientation = Quat.IDENTITY;
		MyAvatar.endSit(MyAvatar.position, MyAvatar.orientation);
	}, 200);
	Script.setTimeout(() => {
		Camera.mode = "look at";
		Script.stop();
	}, 400);
}

Script.scriptEnding.connect(() => {
	if (!already_stopping) {
		MyAvatar.setParentID(Uuid.NONE);
		Entities.deleteEntity(chair);
		MyAvatar.endSit(MyAvatar.position, MyAvatar.orientation);
		MyAvatar.orientation = Quat.IDENTITY;
	}
});
