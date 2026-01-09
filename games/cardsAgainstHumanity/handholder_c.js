(function() { "use strict";
	// TODO: this is always a client script, how can i figure this out?
	const callEntityMethod = Entities.callEntityServerMethod;

	this.selfID = "";

	this.preload = function(selfID) {
		this.selfID = selfID;
		if (HMD.active) { callEntityMethod(this.selfID, "lockPosition"); }
	};

	this.startNearGrab = function(_id, _args) {
		callEntityMethod(this.selfID, "lockPosition");
	};

	this.startDistanceGrab = function(_id, _args) {
		callEntityMethod(this.selfID, "lockPosition");
	};

	HMD.displayModeChanged.connect(vr => {
		if (vr) { callEntityMethod(this.selfID, "lockPosition"); }
	});
})
