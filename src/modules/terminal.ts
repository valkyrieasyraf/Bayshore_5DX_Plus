import { Application } from "express";
import { Config } from "../config";
import { Module } from "module";
import { prisma } from "..";

// Import Proto
import * as wm from "../wmmt/wm5.proto";
import * as wmsrv from "../wmmt/service.proto";

// Import Util
import * as common from "./util/common";


export default class TerminalModule extends Module {
    register(app: Application): void {

        // Load upon enter terminal
		app.post('/method/load_terminal_information', async (req, res) => {

            // Get the request body for the load terminal information request
            let body = wm.wm5.protobuf.LoadTerminalInformationRequest.decode(req.body);

			// Response data
			let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,

				maxiGoldReceivable: true,
				prizeReceivable: true,
				transferNotice: {
					needToSeeTransferred: false,
					needToRenameCar: false,
					needToRenameTeam: false
				},
				announceFeature: false,
				freeScratched: true
			}

            // Encode the response
			let message = wm.wm5.protobuf.LoadTerminalInformationResponse.encode(msg);

			// Send the response to the client
            common.sendResponse(message, res);
		})

		
		// Car Summary Request (for bookmarks, also for search ghost by name)
		app.get('/resource/car_summary', async (req, res) => {

			// Get the query from the request
			let query = req.query;
			let cars;

			// Check the query limit
			let queryLimit = 10
			if(query.limit)
			{
				queryLimit = Number(query.limit);
			}

			// Check the last played place id
			if(query.last_played_place_id)
			{
				let queryLastPlayedPlaceId = 1;
				let getLastPlayedPlaceId = await prisma.placeList.findFirst({
					where:{
						placeId: String(query.last_played_place_id)
					}
				})

				if(getLastPlayedPlaceId)
				{
					queryLastPlayedPlaceId = getLastPlayedPlaceId.id;
				}

				cars = await prisma.car.findMany({
					take: queryLimit, 
					where: {
						lastPlayedPlaceId: queryLastPlayedPlaceId
					},
					include:{
						gtWing: true,
						lastPlayedPlace: true
					}
				});
			}
			else
			{
				// Get all of the cars matching the query
				cars = await prisma.car.findMany({
					take: queryLimit, 
					where: {
						OR:[
							{
								name: {
									startsWith: String(query.name)
								}
							},
							{
								name: {
									endsWith: String(query.name)
								}
							}
						]
						
					},
					include:{
						gtWing: true,
						lastPlayedPlace: true
					}
				});
			}

			// Check if regionId is 0
			for(let i=0; i<cars.length; i++)
			{
				// Change to other value if regionId is 0
				if(cars[i].regionId === 0)
				{
					let randomRegionId = Math.floor(Math.random() * 47) + 1;
					cars[i].regionId = randomRegionId;
				}
			}
			
			// Response data
			let msg = {
				hitCount: cars.length,
				cars: cars
			}

			// Encode the response
			let message = wmsrv.wm5.protobuf.CarSummary.encode(msg);

			// Send the response to the client
            common.sendResponse(message, res);
		})


		// Save upon timeout / exit terminal
		app.post('/method/save_terminal_result', async (req, res) => {

			// Get the contents from the request
			let body = wm.wm5.protobuf.SaveTerminalResultRequest.decode(req.body);

			// user id is required field
			let user = await prisma.user.findFirst({
				where: { 
					id: body.userId 
				},
			});

			if(user)
			{
				// Get user tutorials
				let storedTutorials = user?.confirmedTutorials;

				// Update any seen tutorials
				for(let i=0; i<body.confirmedTutorials.length; i++)
				{
					// Get the index of the selected tutorial
					let indexTutoral = storedTutorials.indexOf(body.confirmedTutorials[i]);

					// Only splice array when item is found
					if (indexTutoral > -1) 
					{ 
						storedTutorials.splice(indexTutoral, 1); // 2nd parameter means remove one item only
					}

					// Add it back to the front
					storedTutorials.unshift(body.confirmedTutorials[i]);
				}

				// If the car order was modified
				// Update the car order in the table
				if (body.carOrder.length > 0)
				{
					await prisma.user.update({
						where: {
							id: body.userId
						},
						data: {
							carOrder: body.carOrder
						}
					});
				}
			}

			// Response data
			let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
			}

			// Encode the response
			let message = wm.wm5.protobuf.SaveTerminalResultResponse.encode(msg);

			// Send the response to the client
            common.sendResponse(message, res);
		})


		// Save Scratch Sheet
        app.post('/method/save_scratch_sheet', (req, res) => {

            // Get the information from the request
            let body = wm.wm5.protobuf.SaveScratchSheetRequest.decode(req.body);

            // TODO: Actual stuff here
			// This is literally just bare-bones so the shit boots

			// Response data
			let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS
			};

			// Encode the response
			let message = wm.wm5.protobuf.SaveTerminalResultResponse.encode(msg);

			// Send the response to the client
			common.sendResponse(message, res);
        })
    }	
}