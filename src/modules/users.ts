import { Application } from "express";
import { Config } from "../config";
import { Module } from "module";
import { prisma } from "..";

// Import Proto
import * as wm from "../wmmt/wm5.proto";

// Import Util
import * as common from "./util/common";


export default class UserModule extends Module {
    register(app: Application): void {

        // Load user data when entering the game or after tapping the bannapass card
		app.post('/method/load_user', async (req, res) => {

            // Get the request body for the load user request
			let body = wm.wm5.protobuf.LoadUserRequest.decode(req.body);

			// Trim Mojibake
			body.cardChipId = body.cardChipId.replace('��������0000', '');

            // Get the user from the database
			let user = await prisma.user.findFirst({
				where: {
					chipId: body.cardChipId,
					accessCode: body.accessCode
				},
				include: {
					cars: {
						include:{
							state: true,
							setting: true,
							gtWing: true
						}
					}
				}
			});

			// No user returned
			if (!user) 
			{
				console.log('no such user');

				let msg = {
					error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
					numOfOwnedCars: Number(0),
					cars: [],

					shopPoint: Number(100000),
					shopGrade: Number(100000),
					maxiGold: Number(0),
					totalMaxiGold: Number(0),
					carCoupon: Number(0),
					hp600Count: Number(0),
					tutorials: Number(0),
					membership: Number(0),
					transferred: false,
					transferState: wm.wm5.protobuf.TransferState.NOT_REGISTERED,
				};

				if (!body.cardChipId || !body.accessCode) 
				{
					let msg = {
						error: wm.wm5.protobuf.ErrorCode.ERR_ID_BANNED,
						numOfOwnedCars: Number(0),

						shopPoint: Number(100000),
						shopGrade: Number(100000),
						maxiGold: Number(0),
						totalMaxiGold: Number(0),
						carCoupon: Number(0),
						hp600Count: Number(0),
						tutorials: Number(0),
						membership: Number(0),
						transferred: false,
						transferState: wm.wm5.protobuf.TransferState.NOT_REGISTERED,
					}

					// Encode the response
					let message = wm.wm5.protobuf.LoadUserResponse.encode(msg);

					// Send the response to the client
					common.sendResponse(message, res);

					return;
				}

				// Check if new card registration is allowed or not
				let newCardsBanned = Config.getConfig().gameOptions.newCardsBanned;

				// New card registration is allowed
				if (newCardsBanned === 0)
				{
					let user = await prisma.user.create({
						data: {
							chipId: body.cardChipId,
							accessCode: body.accessCode,
							tutorials: Number(0)
						}
					});
	
					console.log('user made');

					if (!user) 
					{
						msg.error = wm.wm5.protobuf.ErrorCode.ERR_REQUEST;
					}

					let ftTicketGrant = Config.getConfig().gameOptions.grantFullTuneTicketToNewUsers;

					// TODO: Make full tune ticket saving and load
					/*if (ftTicketGrant > 0) 
					{
						console.log(`Granting Full-Tune Ticket x${ftTicketGrant} to new user...`);

						for (let i=0; i<ftTicketGrant; i++) 
						{
							await prisma.userItem.create({
								data: {
									userId: user.id,
									category: wm.wm5.protobuf.ItemCategory.CAT_CAR_TICKET,
									itemId: 5, 
									type: 0 // Car Ticket
								}
							});
						}

						console.log('Done!');
					}*/
				}
				// New card registration is not allowed / closed
				else
				{
					console.log('New card / user registration is closed');
					
					msg.error = wm.wm5.protobuf.ErrorCode.ERR_REQUEST;
				}

				// Encode the response
				let message = wm.wm5.protobuf.LoadUserResponse.encode(msg);

				// Send the response to the client
				common.sendResponse(message, res);

				return;
			}

			// If the car order array has not been created
			if (user.carOrder.length > 0)
			{
				// Sort the player's car list using the car order property
				user.cars = user.cars.sort(function(a, b){

					// User, and both car IDs exist
					if (user)
					{
						// Compare both values using the car order array
						let compare: number = user?.carOrder.indexOf(a!.carId) - user?.carOrder.indexOf(b!.carId);

						// Return the comparison
						return compare;
					}
					else // Car IDs not present in car order list
					{
						throw Error("UserNotFoundException");
					}
				});
			}
			else // Car order undefined
			{
				// We will define it here
				let carOrder : number[] = [];

				// Loop over all of the user cars
				for(let car of user.cars)
				{
					// Add the car id to the list
					carOrder.push(car.carId);
				}

				// Update the car id property for the user
				await prisma.user.update({
					where: {
						id: user.id
					}, 
					data: {
						carOrder: carOrder
					}
				})
			}

			// Get user accepted tutorial
			let userTutorials = 0;
			for(let i=0; i<user.confirmedTutorials.length; i++)
			{
				userTutorials += user.confirmedTutorials[i];
			}

			// Get the states of the user's cars
			let carStates = user.cars.map(e => e.state);

			// Response data
			let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,

				// User Bannapassport
				banapassportAmId: 1,
				bnidLevel: 1,
				userId: user.id,
				
				// Shop Grade
				shopGrade: Number(0),

				// Maxi Gold
				maxiGold: user.maxiGold,
				totalMaxiGold: user.maxiGold,

				// 5 cars in-game, 200 cars on terminal
				numOfOwnedCars: user.cars.length,
				cars: user.cars.slice(0, body.maxCars),
				carStates,

				// TODO: make saving to FT Ticket
				carCoupon: wm.wm5.protobuf.CarCreationCoupon.CAR_COUPON_HP600,
				hp600Count: user.hp600Count, // Discarded Card

				// Accepted Tutorials
				tutorials: userTutorials,

				// Car Campaign
				carCampaignUserState: wm.wm5.protobuf.CarCampaignUserState.CAR_CAMPAIGN_NOT_ACCEPTED,

				// Competition (OCM)
				competitionUserState: wm.wm5.protobuf.GhostCompetitionParticipantState.COMPETITION_NOT_PARTICIPATED,

				// Team
				teamId: null,
				teamName: null,
				teamStickerFont: null,

				// Maxi.Net
				membership: 0,

				// Card Transfer(?)
				transferred: false,
				transferState: wm.wm5.protobuf.TransferState.NOT_REGISTERED,

				// etc
				banacoinAvailable: true,
				copiedCar: null,
				wasCreatedToday: false,
				participatedInInviteFriendCampaign: false
			}

            // Response data if user is banned
			if (user.userBanned) 
			{
				msg.error = wm.wm5.protobuf.ErrorCode.ERR_ID_BANNED;
			}

            // Encode the response
			let message = wm.wm5.protobuf.LoadUserResponse.encode(msg);

            // Send the response to the client
            common.sendResponse(message, res);
		})


        // Create User Request
        app.post('/method/create_user', async (req, res) => {

			// This request is sent by the terminal when you
			// select 'yes' to register on the starting menu
			// if you have not created your account yet.

			// However, we don't really need to process it as 
			// the load_user command already creates the user.
			// we do, however need to send a valid response 
			// otherwise the terminal crashes.

			// Get the request body for the create user request
			let body = wm.wm5.protobuf.CreateUserRequest.decode(req.body);

			// Get the user info via the card chip id
			let user = await prisma.user.findFirst({
				where: {
					chipId: body.cardChipId,
					accessCode: body.accessCode
				}
			});

			// Message object
			let msg;

			// User exists
			if (user)
			{
                msg = {
                    // Success error message
                    error : wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,

                    // User's user id
                    userId : user?.id
                }
			}
			else // User does not exist
			{
                msg = {
                    // User not found error message
                    error : wm.wm5.protobuf.ErrorCode.ERR_NOT_FOUND, 

                    // No user id
                    userId : 0
                }
			}

			// Generate the response for the create user request
			let message = wm.wm5.protobuf.CreateUserResponse.encode(msg);

            // Send response to client
            common.sendResponse(message, res);
		});


        // Load Drive Information
        app.post('/method/load_drive_information', async (req, res) => {

            // Get the request body for the load drive information request
			let body = wm.wm5.protobuf.LoadDriveInformationRequest.decode(req.body);

            // TODO: Add notices to config
			let notice = (Config.getConfig().notices || []);

            // Create the notice window objects
			let noticeWindows = notice.map(a => wm.wm5.protobuf.NoticeEntry.NOTICE_TEAM_JOINED);

            // Response data
            let msg = {
                error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,	
				noticeWindow: noticeWindows,
				noticeWindowMessage: notice,
				transferNotice: {
					needToSeeTransferred: false,
					needToRenameCar: false,
					needToRenameTeam: false
				},
				restrictedModels: [],
				announceFeature: false,
				announceMobile: false,
				numOfVsContinueTickets: 0
            }

            // Encode the response
            let message = wm.wm5.protobuf.LoadDriveInformationResponse.encode(msg);
            
            // Send the response to the client
            common.sendResponse(message, res);
        })


		// Start Transfer
		app.post('/method/start_transfer', async (req, res) => {

			// Get the request body
            let body = wm.wm5.protobuf.StartTransferRequest.decode(req.body)

			// TODO: Make this feature working properly
			// This is literally just bare-bones so the shit boots

			// Response data
			let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
				userId: 0
			}

			// Encode the response
			let message = wm.wm5.protobuf.StartTransferResponse.encode(msg);

			// Send the response to the client
            common.sendResponse(message, res);
		})
		

		// Update User Lock
		app.post('/method/update_user_lock', async (req, res) => {

			// Get the request body
            let body = wm.wm5.protobuf.UpdateUserLockRequest.decode(req.body)

			// TODO: Make this feature working properly
			// This is literally just bare-bones so the shit boots

			// Response data
			let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS
			}

			// Encode the response
			let message = wm.wm5.protobuf.UpdateUserLockResponse.encode(msg);

			// Send the response to the client
            common.sendResponse(message, res);
		})
	}
}