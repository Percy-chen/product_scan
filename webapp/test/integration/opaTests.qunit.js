/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"scan/product_scan/test/integration/AllJourneys"
	], function () {
		QUnit.start();
	});
});