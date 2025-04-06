// SPDX-License-Identifier: CC0-1.0
(function() {
	this.enterEntity = (eid) => {
		ScriptDiscoveryService.loadScript(Entities.getEntityProperties(eid, "userData").userData);
	};
})
