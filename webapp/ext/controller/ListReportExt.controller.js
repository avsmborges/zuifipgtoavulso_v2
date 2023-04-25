sap.ui.define([
    "sap/ui/core/Fragment",
    "dellavolpe/com/br/zuifipgtoavulso/model/ErrorHandler",
    "sap/m/MessageToast"
], function (Fragment, ErrorHandler, MessageToast) {
    'use strict';

    return {

        onInit: function (oEvt) {
            this._oView = this.getView();
            this._oOwnerComponent = this.getOwnerComponent();
            this._oModel = this._oOwnerComponent.getModel();

            var oURLService = sap.ushell.Container.getService('URLParsing');
            var sShellHash = oURLService.getShellHash(document.URL);
            if (oURLService.parseShellHash(sShellHash).params.param) {
                this._sParam = oURLService.parseShellHash(sShellHash).params.param[0];
            }


            var oCreateModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZGW_FI_VF_PAGAMENTO/");
            oCreateModel.metadataLoaded().then(function () {
                this._oView.setModel(oCreateModel, "meioPagamentoModel");
                this._oErrorHandler = new ErrorHandler(this._oView, ["meioPagamentoModel"]);
            }.bind(this));



            Fragment.load({
                name: "dellavolpe.com.br.zuifipgtoavulso.fragment.MeioPagamento"
            }).then(function (oDialog) {
                this._oDialog = oDialog;
                this._oDialog.attachAfterClose(function () {
                    if (this._oModel.hasPendingChanges()) {
                        this._oModel.resetChanges();
                    }
                }.bind(this));
                sap.ui.getCore().byId("addBtn").attachPress(function (oEvt) { this.onAddRow(oEvt) }.bind(this));
                sap.ui.getCore().byId("delBtn").attachPress(function (oEvt) { this.onDelete(oEvt) }.bind(this));
                sap.ui.getCore().byId("btnSave").attachPress(function (oEvt) { this.onSave(oEvt) }.bind(this));
                sap.ui.getCore().byId("btnCancel").attachPress(function (oEvt) { this.onCancel(oEvt) }.bind(this));

                this._oTable = sap.ui.getCore().byId("LineItemsSmartTable").getTable();
                this._oTable.getParent().attachInitialise(function () { this.onInitialiseTable(this._oTable) }.bind(this));

                sap.ui.getCore().byId("meio_pagto").attachInnerControlsCreated(function (oEvt) {
                    if (oEvt.getParameters().length > 0 && oEvt.getParameters()[0].attachSelectionChange) {
                        oEvt.getParameters()[0].attachSelectionChange(function (oEvt) {
                            if (oEvt.getParameter("selectedItem")) {
                                var sKey = oEvt.getParameter("selectedItem").getProperty("key");
                                var oViewModel = new sap.ui.model.json.JSONModel();
                                oViewModel.setData({ tableVisible: sKey === "2" });
                                this._oDialog.setModel(oViewModel, "oViewModel");
                            }

                        }.bind(this));
                    }
                }.bind(this));

            }.bind(this));
        },

        onCancel: function () {
            this._oDialog.close();
        },

        onAddRow: function () {
            var oData = this._oModelMNA.getData();
            oData.push({ NrCheque: "", Bupla: this._sParam, IdLanc: "1" });
            this._oModelMNA.setData(oData);
            this._oView.setModel(this._oModelMNA, "oModelMNA");
        },
        onDelete: function (a) {
            var aSelectedItems = this._oTable.getSelectedIndices();
            for (var c = aSelectedItems.length - 1; c >= 0; c--) {
                var aData = this._oModelMNA.getData();
                aData.splice(aSelectedItems[c], 1);
                this._oModelMNA.setData(aData);
                this._oView.setModel(this._oModelMNA, "oModelMNA");
            }
            this._oTable.clearSelection();
        },
        onExit: function () {
            this._oDialog.destroy();
        },


        _clearErrors: function () {
            this._oTable.getRows().forEach(function (oRow) {
                oRow.mAggregations.cells.forEach(function (oCell) {
                    oCell.getEdit().setValueState(sap.ui.core.ValueState.None);
                }.bind(this));
            }.bind(this));
        },

        onSave: function () {
            this._clearErrors();

            this._oView.setBusy(true);
            this._oDialog.setBusy(true);

            var oCreateModel = this.getView().getModel("meioPagamentoModel");
            for (var c = 0; c < this._oModelMNA.getData().length; c++) {
                this._oModelMNA.getData()[c].Bupla = this._sParam;
                this._oModelMNA.getData()[c].Fornecedor = this._oModel.getProperty(this._sItemPath + "/Lifnr"),

                    delete this._oModelMNA.getData()[c].__metadata;
            }
            var oSave = {
                Ebeln: this._oModel.getProperty(this._sItemPath + "/Ebeln"),
                MeioPagto: this._oModel.getProperty(this._sItemPath + "/MeioPagto"),
                IdLanc: "1",
                to_Cheques: this._oModelMNA.getData()
            };

            oCreateModel.create("/PagamentosStatus", oSave, {
                success: function (oParam, oRet) {
                    this._oView.setBusy(false);
                    this._oDialog.setBusy(false);
                    var oMessageContent = $.parseJSON(oRet.headers["sap-message"]);
                    if (oMessageContent.severity === "error") {
                        sap.m.MessageBox.show(
                            oMessageContent.message, {
                            icon: sap.m.MessageBox.Icon.ERROR,
                            title: "Erro"
                        });
                        oMessageContent.details.forEach(function (oMessage) {
                            var aMessage = oMessage.message.split("|");
                            var oRow = this._oTable.getRows()[aMessage[1]];
                            oRow.mAggregations.cells.forEach(function (oCell) {
                                if (oCell.getCustomData()[0].mProperties.value === "oModelMNA>" + aMessage[0]) {

                                    var oEdit = oCell.getEdit();
                                    oEdit.setValueState(sap.ui.core.ValueState.Error);
                                    if (aMessage.length > 2) {
                                        oEdit.setValueStateText(aMessage[2]);
                                    }
                                }

                            }.bind(this));
                        }.bind(this));
                    } else {
                        this._oModel.refresh(true);
                        this._oDialog.close();
                        MessageToast.show(oMessageContent.message);

                    }

                }.bind(this),
                error: function (oError) {
                    this._oView.setBusy(false);
                    this._oDialog.setBusy(false);
                }.bind(this)

            });

        },

        onMeioPagamento: function (oEvent) {
            this._clearErrors();
            var oTable = this._oView.byId(this._oView.getId() + "--GridTable");

            this._sItemPath = oTable.getContextByIndex(oTable.getAggregation("plugins")[0].getSelectedIndices()).sPath;
            var oForm = sap.ui.getCore().byId("smartFormColumn");
            oForm.setModel(this._oModel);
            oForm.bindElement(this._sItemPath);
            this._oDialog.setModel(this._oModel)
            this._oDialog.bindElement(this._sItemPath);

            var oViewModel = new sap.ui.model.json.JSONModel();
            oViewModel.setData({ tableVisible: this._oModel.getProperty(this._sItemPath + "/MeioPagto") === "2" });
            this._oDialog.setModel(oViewModel, "oViewModel");

            var sSet = this._sItemPath + "/to_Cheques";
            this._oView.setBusy(true);
            this._oModel.read(sSet, {
                success: function (oData) {
                    this._oView.setBusy(false);
                    this._oModelMNA = new sap.ui.model.json.JSONModel();
                    this._oModelMNA.setData(oData.results);
                    this._oDialog.setModel(this._oModelMNA, "oModelMNA");



                    this._oDialog.open();

                }.bind(this),
                error: function () {
                    this._oView.setBusy(false);
                }.bind(this)
            });





        },

        onInitialiseTable: function (oTable) {
            var aColumns = oTable.getColumns();

            for (var i = 0; i < aColumns.length; i++) {
                var sPath = "oModelMNA>" + aColumns[i].data("p13nData").columnKey;
                try {
                    aColumns[i].getMenu().setEnabled(false);
                    aColumns[i].getTemplate().insertCustomData(new sap.ui.core.CustomData({ value: sPath }));
                    aColumns[i].getTemplate().getEdit().attachEvent("innerControlsCreated", function (oEvt) {
                        try {
                            var oField = oEvt.getSource().getInnerControls()[0];
                            var sPath = oEvt.getSource().getParent().getCustomData()[0].mProperties.value;
                            oField.bindValue(sPath);

                        } catch (e) {
                        }
                    }.bind(this));

                } catch (e) {
                }

            }

            oTable.bindRows("oModelMNA>/");

        },

        onAfterRendering: function () {
            this._oView.byId(this._oView.getId() + "--meioPagamentoButton").setEnabled(false);
            var oTable = this._oView.byId(this._oView.getId() + "--GridTable");
            oTable.getAggregation("plugins")[0].attachSelectionChange(function () {
                if (oTable.getAggregation("plugins")[0].getSelectedIndices().length > 0) {
                    var sPath = oTable.getContextByIndex(oTable.getAggregation("plugins")[0].getSelectedIndices()).sPath;
                    this._oView.byId(this._oView.getId() + "--meioPagamentoButton").bindProperty("enabled", sPath + "/Status", function (oParam) {
                        return oParam !== "Pago";
                    });
                }else{
                    this._oView.byId(this._oView.getId() + "--meioPagamentoButton").setEnabled(false);
                }

            }.bind(this)
            );
            oTable.getContextByIndex = function (iIndex) {

                var oBinding = oTable.getBinding("rows");

                if (iIndex >= 0 && oBinding && oBinding.getContexts(iIndex, 1).length > 0) {
                    var sPath = oBinding.getContexts(iIndex, 1)[0].sPath;
                    if (sPath !== undefined) {
                        var oContext = this._oModel.getContext(sPath);
                        oContext.getObject = function () {
                            var oObj = oContext.getModel().getObject(sPath);
                            oObj.Bupla = this._sParam;
                            return oObj;
                        }.bind(this);
                    }
                }

                return iIndex >= 0 && oBinding ? oBinding.getContexts(iIndex, 1)[0] : null;
            }.bind(this);

        }
    };
});