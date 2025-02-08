import { Application } from "express";
import { Module } from "module";

// Import Proto
import * as wm from "../wmmt/wm5.proto";

// Import Util
import * as common from "./util/common";


export default class UserModule extends Module {
    register(app: Application): void {

        // Load Shop Information
		app.post('/method/load_shop_information', async (req, res) => {

			// Get the request body for the load drive information request
			let body = wm.wm5.protobuf.LoadShopInformationRequest.decode(req.body);

			// Create shop item proto
			let items: wm.wm5.protobuf.LoadShopInformationResponse.ShopItem[] = [];

			
			// Response data
            let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
				items: items,
				shopState: wm.wm5.protobuf.ShopState.SHOP_NEW_ARRIVALS,
				noticeUnlocked: true,
				shopEnabled: true
			}

			// Encode the response
			let message = wm.wm5.protobuf.LoadShopInformationResponse.encode(msg);
		
			// Send the response to the client
			common.sendResponse(message, res);
		})
    }
}