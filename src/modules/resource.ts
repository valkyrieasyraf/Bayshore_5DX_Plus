import { Application } from "express";
import { Module } from "module";
import { Config } from "../config";
import { prisma } from "..";

// Import Proto
import * as wm from "../wmmt/wm5.proto";
import * as wmsrv from "../wmmt/service.proto";

// Import Util
import * as common from "./util/common";
import * as crown_list from "./resource/crown_list";
import * as ranking from "./resource/ranking";


export default class ResourceModule extends Module {
    register(app: Application): void {

        // Place List
        app.get('/resource/place_list', async (req, res) => {

            console.log('place list');

            // Empty list of place records
            let places: wm.wm5.protobuf.Place[] = [];

            // Response data
            places.push(new wm.wm5.protobuf.Place({
                placeId: Config.getConfig().placeId || 'JPN0123',
                regionId: Number(Config.getConfig().regionId) || 1,
                shopName: Config.getConfig().shopName || 'Bayshore',
                country: Config.getConfig().country || 'JPN'
            }));

            // Check place record data
            let checkPlaceList = await prisma.placeList.findFirst({
                where:{
                    placeId: Config.getConfig().placeId,
                }
            })

            // Place is not registered
            if(!(checkPlaceList))
            {
                console.log('Creating new Place List entry')

                // Creating place list
                await prisma.placeList.create({
                    data:{
                        placeId: Config.getConfig().placeId || 'JPN0123',
                        regionId: Number(Config.getConfig().regionId) || 1,
                        shopName: Config.getConfig().shopName || 'Bayshore',
                        country: Config.getConfig().country || 'JPN'
                    }
                })
            }

            // Encode the response
            let message = wm.wm5.protobuf.PlaceList.encode({places});

             // Send the response to the client
             common.sendResponse(message, res);
        })


        // Get Ranking data for attract screen (TA, Ghost, VS)
        app.get('/resource/ranking', async (req, res) => {

            console.log('ranking');
            
            // Empty list of all ranking records (Combination of TA, VS Stars, and Ghost Battle Win)
            let lists: wmsrv.wm5.protobuf.Ranking.List[] = [];

            // Get TA Ranking
            let rankingTA = await ranking.getTimeAttackRanking();
            lists.push( ...rankingTA.lists );

            // Get VS Outrun Ranking
            let rankingVSOutrun = await ranking.getVSOutrunRanking();
            lists.push( ...rankingVSOutrun.lists );
            
            // Get Ghost Trophies Ranking
            let rankingGhostTrophies = await ranking.getGhostTrophiesRanking();
            lists.push( ...rankingGhostTrophies.lists );
            
            // Encode the response
			let message = wmsrv.wm5.protobuf.Ranking.encode({lists});

            // Send the response to the client
            common.sendResponse(message, res);
        })


        // Crown List for attract screen and Crown Ghost Battle mode
        app.get('/resource/crown_list', async (req, res) => {

            console.log('crown_list');

            // Empty list of crown records
            let crowns: wmsrv.wm5.protobuf.Crown[] = []; 

            // Get Crown List
            let crown_lists = await crown_list.getCrownList();
            crowns.push( ...crown_lists.list_crown );
            
            // Response data
            let msg = {
                crowns: crowns
            };

            // Encode the response
            let message = wmsrv.wm5.protobuf.CrownList.encode(msg);

            // Send the response to the client
            common.sendResponse(message, res);
        })


        // File List
        app.get('/resource/file_list', async (req, res) => {

            console.log('file_list');

            // TODO: Actual stuff here
            // This is literally just bare-bones so the shit boots

			// Response data
			let msg = {
				error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
                files: null,
                interval: null
			}

			// Encode the response
			let message = wm.wm5.protobuf.FileList.encode(msg);

			// Send the response to the client
            common.sendResponse(message, res);
		})

        // Ghost List
        app.get('/resource/ghost_list', async (req, res) => {

            console.log('ghost_list');

            // TODO: Actual stuff here
            // This is literally just bare-bones so the shit boots

			// Response data
            let msg = {
				error: wmsrv.wm5.protobuf.ErrorCode.ERR_SUCCESS,
                ghosts: null
			};

            // Encode the response
			let message = wmsrv.wm5.protobuf.GhostList.encode(msg);

			// Send the response to the client
            common.sendResponse(message, res);
		})
    }
}