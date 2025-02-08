import { Application } from "express";
import { Module } from "module";
import { prisma } from "..";
import { User } from "@prisma/client";
import Long from "long";

// Import Proto
import * as wm from "../wmmt/wm5.proto";

// Import Util
import * as common from "./util/common";


export default class CarModule extends Module {
    register(app: Application): void {

        // Load Car
		app.post('/method/load_car', async (req, res) => {

            // Get the request body for the load car request
			let body = wm.wm5.protobuf.LoadCarRequest.decode(req.body);

            // Get the car (required data only) with the given id
			let car = await prisma.car.findFirst({
				where: {
					carId: body.carId
				},
				include: {
					setting: true,
					ownedItems: true,
					gtWing: true,
					lastPlayedPlace: true,
				}
			});

			// Convert the database lose bits to a Long
			let longLoseBits = Long.fromString(car!.stLoseBits.toString());

            // Response data
			let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
				car: {
					...car!
				},
				...car!,
				stLoseBits: longLoseBits,
				ownedItems: car!.ownedItems,
				announceEventModePrize: false,
			};

            // Generate the load car response message
			let message = wm.wm5.protobuf.LoadCarResponse.encode(msg);

			// Send the response
            common.sendResponse(message, res);
		});


        // Create new car
		app.post('/method/create_car', async (req, res) => {

			// Get the request body for the create car request
			let body = wm.wm5.protobuf.CreateCarRequest.decode(req.body);
			
			// Trim Mojibake
			body.cardChipId = body.cardChipId.replace('��������0000', '');

			// Get the current date/time (unix epoch)
			let date = Math.floor(new Date().getTime() / 1000)

			// Retrieve user from card chip / user id
			let user: User | null;

			// User ID provided, use that
			if (body.userId) 
			{
				user = await prisma.user.findFirst({
					where: {
						id: body.userId
					},
				});
			} 
			else { // No user id, use card chip
				user = await prisma.user.findFirst({
					where: {
						chipId: body.cardChipId,
						accessCode: body.accessCode
					},
				})
			}

			// User not found, terminate
			if (!user) throw new Error();

			// Generate blank car settings object
			let settings = await prisma.carSettings.create({
				data: {}
			});

			// Generate blank car state object
			let state = await prisma.carState.create({
				data: {}
			})

			// Generate blank car gtWing object
			let gtWing = await prisma.carGTWing.create({
				data: {}
			})

			// Sets if full tune is used or not
			// let fullyTuned = false;

			// 0: Stock Tune
			// 1: Basic Tune (600 HP)
			// 2: Fully Tuned (840 HP)
			let tune = 0;

			
			// User item not used, but car has 600 HP by default
			if (body.car && 
				(body.car.tunePower == 16) && (body.car.tuneHandling == 16))
			{
				// Car is basic tuned
				tune = 1;
			}

			// Randomize regionId
			let randomRegionId: number = 18;
			for(let i=0; i<5; i++)
			{
				randomRegionId = Math.floor(Math.random() * 47) + 1;
			}

			
			// Check Team
			let checkTeam = await prisma.car.findFirst({
				where:{
					userId: user.id
				}
			})
			let additionalTeamInsert = {};

			if(checkTeam?.teamId !== null && checkTeam?.teamId !== undefined)
			{
				additionalTeamInsert = {
					teamId: checkTeam.teamId,
					teamName: checkTeam.teamName,
					teamDecoration: checkTeam.teamDecoration,
					teamDecorationColor: checkTeam.teamDecorationColor,
					teamSticker: checkTeam.teamSticker,
					teamStickerFont: checkTeam.teamStickerFont
				}
			}
			
			// Default car values
			let carInsert = {
				userId: user.id,
				manufacturer: body.car.manufacturer!,
				defaultColor: body.car.defaultColor!,
				model: body.car.model!,
				visualModel: body.car.visualModel!,
				name: body.car.name!,
				title: body.car.title!,
				level: body.car.level!,
				tunePower: body.car.tunePower!,
				tuneHandling: body.car.tuneHandling!,
				carSettingsDbId: settings.dbId,
				carStateDbId: state.dbId,
				carGTWingDbId: gtWing.dbId,
				regionId: randomRegionId,
				lastPlayedAt: date,
				lastPlayedPlaceId: 1, // Server Default

				shopPoint : 100000,
				shopGrade : 100000,
			};
			
			// Additional car values (for basic / full tune)
			let additionalInsert = {}

			// Switch on tune status
			switch(tune)
			{
				// 0: Stock, nothing extra

				case 1: // Basic Tune

					// Updated default values
					carInsert.level = 2; // C8
					carInsert.tunePower = 10; // 600 HP
					carInsert.tuneHandling = 10; // 600 HP
	
					// Additional basic tune values
					additionalInsert = {
						ghostLevel: 4,
						stClearBits: 0,
						stLoseBits: 0,
						stClearCount: 20,
						stClearDivCount: 1,
						stConsecutiveWins: 20,
						stConsecutiveWinsMax: 20
					};
					break;

				case 2: // Fully Tuned

					// Updated default values
					carInsert.level = 7; // C4 (The bomb has been planted)
					carInsert.tunePower = 16; // 720 HP
					carInsert.tuneHandling = 16; // 720 HP

					// Additional full tune values
					additionalInsert = {
						ghostLevel: 9,
						stClearBits: 0,
						stLoseBits: 0,
						stClearCount: 60,
						stClearDivCount: 3,
						stConsecutiveWins: 60,
						stConsecutiveWinsMax: 60
					};
			}

			// Insert the car into the database
			let car = await prisma.car.create({
				data: {
					...carInsert,
					...additionalInsert,
				}
			});

			// Get the user's current car order
			let carOrder = user.carOrder;

			// Add the new car to the front of the id
			carOrder.unshift(car.carId);

			// Add the car to the front of the order
			await prisma.user.update({
				where: {
					id: user.id
				}, 
				data: {
					carOrder: carOrder
				}
			});

			console.log(`Created new car ${car.name} with ID ${car.carId}`);

			// Response data
            let msg = {
                error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
				carId: car.carId,
				car,
				...carInsert,
				...additionalInsert,
				...additionalTeamInsert,
				rgStamp: 1
            }

            // Generate the load car response message
            let message = wm.wm5.protobuf.CreateCarResponse.encode(msg);

            // Send the response
            common.sendResponse(message, res);
        })


        // Saving the certain car update (on saving bannapass screen or after exiting user's detail car data or after editing car dress up on terminal)
		app.post('/method/update_car', async (req, res) => {

			// Get the request body for the update car request
			let body = wm.wm5.protobuf.UpdateCarRequest.decode(req.body);

			// Get the ghost result for the car
			let cars = body?.car;

			// Declare data
			let data : any;

			// Car is set
			if (cars)
			{
				// Get current date
				let date = Math.floor(new Date().getTime() / 1000);

				// Car update data
				data = {
					customColor: common.sanitizeInput(cars.customColor),
					wheel: common.sanitizeInput(cars.wheel),
					wheelColor: common.sanitizeInput(cars.wheelColor), 
					aero: common.sanitizeInput(cars.aero),
					bonnet: common.sanitizeInput(cars.bonnet),
					wing: common.sanitizeInput(cars.wing),
					mirror: common.sanitizeInput(cars.mirror),
					sticker: common.sanitizeInput(cars.sticker),
					stickerColor: common.sanitizeInput(cars.stickerColor),
					sideSticker: common.sanitizeInput(cars.sideSticker),
					neon: common.sanitizeInput(cars.neon),
					trunk: common.sanitizeInput(cars.trunk),
					plate: common.sanitizeInput(cars.plate),
					plateColor: common.sanitizeInput(cars.plateColor),
					plateNumber: common.sanitizeInput(cars.plateNumber),
					specialSticker: common.sanitizeInput(cars.specialSticker),
    				specialStickerColor: common.sanitizeInput(cars.specialStickerColor),
					aura: common.sanitizeInput(cars.aura),
					auraMotif: common.sanitizeInput(cars.auraMotif),
					lastPlayedAt: date,
					teamSticker: cars.teamSticker,
				}

				// Update the car info
				await prisma.car.update({
					where: {
						carId: body.carId
					}, 
					data: data
				})
			}

            // Get the car with the given id
			let car = await prisma.car.findFirst({
				where: {
					carId: body.carId
				},
				include: {
					setting: true,
					gtWing: true,
					lastPlayedPlace: true
				}
			});
			
			// Update the car settings
			await prisma.carSettings.update({
				where: {
					dbId: car?.carSettingsDbId,
				},
				data: {
					...body.setting,
					nameplateFrame: body.setting?.nameplateFrame || 0,
					nameplateFrameColor: body.setting?.nameplateFrameColor || 0
				}
			});

			// Get car item (custom color or discarded card)
			if(body.earnedItems.length !== 0)
			{
				console.log('Car Item reward available, continuing ...');

				for(let i=0; i<body.earnedItems.length; i++)
				{
					await prisma.carItem.create({
						data: {
							carId: body.carId,
							category: body.earnedItems[i].category,
							itemId: body.earnedItems[i].itemId,
							amount: 1
						}
					});
				}
			}

			// Update the GT Wing (custom wing) info
			// Get the GT Wing data for the car
			let gtWing = body.car?.gtWing;
			let dataGTWing: any;

			// GT Wing is set
			if (gtWing)
			{
				dataGTWing = {
					pillar: common.sanitizeInput(gtWing.pillar), 
					pillarMaterial: common.sanitizeInput(gtWing.pillarMaterial), 
					mainWing: common.sanitizeInput(gtWing.mainWing), 
					mainWingColor: common.sanitizeInput(gtWing.mainWingColor), 
					wingTip: common.sanitizeInput(gtWing.wingTip), 
					material: common.sanitizeInput(gtWing.material), 
				}

				await prisma.carGTWing.update({
					where: {
						dbId: body.carId
					}, 
					data: dataGTWing
				})
			}
			// Check if this is in getting new custom color screen or not
			else if(body.car?.carId !== null && body.car?.carId !== undefined)
			{
				// GT Wing not set
				if(gtWing === undefined || gtWing === null)
				{
					dataGTWing = {
						pillar: 0, 
						pillarMaterial: 0, 
						mainWing: 0, 
						mainWingColor: 0, 
						wingTip: 0, 
						material: 0, 
					}

					await prisma.carGTWing.update({
						where: {
							dbId: body.carId
						}, 
						data: dataGTWing
					})
				}
			}
			
			// Update Maxi Gold Balance
			if(body.maxiGold !== null && body.maxiGold !== undefined
				&& body.car?.userId !== null && body.car?.userId !== undefined)
			{
				let maxiGold = body.maxiGold;

				await prisma.user.update({
					where:{
						id: body.car.userId
					},
					data:{
						maxiGold: maxiGold
					}
				})
			}

			// Response data
            let msg = {
                error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
            }

			// Encode the response
            let message = wm.wm5.protobuf.UpdateCarResponse.encode(msg);

            // Send the response
            common.sendResponse(message, res);
        })


		// Grant Car Right
		app.post('/method/grant_car_right', async (req, res) => {

			// Get the request body
            let body = wm.wm5.protobuf.GrantCarRightRequest.decode(req.body)

			// TODO: Make this feature working properly
			// This is literally just bare-bones so the shit boots

			// Response data
			let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
			}

			// Encode the response
			let message = wm.wm5.protobuf.GrantCarRightResponse.encode(msg);

			// Send the response to the client
            common.sendResponse(message, res);
		})


		// Load Car Campaign Info
		app.post('/method/load_car_campaign_info', async (req, res) => {

			// Get the request body
            let body = wm.wm5.protobuf.LoadCarCampaignInfoRequest.decode(req.body)

			// TODO: Make this feature working properly
			// This is literally just bare-bones so the shit boots

			// Response data
			let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
				carCampaignUserState: wm.wm5.protobuf.CarCampaignUserState.CAR_CAMPAIGN_NOT_ACCEPTED,
				numOfPieces: 0,
				numOfRemainingLotteries: 0,
				lotteryOpenBits: 0
			}

			// Encode the response
			let message = wm.wm5.protobuf.LoadCarCampaignInfoResponse.encode(msg);

			// Send the response to the client
            common.sendResponse(message, res);
		})


		// Accept Car Campaign
		app.post('/method/accept_car_campaign', async (req, res) => {

			// Get the request body
            let body = wm.wm5.protobuf.AcceptCarCampaignRequest.decode(req.body)

			// TODO: Make this feature working properly
			// This is literally just bare-bones so the shit boots

			// Response data
			let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
			}

			// Encode the response
			let message = wm.wm5.protobuf.AcceptCarCampaignResponse.encode(msg);

			// Send the response to the client
            common.sendResponse(message, res);
		})


		// Save Car Campaign Info
		app.post('/method/save_car_campaign_info', async (req, res) => {

			// Get the request body
            let body = wm.wm5.protobuf.SaveCarCampaignInfoRequest.decode(req.body)

			// TODO: Make this feature working properly
			// This is literally just bare-bones so the shit boots

			// Response data
			let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
			}

			// Encode the response
			let message = wm.wm5.protobuf.SaveCarCampaignInfoResponse.encode(msg);

			// Send the response to the client
            common.sendResponse(message, res);
		})


		// Rename Car
		app.post('/method/rename_car', async (req, res) => {

			// Get the request body
            let body = wm.wm5.protobuf.RenameCarRequest.decode(req.body)

			// TODO: Make this feature working properly
			// This is literally just bare-bones so the shit boots

			// Response data
			let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
				userId: 0
			}

			// Encode the response
			let message = wm.wm5.protobuf.RenameCarResponse.encode(msg);

			// Send the response to the client
            common.sendResponse(message, res);
		})
    }
}