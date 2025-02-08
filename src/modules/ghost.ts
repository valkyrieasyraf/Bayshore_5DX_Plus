import { Application } from "express";
import { Module } from "module";
import { prisma } from "..";

// Import Proto
import * as wm from "../wmmt/wm5.proto";

// Import Util
import * as common from "./util/common";


export default class GhostModule extends Module {
    register(app: Application): void {
		app.post('/method/load_ghost_battle_info', async (req, res) => {

			let body = wm.wm5.protobuf.LoadGhostBattleInfoRequest.decode(req.body);

			let car = await prisma.car.findFirst({
				where:{
					carId: body.carId
				}
			})

			let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
				stampSheetCount: car!.stampSheetCount,
				stampSheet: car?.stampSheet || null

			};
			
			let message = wm.wm5.protobuf.LoadGhostBattleInfoResponse.encode(msg);

			common.sendResponse(message, res);
		})

		app.get('/resource/ghost_summary', async (req, res) => {

			let message = wm.wm5.protobuf.GhostSummary.encode({ghosts:null});

			common.sendResponse(message, res);
		})
	}
}