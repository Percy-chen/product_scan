/*global QUnit*/

sap.ui.define([
	"scan/product_scan/controller/production_scan.controller"
], function (Controller) {
	"use strict";

	QUnit.module("production_scan Controller");

	QUnit.test("I should test the production_scan controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});