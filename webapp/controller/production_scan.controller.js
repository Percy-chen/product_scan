sap.ui.define(["./BaseController",
		"sap/ui/model/json/JSONModel",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		"sap/m/MessageToast",
		"sap/m/MessageBox",
		"./messages"
	],

	function (BaseController, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, messages) {
		"use strict";
		return BaseController.extend("scan.product_scan.controller.production_scan", {
			onInit: function () {
				// var oModel = new JSONModel();
				// this.setModel(oModel);
				// this._ODataModel = this.getModel("OData");
				this._JSONModel = this.getModel();
				//设置语言
				var sLanguage = sap.ui.getCore().getConfiguration().getLanguage();
				switch (sLanguage) {
				case "zh-Hant":
				case "zh-TW":
					sLanguage = "ZF";
					break;
				case "zh-Hans":
				case "zh-CN":
					sLanguage = "ZH";
					break;
				case "EN":
				case "en":
					sLanguage = "EN";
					break;
				default:
					break;
				}
				this._JSONModel.setProperty("/LogInLangu", sLanguage);
			},
			onAfterRendering: function () {
				this.setBarcodeInputFocus();
			},

			//產成品掃描查詢-获取生产订单信息
			onSearchProdOrderInfo: function () {
				this.setBusy(true);
				var flag = "";
				var sLanguage = this._JSONModel.getData().LogInLangu;
				var Head = this._JSONModel.getData().Head;
				var SNumberList = this._JSONModel.getData().SNumberList; //序列号列表
				var SNum = this.byId("SNumber").getValue(); //成品序列號
				var oSerialNumber = this.byId("SearchSN"); //扫描数据
				var sSerialNumber = oSerialNumber.getValue();
				if (sSerialNumber === "") {
					this.setBusy(false);
					MessageToast.show("請先進行數據掃描！");
					return;
				}
				if (sSerialNumber === "ESC003") {
					this.handleSave();
				} else if (parseInt(sSerialNumber) >= 1000000 & parseInt(sSerialNumber) <= 1999999) {
					this.byId("SNumber").setValue("");
					this._ODataModel = this.getModel("SerialProdOrderInfo");
					this._JSONModel.setProperty("/CompList2", []);
					this._JSONModel.setProperty("/SNScanData", []);
					// this._JSONModel = this.getModel();
					var sUrl = "/YY1_SNMfgDetail";
					var oFilter1 = new sap.ui.model.Filter("Language", sap.ui.model.FilterOperator.EQ, sLanguage);
					var oFilter2 = new sap.ui.model.Filter("ManufacturingOrder", sap.ui.model.FilterOperator.EQ, sSerialNumber);
					var aFilters = [oFilter1, oFilter2];
					var mParameters = {
						filters: aFilters,
						success: function (oData, response) {
							if (response.statusCode === "200") {
								var DataList = !oData ? [] : oData.results;
								if (DataList.length === 0) {
									MessageToast.show("未查詢到相關訂單信息~");
									this.setBusy(false);
									return;
								}
								this._JSONModel.setProperty("/HEADLOG", DataList);

								var Arry = !oData ? [] : oData.results[0];
								this.getHead(Arry.ManufacturingOrder); //查询已保存的头表
								this._JSONModel.setProperty("/Head", Arry);
								oSerialNumber.setValue("");
								this._JSONModel.setProperty("/SNumberList", DataList);
								if (Arry.ManufacturingOrder !== "") {
									this.onSearchComp(Arry.ManufacturingOrder);
								}
							}
							// this.setBusy(false);
						}.bind(this),
						error: function (oError) {
							this.setBusy(false);
						}.bind(this)
					};
					this._ODataModel.read(sUrl, mParameters);
				} else {
					if (Head.ManufacturingOrder !== "" & SNum === "") {
						for (var i = 0; i < SNumberList.length; i++) {
							if (sSerialNumber === SNumberList[i].SerialNumber) {
								this.byId("SNumber").setValue(sSerialNumber);
								this.byId("SearchSN").setValue();
								flag = "X";
								this.SNChange();
							}
						}
						if (flag === "") {
							MessageToast.show("成品序號掃描錯誤！");
							this.byId("SearchSN").setValue();
							this.setBusy(false);
							return;
						}
					} else if (Head.ManufacturingOrder !== "" & SNum !== "") {
						this.onSearchCompSN(Head.ManufacturingOrder);
					}
				}
			},
			//查询已存储得数据
			getHead: function (ProductionOrderID) {
				var sUrl = "/YY1_SNMfgDetail";
				var oFilter1 = new sap.ui.model.Filter("ProductionOrderID", sap.ui.model.FilterOperator.EQ, ProductionOrderID);
				var aFilters = [oFilter1];
				var mParameters = {
					filters: aFilters,
					success: function (oData, response) {
						if (response.statusCode === "200") {
							var DataList = !oData ? [] : oData.results;
							// if (DataList.length === 0) {
							// 	return;
							// }
							this._JSONModel.setProperty("/oldHeadData", DataList);
						}
						this.setBusy(false);
					}.bind(this),
					error: function (oError) {
						this.setBusy(false);
					}.bind(this)
				};
				this.getModel("SaveOrderSN").read("/YY1_MFGORDERSNRECORD", mParameters);
			},
			onSearchComp: function (ManufacturingOrder) {
				this.setBusy(true);
				this._ODataModel = this.getModel("OrderCompInfo");
				var sUrl = "/YY1_MfgOrderComp";
				var sLanguage = this._JSONModel.getData().LogInLangu;
				var oFilter1 = new sap.ui.model.Filter("ManufacturingOrder", sap.ui.model.FilterOperator.EQ, ManufacturingOrder);
				var oFilter2 = new sap.ui.model.Filter("Language", sap.ui.model.FilterOperator.EQ, sLanguage);
				var aFilters = [oFilter1, oFilter2];
				var mParameters = {
					filters: aFilters,
					success: function (oData, response) {
						if (response.statusCode === "200") {
							var Arry = !oData ? [] : oData.results;
							var SplitData = [];
							if (Arry.length > 0) {
								for (var i = Arry.length - 1; i >= 0; i--) {
									Arry[i].ProductionOrderID = Arry[i].ManufacturingOrder;
									var QtyPerSN = Math.ceil(Arry[i].QtyPerSN);
									if (QtyPerSN === 0) {
										Arry.splice(i, 1);
									} else {
										if (QtyPerSN > 1) {
											for (var m = 0; m < QtyPerSN - 1; m++) {
												var str = JSON.stringify(Arry[i]);
												SplitData.push(JSON.parse(str));
											}
										}
									}
								}
							}
							var Line = Arry.length;
							for (var i = 0; i < SplitData.length; i++) {
								SplitData[i].ProductionOrderID = SplitData[i].ManufacturingOrder;
								Arry.push(SplitData[i]);
							}
							this._JSONModel.setProperty("/CompList", Arry);
							this.onSearchSNProfile(Arry);
							// this._JSONModel.setProperty("/CompList2", Arry);
						}
						// this.setBusy(false);
					}.bind(this),
					error: function (oError) {
						this.setBusy(false);
					}.bind(this)
				};
				this._ODataModel.read(sUrl, mParameters);
			},
			//扫描组件条码
			onSearchCompSN: function (ManufacturingOrder) {
				var sLanguage = this._JSONModel.getData().LogInLangu;
				var Head = this._JSONModel.getData().Head;
				var oSerialNumber = this.byId("SearchSN"); //组件序列號
				var sSerialNumber = oSerialNumber.getValue();
				if (sSerialNumber === "") {
					MessageToast.show("請先輸入组件序列號！");
					this.setBusy(false);
					return;
				}
				this._ODataModel = this.getModel("MATERIALSN");
				var sUrl = "/MATERIALSN";
				var oFilter1 = new sap.ui.model.Filter("PLANT", sap.ui.model.FilterOperator.EQ, Head.ProductionPlant);
				var oFilter2 = new sap.ui.model.Filter("SERIALNUMBER", sap.ui.model.FilterOperator.EQ, sSerialNumber);
				var oFilter3 = new sap.ui.model.Filter("DELFLAG", sap.ui.model.FilterOperator.EQ, "");
				var aFilters = [oFilter1, oFilter2, oFilter3];
				oSerialNumber.setValue("");
				var mParameters = {
					filters: aFilters,
					success: function (oData, response) {
						if (response.statusCode === 200) {
							var Arry = !oData ? [] : oData.results;
							if (Arry.length === 0) {
								MessageToast.show("匹配不到物料！");
								this.setBusy(false);
								return;
							}
							for (var i = 0; i < Arry.length; i++) {
								Arry[i].Material = Arry[i].MATERIAL;
								Arry[i].SerialNumber = Arry[i].SERIALNUMBER;
								Arry[i].Plant = Arry[i].PLANT;
							}
							var CompList = this._JSONModel.getData().CompList2;
							var Historydata = this._JSONModel.getData().Historydata;
							// var SNScanData1 = this._JSONModel.getData().SNScanData;
							var finishflag = ""; //判断是否全部扫描完成
							var addflag = ""; //判断是否存在新增行
							var flag = ""; //判断条码是否已经扫描
							var matchflag = ""; //判断扫码序列号是否能匹配物料
							if (CompList.length === 0) {
								// Arry[0].ItemNum = 10;
								this._JSONModel.setProperty("/CompList2", Arry);
								// this.handleSave(Arry);
							} else {
								for (var i = 0; i < Historydata.length; i++) {
									for (var n = 0; n < Arry.length; n++) {
										if (Arry[n].SerialNumber === Historydata[i].SerialNumber & Arry[n].Material === Historydata[i].Component & Historydata[i].Remark ===
											"0") {
											flag = "X";
										}
									}
								}
								if (flag === "X") {
									MessageToast.show("該條碼已在列表中！");
									this.setBusy(false);
									// oSerialNumber.setValue("");
									return;
								} else {
									//判断新增数据
									for (var i = 0; i < CompList.length; i++) {
										if (CompList[i].AddItem === "X" & CompList[i].Material === "" & CompList[i].SerialNumber === "") {
											CompList[i].SerialNumber = Arry[0].SerialNumber;
											CompList[i].Material = Arry[0].Material;
											addflag = "X";
											this.getMaterialName(CompList[i], Arry[0].Material);
											// var that = this;
											// var promise = new Promise(function (resolve, reject) {
											// 	that.getMaterialName(that, Arry[0].Material).then(function (oData) {
											// 		CompList[i].ProductName = oData.results[0].ProductName;
											// 	});
											// });
										}
									}
									if (addflag === "") {
										if (Arry.length === 1) {
											for (var i = 0; i < CompList.length; i++) {
												if (CompList[i].Material !== "" & CompList[i].SerialNumber === "") {
													finishflag = "X";
												}
												if (CompList[i].Material === Arry[0].Material & CompList[i].SerialNumber === "") {
													CompList[i].SerialNumber = Arry[0].SerialNumber;
													matchflag = "X";
													// CompList[i].ProductName = Arry[n].ProductName;
													break;
												}
											}
										} else {
											for (var i = 0; i < CompList.length; i++) {
												if (CompList[i].Material !== "" & CompList[i].SerialNumber === "") {
													finishflag = "X";
												}

												for (var n = 0; n < Arry.length; n++) {
													if (CompList[i].Material === Arry[n].Material & CompList[i].SerialNumber === "") {
														CompList[i].SerialNumber = Arry[n].SerialNumber;
														// CompList[i].ProductName = Arry[n].ProductName;
														matchflag = "X";
														break;
													}
												}
											}
										}
										if (finishflag === "") {
											MessageToast.show("組件已經全部掃描完成，請檢查序列號信息！");
											this.setBusy(false);
											return;
										}
										if (matchflag === "") {
											MessageToast.show("匹配不到物料！");
											this.setBusy(false);
											return;
										}
									}
									// var Head = this._JSONModel.getData().Head;
									var SNum = this.byId("SNumber").getValue(); //成品序列號
									var SNScanData = this._JSONModel.getData().SNScanData;
									for (var i = 0; i < SNScanData.length; i++) {
										if (SNScanData[i].Component === Arry[0].Material & SNScanData[i].SerialNumber === "" & SNum === SNScanData[i].FERTSerialNumber) {
											SNScanData[i].SerialNumber = Arry[0].SerialNumber;
											SNScanData[i].ProductName = Arry[0].ProductName;
											break;
										}
									}
									this._JSONModel.setProperty("/SNScanData", SNScanData);
									this._JSONModel.setProperty("/CompList2", CompList);
									// this.getOlditem(sSerialNumber);
								}
							}
						}
						this.setBusy(false);
					}.bind(this),
					error: function (oError) {
						this.setBusy(false);
					}.bind(this)
				};
				this._ODataModel.read(sUrl, mParameters);
			},
			getOlditem: function (sFilter) {
				var sUrl = "/YY1_ROHMATSNRECORD";
				// var oFilter1 = new sap.ui.model.Filter("SerialNumber", sap.ui.model.FilterOperator.EQ, SN);
				// var aFilters = [oFilter1];
				var mParameters = {
					filters: sFilter,
					success: function (oData, response) {
						if (response.statusCode === "200") {
							var Arry = !oData ? [] : oData.results;
							// var Historydata = this._JSONModel.getData().Historydata;
							// if (Arry.length > 0) {
							// 	for (var i = 0; i < Arry.length; i++) {
							// 		Historydata.push(Arry[i]);
							// 	}
							// }
							this._JSONModel.setProperty("/Historydata", Arry);
						}
					}.bind(this),
					error: function (oError) {
						this.setBusy(false);
					}.bind(this)
				};
				this.getModel("CompSN").read(sUrl, mParameters);
			},
			handleSave: function () {
				this.setBusy(true);
				var Head = this._JSONModel.getData().Head;
				var CompList2 = this._JSONModel.getData().CompList2;
				var SNum = this.byId("SNumber").getValue(); //成品序列號
				if (Head.length === 0 || CompList2.length === 0) {
					MessageToast.show("請先掃描條碼！");
					this.setBusy(false);
					return;
				}
				if (SNum === "") {
					MessageToast.show("請先掃描成品序列號！");
					this.setBusy(false);
					return;
				}
				var that = this;
				that.UpdateORPost(that);
				//保存数据
				that.postToS4HC().then(function (oData1) {
					that.updateDelflag(that);
					that.byId("SNumber").setValue("");
					that.byId("SearchSN").setValue("");
				});

				// this._ODataModel = this.getModel("CompSN");
				// var saveData = [];
				// var sUrl = "/YY1_ROHMATSNRECORD";
				// var mParameter = {
				// 	success: function (oData) {
				// 		MessageToast.show("保存成功！");
				// 		return;
				// 	},
				// 	error: function (oError) {
				// 		MessageToast.show("保存失败！");
				// 		return;
				// 	}
				// };
				// for (var i = 0; i < CompList2.length; i++) {
				// 	if (CompList2[i].SerialNumber === "") {
				// 		MessageToast.show("未完成全部物料扫描！");
				// 		break;
				// 	}
				// }
				// // this.onSaveHead(HEADLOG);
				// for (var i = 0; i < CompList2.length; i++) {
				// 	saveData = {
				// 		Component: CompList2[i].Material, //组件料号
				// 		SerialNumber: CompList2[i].SerialNumber, //组件序列号
				// 		ProductionOrderID: Head.ManufacturingOrder, //生产订单号
				// 		SAP_Description: CompList2[i].ProductName, //组件描述
				// 		FERTSerialNumber: SNum, //成品序列号
				// 		Remark: CompList2[i].Remark
				// 	};
				// 	this._ODataModel.create(sUrl, saveData, mParameter);
				// }
			},
			postToS4HC: function () {
				var that = this;
				var promise = new Promise(function (resolve, reject) {
					that.createHeader(that).then(function (oData) {
						that.CreateItem(that);
						resolve(oData);
					});
				});
				// var promise = new Promise(function (resolve, reject) {
				// 	that.createECN(that).then(function (oData) {
				// 		resolve(oData);
				// 	});
				// });
				return promise;
			},
			createHeader: function (oController) {
				var SNum = oController.byId("SNumber").getValue(); //成品序列號
				var updateHead = oController._JSONModel.getData().updateHead; // updateData
				var postHead = oController._JSONModel.getData().postHead; // postData
				var updateData = [];
				var postDate = [];
				var promise = new Promise(function (resolve, reject) {
					var mParameter = {
						success: function (oData) {
							resolve(oData);
						},
						error: function (oError) {
							reject(oError);
						}
					};
					if (updateHead.length > 0) {
						for (var i = 0; i < updateHead.length; i++) {
							updateData = {
								SAP_UUID: updateHead[i].SAP_UUID,
								ProductionOrderID: updateHead[i].ManufacturingOrder,
								SerialNumber: updateHead[i].SerialNumber,
								FERTMaterial: updateHead[i].Product,
								ProductName: updateHead[i].ProductName,
								ProductionPlant: updateHead[i].ProductionPlant,
								ManufacturingOrderType: updateHead[i].ManufacturingOrderType,
								MfgOrderPlannedEndDate: oController.ChangeDate(updateHead[i].MfgOrderScheduledEndDate),
								MfgOrderPlannedStartDate: oController.ChangeDate(updateHead[i].MfgOrderScheduledStartDate)
							};
							var sUrl = "/YY1_MFGORDERSNRECORD(guid'" + updateHead[i].SAP_UUID + "')";
							oController.getModel("SaveOrderSN").update(sUrl, updateData, mParameter);
						}
					}
					if (postHead.length > 0) {
						for (var i = 0; i < postHead.length; i++) {
							postDate = {
								ProductionOrderID: postHead[i].ManufacturingOrder,
								SerialNumber: postHead[i].SerialNumber,
								FERTMaterial: postHead[i].Product,
								ProductName: postHead[i].ProductName,
								ProductionPlant: postHead[i].ProductionPlant,
								ManufacturingOrderType: postHead[i].ManufacturingOrderType,
								MfgOrderPlannedEndDate: oController.ChangeDate(postHead[i].MfgOrderScheduledEndDate),
								MfgOrderPlannedStartDate: oController.ChangeDate(postHead[i].MfgOrderScheduledStartDate)
							};
							oController.getModel("SaveOrderSN").create("/YY1_MFGORDERSNRECORD", postDate, mParameter);
						}

					}
				});
				return promise;
			},
			CreateItem: function (that) {
				var Head = that._JSONModel.getData().Head;
				var CompList2 = that._JSONModel.getData().CompList2;
				var SNum = that.byId("SNumber").getValue(); //成品序列號
				var updateItem = that._JSONModel.getData().updateItem; // 更新数据
				var postItem = that._JSONModel.getData().postItem; // 新增数据
				var Deldata = that._JSONModel.getData().Deldata; // 删除数据
				var updateData = [];
				var postDate = [];
				for (var i = 0; i < CompList2.length; i++) {
					if (CompList2[i].SerialNumber === "") {
						MessageToast.show("未完成全部物料掃描！");
						// that.setBusy(false);
						// return;
					}
				}
				var mParameter = {
					success: function (oData) {
						MessageToast.show("保存成功！");
						that.setBusy(false);
						// return;
					},
					error: function (oError) {
						var oError = oError;
						that.setBusy(false);
					}
				};
				if (updateItem.length > 0) {
					for (var i = 0; i < updateItem.length; i++) {
						updateData = {
							SAP_UUID: updateItem[i].SAP_UUID, //ID
							Component: updateItem[i].Material, //组件料号
							SerialNumber: updateItem[i].SerialNumber, //组件序列号
							ProductionOrderID: Head.ManufacturingOrder, //生产订单号
							SAP_Description: updateItem[i].ProductName, //组件描述
							FERTSerialNumber: SNum, //成品序列号
							Remark: updateItem[i].Remark,
							Plant: updateItem[i].Plant,
							CreateDate: new Date(updateItem[i].CreateDate),
							ChangeDate: new Date()
						};
						var sUrl = "/YY1_ROHMATSNRECORD(guid'" + updateItem[i].SAP_UUID + "')";
						that.getModel("CompSN").update(sUrl, updateData, mParameter);
					}
				}
				if (Deldata.length > 0) {
					for (var i = 0; i < Deldata.length; i++) {
						var sUrl = "/YY1_ROHMATSNRECORD(guid'" + Deldata[i].SAP_UUID + "')";
						that.getModel("CompSN").remove(sUrl, mParameter);
					}
				}
				if (postItem.length > 0) {
					for (var i = 0; i < postItem.length; i++) {
						postDate = {
							Component: postItem[i].Material, //组件料号
							SerialNumber: postItem[i].SerialNumber, //组件序列号
							ProductionOrderID: Head.ManufacturingOrder, //生产订单号
							SAP_Description: postItem[i].ProductName, //组件描述
							FERTSerialNumber: SNum, //成品序列号
							Remark: postItem[i].Remark,
							Plant: postItem[i].Plant,
							CreateDate: new Date()
						};
						that.getModel("CompSN").create("/YY1_ROHMATSNRECORD", postDate, mParameter);
					}

				}
			},
			//查询组件是否启用序列号管理
			onSearchSNProfile: function (Arry) {
				this.setBusy(true);
				this._ODataModel = this.getModel("CompSNProfile");
				var sUrl = "/YY1_ComponentSNProfile";
				for (var i = 0; i < Arry.length; i++) {
					var oFilter1 = new sap.ui.model.Filter("Product", sap.ui.model.FilterOperator.EQ, Arry[i].Material);
					var oFilter2 = new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, Arry[i].Plant);
					var aFilters = [oFilter1, oFilter2];
					var that = this;
					var Arry1 = Arry[i];
					(function (that, sUrl, aFilters, Arry1, Arry) {
						var mParameters = {
							filters: aFilters,
							success: function (oData, response) {
								if (response.statusCode === "200") {
									var DataList = !oData ? [] : oData.results;
									var CompList = that._JSONModel.getData().CompList;
									if (DataList[0].ABCIndicator !== "A") { /*ABCIndicator !=="A"  SerialNumberProfile === ""*/
										for (var n = 0; n < CompList.length; n++) {
											if (DataList[0].Product === CompList[n].Material & DataList[0].Plant === CompList[n].Plant) {
												CompList.splice(n, 1);
											}
										}
									}
									for (var k = 0; k < CompList.length; k++) {
										CompList[k].ItemNum = k * 10 + 10;
										CompList[k].SerialNumber = "";
										CompList[k].Remark = "0";
									}
									that._JSONModel.setProperty("/CompList2", CompList);
									var MaterialList = JSON.stringify(CompList);
									this._JSONModel.setProperty("/MaterialList", JSON.parse(MaterialList));
								}
								that.setBusy(false);
							}.bind(that),
							error: function (oError) {
								that.setBusy(false);
							}.bind(that)
						};
						that._ODataModel.read(sUrl, mParameters);
					})(that, sUrl, aFilters, Arry1, Arry);
				}
			},
			SNChange: function () {
				this.setBusy(true);
				var Head = this._JSONModel.getData().Head;
				var SNum = this.byId("SNumber").getValue(); //成品序列號
				var CompList2 = this._JSONModel.getData().CompList2;
				var MaterialList = this._JSONModel.getData().MaterialList;
				var MaterialList1 = JSON.stringify(MaterialList);
				var MaterialList2 = JSON.parse(MaterialList1);
				// this._JSONModel.setProperty("/oldItemData", JSON.parse(itemData));
				// var SNScanData = this._JSONModel.getData().SNScanData;
				// var ScanData = [];
				// var CompData = [];
				// if (SNScanData.length === 0) {
				// 	for (var i = 0; i < CompList2.length; i++) {
				// 		ScanData[i] = {
				// 			ItemNum: CompList2[i].ItemNum, //组件料号
				// 			Component: CompList2[i].Material, //组件料号
				// 			SerialNumber: CompList2[i].SerialNumber, //组件序列号
				// 			ProductionOrderID: Head.ManufacturingOrder, //生产订单号
				// 			FERTMaterial: Head.Product, //成品物料号
				// 			FERTSerialNumber: SNum, //成品序列号
				// 			Plant: CompList2[i].Plant, //工厂
				// 			Remark: CompList2[i].Remark //备注
				// 		};

				// 	}
				// 	this._JSONModel.setProperty("/SNScanData", ScanData);
				// } else {
				// 	for (var i = 0; i < SNScanData.length; i++) {
				// 		// if (SNum === SNScanData[i].FERTSerialNumber) {
				// 		// 	SNScanData[i].Material = SNScanData[i].Component;
				// 		// 	CompData.push(SNScanData[i]);
				// 		// } else {
				// 		// 	var FlagAdd = "X";
				// 		// }
				// 		if (SNum === SNScanData[i].FERTSerialNumber) {
				// 			var FlagAdd = "X";
				// 			break;
				// 		}
				// 	}
				// 	if (FlagAdd !== "X") {
				// 		for (var i = 0; i < CompList2.length; i++) {
				// 			ScanData[i] = {
				// 				ItemNum: CompList2[i].ItemNum, //组件料号
				// 				Component: CompList2[i].Material, //组件料号
				// 				SerialNumber: CompList2[i].SerialNumber, //组件序列号
				// 				ProductionOrderID: Head.ManufacturingOrder, //生产订单号
				// 				FERTMaterial: Head.Product, //成品物料号
				// 				FERTSerialNumber: SNum, //成品序列号
				// 				Plant: CompList2[i].Plant, //工厂
				// 				Remark: CompList2[i].Remark //备注
				// 			};
				// 			SNScanData.push(ScanData[i]);
				// 		}
				// 	}
				// }
				var MaterialFilters = [];
				var sFilter = [];
				for (var k = CompList2.length - 1; k >= 0; k--) {
					if (CompList2[k].Material === "" & CompList2[k].SerialNumber === "") {
						CompList2.splice(k, 1);
					} else {
						CompList2[k].SerialNumber = "";
						// CompList2[k].ProductName = "";
						CompList2[k].FERTSerialNumber = SNum;
						CompList2[k].FERTMaterial = Head.Product; //成品物料号;
						CompList2[k].Remark = "0";

						if (CompList2[k].Material !== "") {
							MaterialFilters.push(new Filter({
								path: "Component",
								operator: FilterOperator.EQ,
								value1: CompList2[k].Material
							}));
						}
					}
				}

				if (MaterialFilters.length > 0) {
					sFilter.push(new Filter({
						filters: MaterialFilters,
						and: false
					}));
				}
				for (var i = 0; i < MaterialList2.length; i++) {
					MaterialList2[i].SerialNumber = "";
					// CompList2[k].ProductName = "";
					MaterialList2[i].FERTSerialNumber = SNum;
					MaterialList2[i].FERTMaterial = Head.Product; //成品物料号;
					MaterialList2[i].Remark = "0";
				}
				this._JSONModel.setProperty("/CompList2", MaterialList2);
				// if (CompData.length === 0) {
				// 	this._JSONModel.setProperty("/CompList2", CompList2);
				// } else {
				// 	this._JSONModel.setProperty("/CompList2", CompData);
				// }
				this.getOlditem(sFilter);
				this.getHead(Head.ManufacturingOrder); //查询已保存的头表
				this.getItem(Head, SNum);
				// this.setBusy(false);
			},
			onLess: function (oEvent) {
				var CompList2 = this._JSONModel.getData().CompList2; //
				var ItemTable = this.getView().byId("ItemTable");
				var Deldata = this._JSONModel.getData().Deldata;
				// var context = oEvent.getSource().getBindingContext().sPath;
				// var contexts = context.split("/");
				// var n = contexts[3];
				var aSelectedIndices = [];
				var context = ItemTable.getSelectedContexts();
				if (context.length <= 0) {
					sap.m.MessageBox.warning("請至少選擇壹行", {
						title: "提示"
					});
					this.setBusy(false);
					return;
				}
				if (context.length !== 0) {
					for (var i = 0; i < context.length; i++) {
						var linetext = context[i].sPath.split("/");
						var line = linetext[2];
						aSelectedIndices[i] = {
							Line: line
						};
					}
				}
				for (var y = aSelectedIndices.length - 1; y >= 0; y--) {
					if (CompList2[aSelectedIndices[y].Line].SAP_UUID !== undefined) {
						Deldata.push(CompList2[aSelectedIndices[y].Line]);
					}
					CompList2.splice(aSelectedIndices[y].Line, 1);
				}

				var num = 10;
				for (var m = 0; m < CompList2.length; m++) {
					CompList2[m].ItemNum = num;
					num = num + 10;
				}
				this._JSONModel.setProperty("/CompList2", CompList2);
				ItemTable.removeSelections(true);
				// item1.splice(n, 1);

				this._JSONModel.setProperty("/CompList2", CompList2);
			},
			onAdd: function () {
				var CompList2 = this._JSONModel.getData().CompList2; // Table 数据
				var SNScanData = this._JSONModel.getData().SNScanData;
				var Head = this._JSONModel.getData().Head; // Table 数据
				var item = [];
				if (CompList2 === undefined) {
					CompList2 = [];
					item[0] = {
						ItemNum: 10,
						AddItem: "X",
						Material: "",
						SerialNumber: "",
						FERTMaterial: Head.FERTMaterial,
						FERTSerialNumber: Head.FERTSerialNumber,
						Plant: Head.ProductionPlant,
						Remark: "0"
					};
				} else {
					var NUM = CompList2.length;
					item[0] = {
						ItemNum: CompList2[NUM - 1].ItemNum + 10,
						AddItem: "X",
						Material: "",
						SerialNumber: "",
						FERTMaterial: Head.FERTMaterial,
						FERTSerialNumber: Head.FERTSerialNumber,
						Plant: Head.ProductionPlant,
						Remark: "0"
					};
				}
				CompList2.push(item[0]);
				SNScanData.push(item[0]);
				this._JSONModel.setProperty("/SNScanData", SNScanData);
				this._JSONModel.setProperty("/CompList2", CompList2);
			},
			ChangeDate: function (Date) {
				var contexts = Date.split(".");
				var Date1 = contexts[0];
				return (Date1);
			},
			handleSubmit: function () {
				var that = this;
				this.CheckData();
				// var oRequest = {
				// 	PostingDate: "2019-10-11T00:00:00",
				// 	GoodsMovementCode: "02",
				// 	to_MaterialDocumentItem: [{
				// 		Plant: "6310",
				// 		StorageLocation: "631A",
				// 		Material: "FG126",
				// 		GoodsMovementType: "101",
				// 		GoodsMovementRefDocType: "F",
				// 		Batch: "",
				// 		ManufacturingOrder: "1000097",
				// 		ManufacturingOrderItem: "1",
				// 		QuantityInEntryUnit: "10",
				// 		EntryUnit: "EA"
				// 	}]
				// };
				// var mParameters = {
				// 	success: function (oData, response) {
				// 		if (response.statusCode === "201") {
				// 			MessageToast.show("创建成功！");
				// 			return;
				// 			// var DataList = !oData ? [] : oData.results;
				// 			// var Arry = !oData ? [] : oData.results[0];
				// 			// this._JSONModel.setProperty("/Head", Arry);
				// 			// this._JSONModel.setProperty("/SNumberList", DataList);
				// 			// if (Arry.ManufacturingOrder !== "") {
				// 			// 	this.onSearchComp(Arry.ManufacturingOrder);
				// 			// }
				// 		}
				// 	}.bind(this),
				// 	error: function (oError) {
				// 		this.setBusy(false);
				// 	}.bind(this)
				// };
				// this._ODataModel.create(sUrl, oRequest, mParameters);

				// var Header =
				//  "<soap:Envelope xmlns:soap=\"http://www.w3.org/2003/05/soap-envelope\" xmlns:sfin=\"http://sap.com/xi/SAPSCORE/SFIN\" xmlns:yy1=\"http://SAPCustomFields.com/YY1_\">" +
				//  "<soap:Header xmlns:wsa=\"http://www.w3.org/2005/08/addressing\"><wsa:MessageID>" + "uuid:" + that.getuuid() +
				//  "</wsa:MessageID></soap:Header><soap:Body><sfin:JournalEntryBulkCreateRequest>";

			},
			getuuid: function (len, radix) {
				var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
				var uuid = [],
					i;
				radix = radix || chars.length;

				if (len) {
					// Compact form
					for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
				} else {
					// rfc4122, version 4 form
					var r;

					// rfc4122 requires these characters
					uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
					uuid[14] = '4';

					// Fill in random data.  At i==19 set the high bits of clock sequence as
					// per rfc4122, sec. 4.1.5
					for (i = 0; i < 36; i++) {
						if (!uuid[i]) {
							r = 0 | Math.random() * 16;
							uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
						}
					}
				}

				return uuid.join('');
			},
			CheckData: function () {
				this._ODataModel = this.getModel("CheckQuantity");
				var Head = this._JSONModel.getData().Head;
				var sUrl = "/YY1_CHECKQUANTITY";
				var oFilter1 = new sap.ui.model.Filter("ManufacturingOrder", sap.ui.model.FilterOperator.EQ, Head.ManufacturingOrder);
				var aFilters = [oFilter1];
				var mParameters = {
					filters: aFilters,
					success: function (oData, response) {
						if (response.statusCode === "200") {
							var Quantity = !oData ? [] : oData.results;
							if (Quantity.length > 0) {
								for (var i = 0; i < Quantity.length; i++) {
									if (Quantity[i].ResvnItmRequiredQtyInBaseUn !== Quantity[i].ResvnItmWithdrawnQtyInBaseU) {
										MessageToast.show("生產訂單的需求數量不等於發料數量，請檢查發料信息！");
										return;
									}

								}
							}
							this.handlePost();
						}
					}.bind(this),
					error: function (oError) {
						this.setBusy(false);
					}.bind(this)
				};
				this._ODataModel.read(sUrl, mParameters);
			},
			getItem: function (head, num) {
				// this._ODataModel = this.getModel("CompSN");
				// var sUrl = "/YY1_ROHMATSNRECORD";

				var CompList2 = this._JSONModel.getData().CompList2; //新行数据
				// var MATERIALFilters = [];
				// for (var a = 0; a < CompList2.length; a++) {
				// 	MATERIALFilters.push(new Filter({
				// 		path: "Component",
				// 		operator: FilterOperator.EQ,
				// 		value1: CompList2[a].Material
				// 	}));
				// }
				var filtersLast = [
					new Filter({
						path: "Plant",
						operator: FilterOperator.EQ,
						value1: CompList2[0].Plant
					}),
					new Filter({
						path: "FERTSerialNumber",
						operator: FilterOperator.EQ,
						value1: num
					}),
					new Filter({
						path: "ProductionOrderID",
						operator: FilterOperator.EQ,
						value1: head.ManufacturingOrder
					})
				];
				// if (MATERIALFilters.length > 0) {
				// 	filtersLast.push(new Filter({
				// 		filters: MATERIALFilters,
				// 		and: false
				// 	}));
				// }
				var mParameters = {
					filters: filtersLast,
					success: function (oData, response) {
						if (response.statusCode === "200") {
							var Arry = !oData ? [] : oData.results;
							var itemData = JSON.stringify(Arry);
							this._JSONModel.setProperty("/oldItemData", JSON.parse(itemData));
							// var CompList2 = this._JSONModel.getData().CompList2;
							for (var i = 0; i < CompList2.length; i++) {
								if (Arry.length > 0) {
									for (var m = Arry.length - 1; m >= 0; m--) {
										if (CompList2[i].ProductionOrderID === Arry[m].ProductionOrderID & CompList2[i].FERTSerialNumber === Arry[m].FERTSerialNumber &
											CompList2[i].Plant === Arry[m].Plant & CompList2[i].Material === Arry[m].Component) {
											CompList2[i].SerialNumber = Arry[m].SerialNumber;
											// CompList2[i].ProductName = Arry[m].SAP_Description;
											CompList2[i].Remark = Arry[m].Remark;
											CompList2[i].SAP_UUID = Arry[m].SAP_UUID;
											CompList2[i].edit1 = false;
											Arry.splice(m, 1);
											break;
										}
									}
								} else {
									CompList2[i].edit1 = true;
								}
							}
							var numItem = CompList2.length * 10 + 10;
							if (Arry.length > 0) {
								for (var m = 0; m < Arry.length; m++) {
									if (Arry[m].SerialNumber !== "") {
										Arry[m].Material = Arry[m].Component;
										Arry[m].ProductName = Arry[m].SAP_Description;
										Arry[m].ManufacturingOrder = Arry[m].ProductionOrderID;
										Arry[m].ItemNum = numItem;
										Arry[m].edit1 = false;
										CompList2.push(Arry[m]);
										numItem = numItem + 10;
									}
								}
							}

							var SNScanData = this._JSONModel.getData().SNScanData;
							var ScanData = [];
							var CompData = [];
							if (SNScanData.length === 0) {
								for (var i = 0; i < CompList2.length; i++) {
									ScanData[i] = {
										ItemNum: CompList2[i].ItemNum, //组件料号
										Component: CompList2[i].Material, //组件料号
										SerialNumber: CompList2[i].SerialNumber, //组件序列号 
										ProductionOrderID: head.ManufacturingOrder, //生产订单号
										FERTMaterial: head.Product, //成品物料号
										FERTSerialNumber: num, //成品序列号
										Plant: CompList2[i].Plant, //工厂
										Remark: CompList2[i].Remark //备注
									};
								}
								this._JSONModel.setProperty("/SNScanData", ScanData);
							} else {
								for (var i = 0; i < SNScanData.length; i++) {
									// if (SNum === SNScanData[i].FERTSerialNumber) {
									// 	SNScanData[i].Material = SNScanData[i].Component;
									// 	CompData.push(SNScanData[i]);
									// } else {
									// 	var FlagAdd = "X";
									// }
									if (num === SNScanData[i].FERTSerialNumber) {
										var FlagAdd = "X";
										break;
									}
								}
								if (FlagAdd !== "X") {
									for (var i = 0; i < CompList2.length; i++) {
										ScanData[i] = {
											ItemNum: CompList2[i].ItemNum, //组件料号
											Component: CompList2[i].Material, //组件料号
											SerialNumber: CompList2[i].SerialNumber, //组件序列号
											ProductionOrderID: head.ManufacturingOrder, //生产订单号
											FERTMaterial: head.Product, //成品物料号
											FERTSerialNumber: num, //成品序列号
											Plant: CompList2[i].Plant, //工厂
											Remark: CompList2[i].Remark //备注
										};
										SNScanData.push(ScanData[i]);
									}
								}
							}
							this._JSONModel.setProperty("/CompList2", CompList2);
						}
						this.setBusy(false);
					}.bind(this),
					error: function (oError) {
						this.setBusy(false);
					}.bind(this)
				};
				this.getModel("CompSN").read("/YY1_ROHMATSNRECORD", mParameters);

				// var oFilter1 = new sap.ui.model.Filter("ProductionOrderID", sap.ui.model.FilterOperator.EQ, head.ManufacturingOrder);
				// var oFilter2 = new sap.ui.model.Filter("FERTSerialNumber", sap.ui.model.FilterOperator.EQ, num);
				// var aFilters = [oFilter1, oFilter2];
				// var mParameters = {
				// 	filters: aFilters,
				// 	success: function (oData, response) {
				// 		if (response.statusCode === "200") {
				// 			var Arry = !oData ? [] : oData.results;
				// 			var itemData = JSON.stringify(Arry);
				// 			this._JSONModel.setProperty("/oldItemData", JSON.parse(itemData));
				// 			var CompList2 = this._JSONModel.getData().CompList2;
				// 			for (var i = 0; i < CompList2.length; i++) {
				// 				for (var m = 0; m < Arry.length; m++) {
				// 					if (CompList2[i].ProductionOrderID === Arry[m].ProductionOrderID & CompList2[i].Material === Arry[m].Component & CompList2[
				// 							i].SerialNumber === "") {
				// 						CompList2[i].SerialNumber = Arry[m].SerialNumber;
				// 						CompList2[i].ProductName = Arry[m].SAP_Description;
				// 						CompList2[i].Remark = Arry[m].Remark;
				// 						CompList2[i].SAP_UUID = Arry[m].SAP_UUID;
				// 						Arry.splice(m, 1);
				// 						break;
				// 					}

				// 				}
				// 			}
				// 			this._JSONModel.setProperty("/CompList2", CompList2);
				// 		}
				// 		this.setBusy(false);
				// 	}.bind(this),
				// 	error: function (oError) {
				// 		this.setBusy(false);
				// 	}.bind(this)
				// };
			},
			//用于区分是新建||更新||删除
			UpdateORPost: function (that) {
				var head = that._JSONModel.getData().oldHeadData; //已保存的头数据
				// var item = that._JSONModel.getData().oldItemData; //已保存的行数据
				var item = this._JSONModel.getData().Historydata;
				var HEADLOG = that._JSONModel.getData().HEADLOG; //新头数据
				var CompList2 = that._JSONModel.getData().CompList2; //新行数据
				//筛选系列号不为空的行
				var item1 = [];
				for (var m = 0; m < CompList2.length; m++) {
					if (CompList2[m].SerialNumber !== "") {
						item1.push(CompList2[m]);
					}
				}
				var HEADLOGCopy = JSON.stringify(HEADLOG);
				HEADLOGCopy = JSON.parse(HEADLOGCopy);
				var CompList2Copy = JSON.stringify(item1);
				CompList2Copy = JSON.parse(CompList2Copy);
				var updateHead = [];
				// var postHead = [];
				var updateItem = [];
				// var postItem = [];
				//检验主键是否重复
				var Historydata = that._JSONModel.getData().Historydata; //新行数据
				// if (Historydata.length > 0) {
				// 	for (var i = 0; i < Historydata.length; i++) {
				// 		for (var m = 0; m < CompList2.length; m++) {
				// 			if (Historydata[i].Plant === CompList2[m].Plant & Historydata[i].Component === CompList2[m].Material & Historydata[i].SerialNumber ===
				// 				CompList2[m].SerialNumber & CompList2[m].Remark === "0") {
				// 				MessageToast.show("序號" + CompList2[m].SerialNumber + "已在之前的組件" + CompList2[m].Material + "關系中存在！");
				// 				that.setBusy(false);
				// 				return;
				// 			}
				// 		}
				// 	}
				// }
				//抬头数据
				for (var i = 0; i < head.length; i++) {
					for (var m = 0; m < HEADLOGCopy.length; m++) {
						if (head[i].ProductionOrderID === HEADLOGCopy[m].ManufacturingOrder & head[i].SerialNumber === HEADLOGCopy[m].SerialNumber &
							head[i].FERTMaterial === HEADLOGCopy[m].Product) {
							updateHead.push(HEADLOGCopy[m]);
							var n = updateHead.length;
							updateHead[n - 1].SAP_UUID = head[i].SAP_UUID;
							HEADLOGCopy.splice(m, 1);
							break;
						}
					}
				}
				that._JSONModel.setProperty("/updateHead", updateHead);
				that._JSONModel.setProperty("/postHead", HEADLOGCopy);

				//行项目数据
				for (var i = 0; i < item.length; i++) {
					for (var m = 0; m < CompList2Copy.length; m++) {
						if (item[i].Plant === CompList2Copy[m].Plant & item[i].Component === CompList2Copy[m].Material & item[i].SerialNumber ===
							CompList2Copy[m].SerialNumber) {
							updateItem.push(CompList2Copy[m]);
							var n = updateItem.length;
							updateItem[n - 1].SAP_UUID = item[i].SAP_UUID;
							updateItem[n - 1].CreateDate = item[i].CreateDate;
							updateItem[n - 1].ChangeDate = new Date();
							CompList2Copy.splice(m, 1);
							break;
						} else {
							CompList2Copy[m].SAP_UUID = "";
						}

					}
				}
				that._JSONModel.setProperty("/updateItem", updateItem);
				that._JSONModel.setProperty("/postItem", CompList2Copy);
			},
			handlePost: function () {
				var Head = this._JSONModel.getData().Head; //抬头数据
				var SNumberList = this._JSONModel.getData().SNumberList; //序列号
				var today = new Date();
				var year = today.getFullYear();
				var month = today.getMonth() + 1;
				var strDate = today.getDate();
				if (month >= 1 && month <= 9) {
					month = "0" + month;
				}
				if (strDate >= 0 && strDate <= 9) {
					strDate = "0" + strDate;
				}
				var SNdata = "";
				for (var i = 0; i < SNumberList.length; i++) {
					SNdata = SNdata + '<SerialNumbers>' + SNumberList[i].SerialNumber + '</SerialNumbers>';
				}
				today = year.toString() + '-' + month.toString() + '-' + strDate.toString();
				var that = this;
				var request =
					'<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:glob="http://sap.com/xi/APPL/Global2">' +
					'<soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">' +
					"<wsa:MessageID>" + "uuid:" + that.getuuid() + "</wsa:MessageID>" +
					'</soap:Header>' +
					'<soap:Body>' +
					'<glob:MaterialDocumentCreateRequest_Async>' +
					'<MessageHeader>' +
					'<CreationDateTime>2019-11-14T00:08:09Z</CreationDateTime>' +
					'<SenderBusinessSystemID>SCP</SenderBusinessSystemID>' +
					'</MessageHeader>' +
					'<MaterialDocument>' +
					'<GoodsMovementCode>2</GoodsMovementCode>' +
					'<PostingDate>' + today + '</PostingDate>' +
					'<DocumentDate>' + today + '</DocumentDate>' +
					'<MaterialDocumentItem>' +
					'<GoodsMovementType>101</GoodsMovementType>' +
					'<MaterialDocumentLine>1</MaterialDocumentLine>' +
					'<ParentMaterialDocumentLine>0</ParentMaterialDocumentLine>' +
					'<Material>' + Head.Product + '</Material>' +
					'<Plant>' + Head.ProductionPlant + '</Plant>' +
					'<QuantityInEntryUnit unitCode="PCE">' + Head.MfgOrderPlannedTotalQty + '</QuantityInEntryUnit>' +
					'<ManufacturingOrder>' + Head.ManufacturingOrder + '</ManufacturingOrder>' +
					'<ManufacturingOrderItem>' + Head.ManufacturingOrderItem + '</ManufacturingOrderItem>' +
					'<GoodsMovementRefDocType>F</GoodsMovementRefDocType>' +
					// '<SerialNumbers>10001757</SerialNumbers>' +
					// '<SerialNumbers>10001758</SerialNumbers>' +
					SNdata +
					'</MaterialDocumentItem>' +
					'</MaterialDocument>' +
					'</glob:MaterialDocumentCreateRequest_Async>' +
					'</soap:Body>' +
					'</soap:Envelope>';
				var response = "";
				var that = this;
				$.ajax({
					url: "/destinations/WT_S4HC_SOAP/sap/bc/srt/scs_ext/sap/materialdocumentcreaterequest1?sap-client=100",
					type: "POST",
					data: request,
					// username: "SCP_INBOUND",
					// password: "P@ssw0rd123456789012",
					dataType: "xml",
					contentType: "application/soap+xml;charset=\"utf-8\"",
					success: function (data, textStatus, jqXHR) {
						response = data;
					},
					error: function (xhr, status) {
						// console.log("ERROR");
					},
					complete: function (xhr, status) {
						// console.log("COMPLETE");
					}

				});
			},
			getMaterialName: function (CompList, material) {
				this.setBusy(true);
				var sLanguage = this._JSONModel.getData().LogInLangu;
				var oFilter1 = new sap.ui.model.Filter("Language", sap.ui.model.FilterOperator.EQ, sLanguage);
				var oFilter2 = new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.EQ, material);
				var aFilters = [oFilter1, oFilter2];
				var mParameter = {
					filters: aFilters,
					success: function (oData) {
						CompList.ProductName = oData.results[0].ProductName;
						this.setBusy(false);
					}.bind(this),
					error: function (oError) {
						this.setBusy(false);
					}.bind(this)
				};
				this.getModel("SNComp").read("/YY1_SNCOMP", mParameter);
			},
			updateDelflag: function (that) {
				var CompList2 = that._JSONModel.getData().CompList2; //新行数据
				var Head = this._JSONModel.getData().Head; // Table 数据
				var MATERIALFilters = [];
				var SERIALNUMBERFilters = [];
				for (var a = 0; a < CompList2.length; a++) {
					if (CompList2[a].SerialNumber !== "") {
						MATERIALFilters.push(new Filter({
							path: "MATERIAL",
							operator: FilterOperator.EQ,
							value1: CompList2[a].Material
						}));
						SERIALNUMBERFilters.push(new Filter({
							path: "SERIALNUMBER",
							operator: FilterOperator.EQ,
							value1: CompList2[a].SerialNumber
						}));
					}
				}
				var LastFilter = [new Filter({
					path: "PLANT",
					operator: FilterOperator.EQ,
					value1: Head.ProductionPlant
				})];
				if (MATERIALFilters.length > 0) {
					LastFilter.push(new Filter({
						filters: MATERIALFilters,
						and: false
					}));
				}
				if (SERIALNUMBERFilters.length > 0) {
					LastFilter.push(new Filter({
						filters: SERIALNUMBERFilters,
						and: false
					}));
				}
				var mParameters = {
					filters: LastFilter,
					success: function (oData) {
						var Arry = !oData ? [] : oData.results;
						if (Arry.length > 0) {
							that.handleUpdate(Arry);
						}
					},
				};
				that.getModel("MATERIALSN").read("/MATERIALSN", mParameters);

				// var updateFlag = [];
				// var mParameter = {
				// 	success: function (oData) {
				// 		// MessageToast.show("保存成功！");
				// 		that.setBusy(false);
				// 		// return;
				// 	},
				// 	error: function (oError) {
				// 		var oError = oError;
				// 		that.setBusy(false);
				// 	}
				// };
				// for (var i = 0; i < CompList2.length; i++) {
				// 	if (CompList2[i].SerialNumber !== "") {
				// 		updateFlag = {
				// 			PLANT: Head.ProductionPlant,
				// 			MATERIAL: CompList2[i].Material,
				// 			SERIALNUMBER: CompList2[i].SerialNumber,
				// 			DELFLAG: "X",
				// 			PODOCUMENT: ""
				// 		};
				// 		var sUrl = "/MATERIALSN(PLANT='" + updateFlag.PLANT + "',MATERIAL='" + updateFlag.MATERIAL + "',SERIALNUMBER='" + updateFlag
				// 			.SERIALNUMBER + "')";
				// 		that.getModel("MATERIALSN").update(sUrl, updateFlag, mParameter);
				// 	}
				// }
			},
			handleUpdate: function (Arry) {
				var updateData = [];
				var Head = this._JSONModel.getData().Head; // Table 数据
				var CompList2 = this._JSONModel.getData().CompList2; // Table 数据
				var mParameter = {
					success: function (oData) {
						// MessageToast.show("保存成功！");
						// this.setBusy(false);
						// return;
					},
					error: function (oError) {
						var oError = oError;
						// this.setBusy(false);
					}
				};
				for (var i = 0; i < Arry.length; i++) {
					for (var n = 0; n < CompList2.length; n++) {
						if (Arry[i].PLANT === CompList2[n].Plant && Arry[i].MATERIAL === CompList2[n].Material && Arry[i].SERIALNUMBER === CompList2[n].SerialNumber &&
							(CompList2[n].Remark !== "0" || CompList2[n].Remark !== "3")) {
							Arry[i].DELFLAG = "";
						}
						if (Arry[i].PLANT === CompList2[n].Plant && Arry[i].MATERIAL === CompList2[n].Material && Arry[i].SERIALNUMBER === CompList2[n].SerialNumber &&
							(CompList2[n].Remark === "0" || CompList2[n].Remark === "3")) {
							Arry[i].DELFLAG = "X";
						}
					}
				}
				for (var i = 0; i < Arry.length; i++) {
					updateData = {
						PLANT: Arry[i].PLANT,
						MATERIAL: Arry[i].MATERIAL,
						SERIALNUMBER: Arry[i].SERIALNUMBER,
						DELFLAG: Arry[i].DELFLAG,
						PODOCUMENT: Arry[i].PODOCUMENT,
						DOCUMENT1: Arry[i].DOCUMENT1,
						DOCUMENT2: Arry[i].DOCUMENT2,
						DOCUMENT3: Arry[i].DOCUMENT3,
						CREATEDATE: Arry[i].CREATEDATE,
						CREATEDBY: Arry[i].CREATEDBY,
						CHANGEDBY: Arry[i].CHANGEDBY,
						CHANGEDATE: Arry[i].CHANGEDATE
					};
					var sUrl = "/MATERIALSN(PLANT='" + Arry[i].PLANT + "',MATERIAL='" + Arry[i].MATERIAL + "',SERIALNUMBER='" + Arry[i]
						.SERIALNUMBER + "')";
					this.getModel("MATERIALSN").update(sUrl, updateData, mParameter);
				}
			},
			handleChange: function (oEvent) {
				var CompList2 = this._JSONModel.getData().CompList2; // Table 数据
				var context = oEvent.getSource().getBindingContext().sPath;
				var contexts = context.split("/");
				var n = contexts[2];
				this._JSONModel.setProperty("/nowTableNum", n);
				var Filters = [new Filter({
						path: "PLANT",
						operator: FilterOperator.EQ,
						value1: CompList2[n].ProductionPlant
					}),
					new Filter({
						path: "MATERIAL",
						operator: FilterOperator.EQ,
						value1: CompList2[n].Material
					}),
					new Filter({
						path: "SERIALNUMBER",
						operator: FilterOperator.EQ,
						value1: CompList2[n].SerialNumber
					})
				];
				var mParameters = {
					filters: Filters,
					success: function (oData) {
						var Arry = !oData ? [] : oData.results;
						if (Arry.length === 0) {
							MessageToast.show("物料號" + CompList2[n].Material + "的序號" + CompList2[n].SerialNumber + "不存在！");
							CompList2[n].SerialNumber = "";
							this._JSONModel.setProperty("/CompList2", CompList2);
							return;
						}
					}.bind(this),
					error: function (oError) {
						// this.setBusy(false);
					}.bind(this)
				};
				this.getModel("MATERIALSN").read("/MATERIALSN", mParameters);
			}
		});
	});