const MESH_URL = "https://files.thingvellir.net/legacy/share/overte/skateboard_overte.glb";
const ACTION_JUMP = Controller.findAction("TranslateY");
const ACTION_MOVEX = Controller.findAction("TranslateX");
const ACTION_MOVEZ = Controller.findAction("TranslateZ");

let skateboardID;

let controlX = 0.0, controlZ = 0.0;
let alreadyJumped = false;
let jumpHeld = false;
let jumpHeldTime = 0;
let jumping = false;

function Skateboard_Action(action, value) {
	if (action === ACTION_JUMP && value > 0.5 && !alreadyJumped) {
		alreadyJumped = true;
		jumpHeld = true;
		jumping = true;
	}
	if (action === ACTION_JUMP && value < 0.5) {
		alreadyJumped = false;
		jumpHeld = false;
	}
	if (action === ACTION_MOVEX) { controlX = value; }
	if (action === ACTION_MOVEZ) { controlZ = value; }
}

function Skateboard_Update(delta) {
	if (jumpHeld) {
		jumpHeldTime += delta;
		if (jumpHeldTime > 0.5) { Script.stop(); }
	} else {
		jumpHeldTime = 0.0;
	}

	const props = Entities.getEntityProperties(skateboardID, ["velocity", "position"]);
	let vel = props.velocity;

	const angle = Quat.cancelOutRollAndPitch(MyAvatar.headOrientation);
	const target = Vec3.multiplyQbyV(angle, {x: controlX, y: 0.0, z: controlZ});
	vel = Vec3.sum(vel, Vec3.multiply(delta * 10.0, target));
	
	if (vel.y > -0.05 && vel.y < 0.05 && jumping) {
		vel.y += 8.0;
		jumping = false;
	}

	Entities.editEntity(skateboardID, {velocity: vel});
	MyAvatar.position = Vec3.sum(props.position, {x: 0, y: MyAvatar.getHeight() / 3, z: 0});
}

function Skateboard_Spawn() {
	let pos = MyAvatar.position;

	skateboardID = Entities.addEntity({
		type: "Model",
		modelURL: MESH_URL,
		position: pos,
		orientation: MyAvatar.orientation,
		dynamic: true,
		shapeType: "box",
		gravity: {x: 0.0, y: -9.81, z: 0.0},
		velocity: {x: 0.0, y: -0.1, z: 0.0},
	}, "domain");

	pos.y += MyAvatar.getHeight() / 3;
	MyAvatar.beginSit(pos, MyAvatar.orientation);
	MyAvatar.setParentID(skateboardID);
	Script.update.connect(Skateboard_Update);
	Controller.actionEvent.connect(Skateboard_Action);
}

Script.scriptEnding.connect(() => {
	Script.update.disconnect(Skateboard_Update);
	Controller.actionEvent.disconnect(Skateboard_Action);
	MyAvatar.endSit(MyAvatar.position, MyAvatar.orientation);
	Entities.deleteEntity(skateboardID);
});

ModelCache.prefetch(MESH_URL);
Skateboard_Spawn();
