sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"scan/product_scan/model/models",
	"sap/ui/model/json/JSONModel"
], function (UIComponent, Device, models, JSONModel) {
	"use strict";

	return UIComponent.extend("scan.product_scan.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// enable routing
			this.getRouter().initialize();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			this.setModel(models.createLocalModel());
			this._JSONModel = this.getModel();
			var that = this;
			this.getModel("userAttributes").attachRequestCompleted(function (oEvent) {
				var userAttributes = this.getData();
				that._JSONModel.setProperty("/Head/Creater", userAttributes.name);
			});
		}
	});
});
// sap.ui.define(["sap/ui/core/UIComponent",
// 	"sap/ui/model/resource/ResourceModel",
// 	"sap/ui/model/odata/v2/ODataModel",
// 	"sap/ui/Device",
// 	"./controller/messages",
// 	"./model/models"
// ], function (UIComponent, ResourceModel, ODataModel, Device, messages, models) {
// 	// 严格JS 模式
// 	"use strict";
// 	return UIComponent.extend("scan.product_scan.Component", {
// 		//---元数据
// 		metadata: {
// 			manifest: "json"
// 		},

// 		//---初始化方法
// 		init: function () {

// 			// 设置设备模型
// 			this.setModel(models.createDeviceModel(), "device");

// 			// 设置FLP模型
// 			this.setModel(models.createFLPModel(), "FLP");

// 			// 设置本地模型
// 			this.setModel(models.createLocalModel());

// 			//---本地资源model路径获取

// 			//---页面跳转初始化
// 			UIComponent.prototype.init.apply(this, arguments);
// 			this.getRouter().initialize();
// 		},

// 		// 退出后销毁事件
// 		destroy: function () {
// 			this.getModel().destroy();
// 			this.getModel("i18n").destroy(); // 本地测试注释
// 			this.getModel("FLP").destroy(); // 本地测试注释
// 			this.getModel("device").destroy(); // 本地测试注释
// 			// this.getModel("OData").destroy(); // 本地测试注释
// 			UIComponent.prototype.destroy.apply(this, arguments);
// 		}
// 	});
// });