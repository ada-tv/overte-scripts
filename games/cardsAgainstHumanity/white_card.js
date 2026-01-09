(function() { "use strict";
	// TODO: this is always a client script, how can i figure this out?
	const callEntityMethod = Entities.callEntityMethod;

	// none of these are documented anywhere, i had to reference the controller scripts
	this.remotelyCallable = ["startNearGrab", "startDistanceGrab", "releaseGrab"];

	this.startNearGrab = function(id, _args) {
		const { parentID } = Entities.getEntityProperties(id, "parentID");
		callEntityMethod(parentID, "dropCardOwnership", [id]);
	};

	this.startDistanceGrab = function(id, _args) {
		const { parentID } = Entities.getEntityProperties(id, "parentID");
		callEntityMethod(parentID, "dropCardOwnership", [id]);
	};
	
	this.releaseGrab = function(id, _args) {
		const { position } = Entities.getEntityProperties(id, "position");
		const holderCandidates = Entities.findEntitiesByTags(["card hand holder"], position, 0.3);

		if (holderCandidates.length === 0) { return; }

		callEntityMethod(holderCandidates[0], "takeCardOwnership", [id]);
	};
})
