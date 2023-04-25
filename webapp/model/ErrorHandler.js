sap.ui.define([
	"sap/ui/base/Object",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel"
], function (UI5Object, MessageBox, JSONModel) {
	"use strict";

	return UI5Object.extend("dellavolpe.com.br.zuifipgtoavulso.model.ErrorHandler", {

		constructor: function (oComponent, oPModels,fnCallback) {
			this._oResourceBundle = oComponent.getModel("i18n").getResourceBundle();
			this._oComponent = oComponent;
			this._bMessageOpen = false;
			this._fnCallback = fnCallback;
			this._sErrorText = this._oResourceBundle.getText("errorMessage");
			var oModels = oPModels ? oPModels : [];
			var that = this;
			oModels.forEach(
				function (sModelName) {
					var oModel = sModelName !== "" ? oComponent.getModel(sModelName) : oComponent.getModel();
					oModel.attachMetadataFailed(function (oEvent) {
						var oParams = oEvent.getParameters();
						that._showMetadataError(oParams.response);
					}, that);
					oModel.attachRequestFailed(that.onRequestFailed, that);
				}
			);

		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event Handler for Request Fail event
		 * The user can try to refresh the metadata.
		 * @param {object} oEvent an event containing the response data
		 * @private
		 */
		onRequestFailed: function (oEvent) {
			var oParams = oEvent.getParameters();

			if (oParams.response.statusCode === 503 || oParams.response.message === "Response did not contain a valid OData batch result") {
				if (!this._bMessageOpen) {
					this._bMessageOpen = true;
					MessageBox.show(
						this._oResourceBundle.getText("txtSession"), {
							icon: MessageBox.Icon.ERROR,
							title: this._oResourceBundle.getText("errorMessage"),
							actions: [MessageBox.Action.CLOSE],
							onClose: function () {
								this._bMessageOpen = false;
							}.bind(this)
						}
					);
				}
				return;
			}

			// An entity that was not found in the service is also throwing a 404 error in oData.
			// We already cover this case with a notFound target so we skip it here.
			// A request that cannot be sent to the server is a technical error that we have to handle though
			if ((oParams.response.statusCode !== "404") || (oParams.response.statusCode === 404 &&
					oParams.response.responseText.indexOf("Cannot POST") === 0)) {
				this._showServiceError(oParams.response);
			}
		},

		/**
		 * Shows a {@link sap.m.MessageBox} when the metadata call has failed.
		 * The user can try to refresh the metadata.
		 * @param {string} sDetails a technical error to be displayed on request
		 * @private
		 */
		_showMetadataError: function (sDetails) {
			MessageBox.error(
				this._sErrorText, {
					id: "metadataErrorMessageBox",
					details: sDetails,
					//styleClass: this._oComponent.getContentDensityClass(),
					actions: [MessageBox.Action.CLOSE]
				}
			);
		},

		_showErrorMsg: function (sTitle, sMessageHeader, sDetails) {

			MessageBox.error(
				sMessageHeader, {
					id: "ErrorMessageBox",
					title: sTitle,
					details: sDetails,
					icon: MessageBox.Icon.ERROR,
					//styleClass: this._oComponent.getContentDensityClass(),
					actions: MessageBox.Action.CLOSE

				}
			);
		},

		/**
		 * Shows a {@link sap.m.MessageBox} when a service call has failed.
		 * Only the first error message will be display.
		 * @param {string} sDetails a technical error to be displayed on request
		 * @private
		 */
		_showServiceError: function (sDetails) {
			if (this._bMessageOpen) {
				return;
			}
			if(this._fnCallback){
				if(!this._fnCallback(sDetails)){
					return;
				}
			}
			this._bMessageOpen = true;
			var message;
			try {
				var oJSONModel = new JSONModel();
				oJSONModel.setJSON(sDetails.responseText);
				message = oJSONModel.getProperty("/error/message/value");
			} catch (e) {
				try {
					var oXmlDoc;
					if (window.DOMParser) {
						var parser = new DOMParser();
						oXmlDoc = parser.parseFromString(sDetails.responseText, "text/xml");
					} else {
						oXmlDoc = new ActiveXObject("Microsoft.XMLDOM");
						oXmlDoc.async = false;
						oXmlDoc.loadXML(oXmlDoc);
					}
					message = oXmlDoc.getElementsByTagName("message")[0].textContent;
				} catch (ex) {
					//do nothing
				}
			}

			if (message) {
				MessageBox.show(
					message, {
						id: "serviceErrorMessageBox",
						icon: MessageBox.Icon.ERROR,
						title: this._oResourceBundle.getText("errorMessage"), //this._sErrorTitle,
						//styleClass: this._oComponent.getContentDensityClass(),
						actions: [MessageBox.Action.CLOSE],
						onClose: function () {
							this._bMessageOpen = false;
						}.bind(this)
					}
				);
			} else {
				//this._bMessageOpen = false;
				//return;
				MessageBox.show(
					//this._sErrorText,
					this._oResourceBundle.getText("errorDetails"), {
						id: "serviceErrorMessageBox",
						icon: MessageBox.Icon.ERROR,
						title: this._oResourceBundle.getText("errorMessage"), //this._sErrorTitle,
						details: sDetails.responseText,
						//styleClass: this._oComponent.getContentDensityClass(),
						actions: [MessageBox.Action.CLOSE],
						onClose: function () {
							this._bMessageOpen = false;
						}.bind(this)
					}
				);

			}
		}
	});

});
