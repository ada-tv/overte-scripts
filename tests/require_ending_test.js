Script.require("./require_ending_test_submodule.js");

Script.scriptEnding.connect(() => console.warn(`${Script.fileName} ending`));
