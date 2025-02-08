import { Application } from "express";
import { Module } from "../module";
import { prisma } from "..";
import { Config } from "../config";

// Import Proto
import * as wm from "../wmmt/wm5.proto";

// Import Util
import * as common from "./util/common";
import * as meter_reward from "./games/meter_reward";
import * as story from "./games/story";
import * as time_attack from "./games/time_attack";
import * as versus from "./games/versus";


export default class GameModule extends Module {
    register(app: Application): void {

		// Saving the game result on mileage screen
		app.post('/method/save_game_result', async (req, res) => {

			// Get the request body for the save game result request
			let body = wm.wm5.protobuf.SaveGameResultRequest.decode(req.body);

			// Get the user's car
			let car = await prisma.car.findFirst({
				where: {
					carId: body.carId
				},
				include:{
					gtWing: true,
					lastPlayedPlace: true
				}
			});

			// Declare some variable
			// Default value is 'false', inside 'BASE_PATH/src/util/games/ghost.ts' file
			let ghostModePlay;
			
			// Default value is 'false', inside 'BASE_PATH/src/util/games/ghost.ts' file
			let updateNewTrail; 

			// Default value is 'false', inside 'BASE_PATH/src/util/games/ghost.ts' file
			let competitionModePlay; 

			// Default value is 'false', inside 'BASE_PATH/src/util/games/ghost.ts' file
			let crownModePlay; 

			// Switch on the gamemode
			switch (body.gameMode) 
			{
				// Save Story Result
				case wm.wm5.protobuf.GameMode.MODE_STORY:
				{
					// Calling save story result function (BASE_PATH/src/util/games/story.ts)
					await story.saveStoryResult(body, car); 

					// Break the switch case
					break;
				}

				// Save Time Attack Result
				case wm.wm5.protobuf.GameMode.MODE_TIME_ATTACK:
				{
					// Calling save time attack result function (BASE_PATH/src/util/games/time_attack.ts)
					await time_attack.saveTimeAttackResult(body);

					// Break the switch case
					break;
				}

				// Save Ghost Battle Result
				case wm.wm5.protobuf.GameMode.MODE_GHOST_BATTLE:
				{
					// Break the switch case
					break;
				}

				// Save Versus Battle Result
				case wm.wm5.protobuf.GameMode.MODE_VS_BATTLE:
				{
					// Calling save vs battle result function (BASE_PATH/src/util/games/versus.ts)
					await versus.saveVersusBattleResult(body, car); 

					// Break the switch case
					break;
				}
			}

			// Get car item
			// Car item reward from the game is available
			if(body.earnedItems.length !== 0)
			{
				console.log('Car Item reward available, continuing ...');
				for(let i=0; i<body.earnedItems.length; i++){
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
			
			// Check region id is 0
			if(body.car!.regionId! === 0)
			{
				let randomRegionId = Math.floor(Math.random() * 47) + 1;
				body.car!.regionId = randomRegionId;
			}

			// Check playet at timestamp
			let timestamps = 0;
			if(body.car?.lastPlayedAt !== undefined && body.car?.lastPlayedAt !== null)
			{
				if(body.car.lastPlayedAt !== 0)
				{
					timestamps = body.car.lastPlayedAt;
				}
				else
				{
					timestamps = Math.floor(new Date().getTime() / 1000);
				}
			}

			// Update car
			await prisma.car.update({
				where: {
					carId: body.carId,
				},
				data: {
					aura: body.car!.aura!,
					auraMotif: body.car!.auraMotif!,
					odometer: body.odometer,
					playCount: body.playCount,
					level: body.car!.level!,
					title: body.car!.title!,
					tunePower: body.car!.tunePower!,
					tuneHandling: body.car!.tuneHandling!,
					lastPlayedAt: timestamps,
					regionId: body.car!.regionId!,
					teamSticker: body.car!.teamSticker!,
				}
			})

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

			// Every n*100 play give reward
			// Check this feature config
			let giveMeterReward = Config.getConfig().gameOptions.giveMeterReward; 

			// Check if this feature activated and check if user's play count is n*100 play
			if(giveMeterReward === 1 && body.playCount % 100 === 0 &&  body.playCount !== 0)
			{
				// Calling give meter reward function (BASE_PATH/src/util/meter_reward.ts)
				await meter_reward.giveMeterRewards(body);
			}

			// Update user
			let user = await prisma.user.findFirst({
				where: {
					id: body.car!.userId!
				}
			});

			// User object exists
			if (user)
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


				// Get the order of the user's cars
				let carOrder = user?.carOrder;

				// Get the index of the selected car
				let index = carOrder.indexOf(body.carId);

				// Only splice array when item is found
				if (index > -1) 
				{ 
					carOrder.splice(index, 1); // 2nd parameter means remove one item only
				}

				// Add it back to the front
				carOrder.unshift(body.carId);

				// Otherwise, just ignore it

				// Update the values
				await prisma.user.update({
					where: {
						id: body.car!.userId!
					},
					data: {
						confirmedTutorials: storedTutorials, 
						carOrder: carOrder
					}
				});
			}

			// Response data
			let msg;

			// Normal Ghost Battle mode game mode is completed
			if(ghostModePlay === true && competitionModePlay === false &&
				updateNewTrail === true && crownModePlay === false)
			{
				console.log('Normal Ghost Battle Session Found');

				msg = {
					error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,

					// Set session for saving ghost trail Normal Ghost Battle Mode
					ghostSessionId: Math.floor(Math.random() * 50) + 1 
				}
			}
			// Crown Ghost Battle mode game mode is completed
			else if(ghostModePlay === true && competitionModePlay === false && 
					updateNewTrail === true && crownModePlay === true)
			{
				console.log('Crown Ghost Battle Session Found');

				msg = {
					error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,

					// Set session for saving ghost trail Crown Ghost Battle Mode
					ghostSessionId: Math.floor(Math.random() * 50) + 51 
				}
			}
			// OCM Battle game mode is completed
			else if(ghostModePlay === true && competitionModePlay === true && 
					updateNewTrail === true && crownModePlay === false)
			{ 
				console.log('OCM Ghost Battle Session Found');

				msg = {
					error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,

					// Set session for saving ghost trail OCM Ghost Battle Mode
					ghostSessionId: Math.floor(Math.random() * 100) + 101 
				}
			}
			// Story mode or TA mode is completed or Losing to Crown Battle
			else
			{ 
				msg = {
					error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS

					// No session for saving ghost trail (not playing Ghost Battle Mode / Retiring)
				}
			}
			
			// Encode the response
			let message = wm.wm5.protobuf.SaveGameResultResponse.encode(msg);

            // Send the response to the client
            common.sendResponse(message, res);
		})
		

		// Load user's car game data
		app.post('/method/load_game_history', async (req, res) => {
			
			// Get the request content
			let body = wm.wm5.protobuf.LoadGameHistoryRequest.decode(req.body);

			// Empty list of time attack records for the player's car
			let ta_records : wm.wm5.protobuf.LoadGameHistoryResponse.TimeAttackRecord[] = [];

			// Get the car info
			let car = await prisma.car.findFirst({
				where: {
					carId: body.carId
				},
				include:{
					gtWing: true,
					lastPlayedPlace: true
				}
			});

			// Get the car's time attack records
			let records = await prisma.timeAttackRecord.findMany({
				where: {
					carId: body.carId
				}
			});

			// Loop over all of the records
			for(let record of records)
			{
				// This code could probably be done with less DB calls in the future

				// Calculate the total rank, total participants for the record
				let wholeData = await prisma.timeAttackRecord.findMany({
					where: {
						course: record.course
					}, 
					orderBy: {
						time: 'asc'
					}
				});

				// Get the overall number of participants
				let wholeParticipants = wholeData.length;

				// Whole rank (default: 1)
				let wholeRank = 1;

				// Loop over all of the participants
				for(let row of wholeData)
				{
					// If the car ID does not match
					if (row.carId !== body.carId)
					{
						// Increment whole rank
						wholeRank++; 
					}
					else // Model ID matches
					{
						// Break the loop
						break;
					}
				}

				// Calculate the model rank, model participants for the record
				let modelData = await prisma.timeAttackRecord.findMany({
					where: {
						course: record.course, 
						model: record.model
					}, 
					orderBy: {
						time: 'asc'
					}
				});

				// Get the overall number of participants (with the same car model)
				let modelParticipants = modelData.length;

				// Model rank (default: 1)
				let modelRank = 1;

				// Loop over all of the participants
				for(let row of modelData)
				{
					// If the car ID does not match
					if (row.carId !== body.carId)
					{
						// Increment whole rank
						modelRank++; 
					}
					else // Model ID matches
					{
						// Break the loop
						break;
					}
				}

				// Generate the time attack record object and add it to the list
				ta_records.push(wm.wm5.protobuf.LoadGameHistoryResponse.TimeAttackRecord.create({
					course: record.course, 
					time: record.time, 
					tunePower: record.tunePower,
					tuneHandling: record.tuneHandling,
					wholeParticipants: wholeParticipants, 
					wholeRank: wholeRank, 
					modelParticipants: modelParticipants, 
					modelRank: modelRank
				}));
			}

			// Get current date
            let date = Math.floor(new Date().getTime() / 1000);
			
			// Response data
			let msg = {
                error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
				taRecords: ta_records,
				taRankingUpdatedAt: date,
				ghostHistory: [],
				ghostBattleCount: car!.rgPlayCount,
				ghostBattleWinCount: car!.rgWinCount,
				stampSheetCount: 0, 
				stampSheet: []
            }

			// Encode the response
            let message = wm.wm5.protobuf.LoadGameHistoryResponse.encode(msg);
            
			// Send the response to the client
            common.sendResponse(message, res);
        })


		// Save Charge
		app.post('/method/save_charge', (req, res) => {

			// Response data
            let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
			};

			// Encode the response
			let message = wm.wm5.protobuf.SaveChargeResponse.encode(msg);
			
			// Send the response to the client
            common.sendResponse(message, res);
        })
    }
}
