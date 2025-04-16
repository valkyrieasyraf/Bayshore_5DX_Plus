import { Application } from "express";
import { prisma } from "..";
import type { PrismaClient, GhostTrail as PrismaGhostTrail } from "@prisma/client";

// Import Proto
import * as wm from "../wmmt/wm5.proto";
import * as service from "../wmmt/service.proto";

// Import Util
import * as common from "./util/common";
import * as check_step from "./games/games_util/check_step";

interface IGhostBattleResult {
    area: number;
    opponent?: {
        carId: number;
        tunePower: number;
        tuneHandling: number;
        result: boolean;
    };
    isCrownBattle?: boolean;
}

interface IGhostTrail {
    car: {
        carId: number;
    };
    area: number;
    ramp: number;
    trail: Uint8Array;
    isCrownBattle?: boolean;
}

interface ISaveGameResultRequest {
    carId: number;
    playedAt?: number;
    shopName?: string;
    ghostBattleResult?: IGhostBattleResult;
}

interface ISaveGhostTrailRequest {
    trail?: IGhostTrail;
}

interface GhostBattleRecord {
    carId: number;
    opponent: {
        carId: number;
        tunePower: number;
        tuneHandling: number;
        ghostLevel: number;
        result: boolean;
    };
    timestamp: number;
    isCrownBattle: boolean;
}

export default class GhostModule {
    private ghostRecords: Map<number, GhostBattleRecord[]>;

    constructor() {
        this.ghostRecords = new Map();
    }

    register(app: Application): void {
        // Load ghost battle info
        app.post('/method/load_ghost_battle_info', async (req, res) => {
            try {
                const body = wm.wm5.protobuf.LoadGhostBattleInfoRequest.decode(req.body);

                const car = await prisma.car.findFirst({
                    where: {
                        carId: body.carId
                    }
                });

                if (!car) {
                    const errorResponse = wm.wm5.protobuf.LoadGhostBattleInfoResponse.encode({
                        error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
                        hasHistory: false
                    });
                    common.sendResponse(errorResponse, res);
                    return;
                }

                // Get ghost battle records from database (only normal battles)
                const records = await prisma.ghostBattleRecord.findMany({
                    where: {
                        carId: car.carId,
                        crownBattle: false // Only get normal battles
                    },
                    orderBy: {
                        playedAt: 'desc'
                    },
                    take: 10
                });

                const hasHistory = records.length > 0;

                const msg = wm.wm5.protobuf.LoadGhostBattleInfoResponse.create({
                    error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
                    hasHistory
                });

                const responseBuffer = wm.wm5.protobuf.LoadGhostBattleInfoResponse.encode(msg);
                common.sendResponse(responseBuffer, res);
            } catch (error) {
                console.error("Error in load_ghost_battle_info:", error);
                const msg = wm.wm5.protobuf.LoadGhostBattleInfoResponse.create({
                    error: wm.wm5.protobuf.ErrorCode.ERR_REQUEST,
                    hasHistory: false
                });
                const responseBuffer = wm.wm5.protobuf.LoadGhostBattleInfoResponse.encode(msg);
                common.sendResponse(responseBuffer, res);
            }
        });

        // Save game result
        app.post('/method/save_game_result', async (req, res) => {
            try {
                const body = wm.wm5.protobuf.SaveGameResultRequest.decode(req.body) as unknown as ISaveGameResultRequest;

                // Save ghost battle record
                if (body.ghostBattleResult) {
                    // Check if this is a crown battle by looking up crown_detect
                    const crownBattle = await prisma.carCrownDetect.findFirst({
                        where: {
                            carId: body.carId,
                            area: body.ghostBattleResult.area,
                            status: "locked"
                        }
                    });

                    await prisma.ghostBattleRecord.create({
                        data: {
                            carId: body.carId,
                            playedAt: body.playedAt || Math.floor(Date.now() / 1000),
                            playedShopName: body.shopName || "",
                            area: body.ghostBattleResult.area,
                            opponentCarId: body.ghostBattleResult.opponent?.carId || 0,
                            opponentResult: body.ghostBattleResult.opponent?.result ? 1 : 0,
                            opponentTunePower: body.ghostBattleResult.opponent?.tunePower || 0,
                            opponentTuneHandling: body.ghostBattleResult.opponent?.tuneHandling || 0,
                            tunePower: 0,
                            tuneHandling: 0,
                            crownBattle: !!crownBattle // Mark if this was a crown battle
                        }
                    });

                    // If this was a crown battle and the challenger won, update the crown holder
                    if (crownBattle && body.ghostBattleResult.opponent?.result) {
                        await prisma.carCrown.update({
                            where: {
                                area: body.ghostBattleResult.area
                            },
                            data: {
                                carId: body.carId
                            }
                        });
                    }

                    // Clear the crown detect entry after the battle
                    if (crownBattle) {
                        await prisma.carCrownDetect.deleteMany({
                            where: {
                                carId: body.carId,
                                area: body.ghostBattleResult.area
                            }
                        });
                    }
                }

                const msg = wm.wm5.protobuf.SaveGameResultResponse.create({
                    error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS
                });

                const responseBuffer = wm.wm5.protobuf.SaveGameResultResponse.encode(msg);
                common.sendResponse(responseBuffer, res);
            } catch (error) {
                console.error("Error in save_game_result:", error);
                const msg = wm.wm5.protobuf.SaveGameResultResponse.create({
                    error: wm.wm5.protobuf.ErrorCode.ERR_REQUEST
                });
                const responseBuffer = wm.wm5.protobuf.SaveGameResultResponse.encode(msg);
                common.sendResponse(responseBuffer, res);
            }
        });

        // Save ghost trail
        app.post('/method/save_ghost_trail', async (req, res) => {
            try {
                const body = wm.wm5.protobuf.RegisterGhostTrailRequest.decode(req.body) as unknown as ISaveGhostTrailRequest;

                if (body.trail) {
                    // Check if this is a crown battle trail
                    const crownBattle = await prisma.carCrownDetect.findFirst({
                        where: {
                            carId: body.trail.car.carId,
                            area: body.trail.area,
                            status: "locked"
                        }
                    });

                    // Delete existing trail for this car and area if it exists (matching crown battle status)
                    await prisma.ghostTrail.deleteMany({
                        where: {
                            carId: body.trail.car.carId,
                            area: body.trail.area,
                            crownBattle: !!crownBattle
                        }
                    });

                    // Save new trail
                    await prisma.ghostTrail.create({
                        data: {
                            carId: body.trail.car.carId,
                            area: body.trail.area,
                            ramp: body.trail.ramp || 0,
                            path: 0, // Default path value
                            trail: Buffer.from(body.trail.trail),
                            playedAt: Math.floor(Date.now() / 1000),
                            tunePower: 0,
                            tuneHandling: 0,
                            crownBattle: !!crownBattle // Mark if this is a crown battle trail
                        }
                    });
                }

                const msg = wm.wm5.protobuf.RegisterGhostTrailResponse.create({
                    error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS
                });

                const responseBuffer = wm.wm5.protobuf.RegisterGhostTrailResponse.encode(msg);
                common.sendResponse(responseBuffer, res);
            } catch (error) {
                console.error("Error in save_ghost_trail:", error);
                const msg = wm.wm5.protobuf.RegisterGhostTrailResponse.create({
                    error: wm.wm5.protobuf.ErrorCode.ERR_REQUEST
                });
                const responseBuffer = wm.wm5.protobuf.RegisterGhostTrailResponse.encode(msg);
                common.sendResponse(responseBuffer, res);
            }
        });

        // Load ghost drive data
        app.post('/method/load_ghost_drive_data', async (req, res) => {
            try {
                const body = wm.wm5.protobuf.LoadGameHistoryRequest.decode(req.body);

                // Get ghost battle records (only normal battles)
                const records = await prisma.ghostBattleRecord.findMany({
                    where: {
                        carId: body.carId,
                        crownBattle: false // Only get normal battles
                    },
                    orderBy: {
                        playedAt: 'desc'
                    },
                    take: 100,
                    include: {
                        car: true
                    }
                });

                const msg = wm.wm5.protobuf.LoadGameHistoryResponse.create({
                    error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
                    taRankingUpdatedAt: Math.floor(Date.now() / 1000),
                    ghostBattleCount: records.length,
                    ghostBattleWinCount: records.filter((r: { opponentResult: number }) => r.opponentResult === 1).length,
                    ghostHistory: records.map(record => ({
                        opponentName: "Unknown",
                        opponentModel: 0,
                        opponentVisualModel: 0,
                        opponentDefaultColor: 0,
                        opponentRegionId: 1,
                        opponentTunePower: record.opponentTunePower,
                        opponentTuneHandling: record.opponentTuneHandling,
                        area: record.area,
                        result: record.opponentResult,
                        isChallenger: false,
                        revengeLevel: 0,
                        playedAt: record.playedAt,
                        playedShopName: record.playedShopName
                    }))
                });

                const responseBuffer = wm.wm5.protobuf.LoadGameHistoryResponse.encode(msg);
                common.sendResponse(responseBuffer, res);
            } catch (error) {
                console.error("Error in load_ghost_drive_data:", error);
                const msg = wm.wm5.protobuf.LoadGameHistoryResponse.create({
                    error: wm.wm5.protobuf.ErrorCode.ERR_REQUEST,
                    taRankingUpdatedAt: Math.floor(Date.now() / 1000),
                    ghostBattleCount: 0,
                    ghostBattleWinCount: 0,
                    ghostHistory: []
                });
                const responseBuffer = wm.wm5.protobuf.LoadGameHistoryResponse.encode(msg);
                common.sendResponse(responseBuffer, res);
            }
        });

        // Ghost summary endpoint
        app.get('/resource/ghost_summary', async (req, res) => {
            try {
                // Get recent ghost trails (only normal battles)
                const trails = await prisma.ghostTrail.findMany({
                    where: {
                        crownBattle: false // Only get normal battle trails
                    },
                    orderBy: {
                        playedAt: 'desc'
                    },
                    take: 100,
                    include: {
                        car: true
                    }
                });

                const message = wm.wm5.protobuf.GhostSummary.encode(
                    wm.wm5.protobuf.GhostSummary.create({ 
                        ghosts: trails.map((trail) => ({
                            car: {
                                carId: trail.car.carId,
                                tunePower: trail.car.tunePower,
                                tuneHandling: trail.car.tuneHandling,
                                model: trail.car.model,
                                visualModel: trail.car.visualModel,
                                defaultColor: trail.car.defaultColor,
                                customColor: trail.car.customColor,
                                wheel: trail.car.wheel,
                                wheelColor: trail.car.wheelColor,
                                aero: trail.car.aero,
                                bonnet: trail.car.bonnet,
                                wing: trail.car.wing,
                                mirror: trail.car.mirror,
                                sticker: trail.car.sticker,
                                stickerColor: trail.car.stickerColor,
                                sideSticker: trail.car.sideSticker,
                                neon: trail.car.neon,
                                trunk: trail.car.trunk,
                                plate: trail.car.plate,
                                plateColor: trail.car.plateColor,
                                plateNumber: trail.car.plateNumber,
                                specialSticker: trail.car.specialSticker,
                                specialStickerColor: trail.car.specialStickerColor,
                                title: trail.car.title,
                                level: trail.car.level,
                                ghostLevel: trail.car.ghostLevel
                            },
                            area: trail.area
                        }))
                    })
                );
                common.sendResponse(message, res);
            } catch (error) {
                console.error("Error in ghost_summary:", error);
                const message = wm.wm5.protobuf.GhostSummary.encode(
                    wm.wm5.protobuf.GhostSummary.create({ 
                        ghosts: []
                    })
                );
                common.sendResponse(message, res);
            }
        });

        // Load crown ghost data
        app.post('/method/load_crown_ghost', async (req, res) => {
            try {
                const body = wm.wm5.protobuf.SaveGameResultRequest.decode(req.body);

                if (!body.rgResult) {
                    const msg = wm.wm5.protobuf.LoadGhostBattleInfoResponse.create({
                        error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
                        hasHistory: false
                    });
                    const responseBuffer = wm.wm5.protobuf.LoadGhostBattleInfoResponse.encode(msg);
                    common.sendResponse(responseBuffer, res);
                    return;
                }

                // Get crown data for the area
                const crown = await prisma.carCrown.findUnique({
                    where: {
                        area: body.rgResult.area
                    },
                    include: {
                        car: true
                    }
                });

                if (!crown) {
                    const msg = wm.wm5.protobuf.LoadGhostBattleInfoResponse.create({
                        error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
                        hasHistory: false
                    });
                    const responseBuffer = wm.wm5.protobuf.LoadGhostBattleInfoResponse.encode(msg);
                    common.sendResponse(responseBuffer, res);
                    return;
                }

                // Get the crown holder's ghost trail (only crown battle trails)
                const trail = await prisma.ghostTrail.findFirst({
                    where: {
                        carId: crown.carId,
                        area: body.rgResult.area,
                        crownBattle: true // Only get crown battle trails
                    },
                    orderBy: {
                        playedAt: 'desc'
                    }
                });

                const msg = wm.wm5.protobuf.LoadGhostBattleInfoResponse.create({
                    error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS,
                    hasHistory: trail !== null,
                    defaultOpponent: trail ? {
                        car: {
                            carId: crown.car.carId,
                            tunePower: crown.car.tunePower,
                            tuneHandling: crown.car.tuneHandling,
                            model: crown.car.model,
                            visualModel: crown.car.visualModel,
                            defaultColor: crown.car.defaultColor,
                            customColor: crown.car.customColor,
                            wheel: crown.car.wheel,
                            wheelColor: crown.car.wheelColor,
                            aero: crown.car.aero,
                            bonnet: crown.car.bonnet,
                            wing: crown.car.wing,
                            mirror: crown.car.mirror,
                            sticker: crown.car.sticker,
                            stickerColor: crown.car.stickerColor,
                            sideSticker: crown.car.sideSticker,
                            neon: crown.car.neon,
                            trunk: crown.car.trunk,
                            plate: crown.car.plate,
                            plateColor: crown.car.plateColor,
                            plateNumber: crown.car.plateNumber,
                            specialSticker: crown.car.specialSticker,
                            specialStickerColor: crown.car.specialStickerColor,
                            title: crown.car.title,
                            level: crown.car.level,
                            ghostLevel: crown.car.ghostLevel
                        },
                        area: trail.area,
                        ramp: trail.ramp,
                        nonhuman: false,
                        characterEffect: 0
                    } : undefined
                });

                const responseBuffer = wm.wm5.protobuf.LoadGhostBattleInfoResponse.encode(msg);
                common.sendResponse(responseBuffer, res);
            } catch (error) {
                console.error("Error in load_crown_ghost:", error);
                const msg = wm.wm5.protobuf.LoadGhostBattleInfoResponse.create({
                    error: wm.wm5.protobuf.ErrorCode.ERR_REQUEST,
                    hasHistory: false
                });
                const responseBuffer = wm.wm5.protobuf.LoadGhostBattleInfoResponse.encode(msg);
                common.sendResponse(responseBuffer, res);
            }
        });

        // Lock crown endpoint
        app.post('/method/lock_crown', async (req, res) => {
            try {
                const body = service.wm5.protobuf.LockCrownRequest.decode(req.body);

                // Create a crown detect entry to track the crown battle
                await prisma.carCrownDetect.create({
                    data: {
                        carId: body.carId,
                        status: "locked",
                        area: body.area,
                        ramp: 0,
                        path: 0,
                        playedAt: body.lockTime,
                        tunePower: 0,
                        tuneHandling: 0
                    }
                });

                const msg = service.wm5.protobuf.LockCrownResponse.create({
                    error: wm.wm5.protobuf.ErrorCode.ERR_SUCCESS
                });

                const responseBuffer = service.wm5.protobuf.LockCrownResponse.encode(msg);
                common.sendResponse(responseBuffer, res);
            } catch (error) {
                console.error("Error in lock_crown:", error);
                const msg = service.wm5.protobuf.LockCrownResponse.create({
                    error: wm.wm5.protobuf.ErrorCode.ERR_REQUEST
                });
                const responseBuffer = service.wm5.protobuf.LockCrownResponse.encode(msg);
                common.sendResponse(responseBuffer, res);
            }
        });
    }

    private async calculateGhostLevel(tunePower: number, tuneHandling: number): Promise<number> {
        const currentStep = tunePower + tuneHandling;

        if (currentStep >= 0 && currentStep <= 5) return 1;
        if (currentStep >= 6 && currentStep <= 10) return 2;
        if (currentStep >= 11 && currentStep <= 15) return 3;
        if (currentStep >= 16 && currentStep <= 20) return 4;
        if (currentStep >= 21 && currentStep <= 26) return 5;
        if (currentStep >= 27 && currentStep <= 28) return 6;
        if (currentStep >= 29 && currentStep <= 30) return 7;
        if (currentStep === 31) return 8;
        if (currentStep >= 32 && currentStep <= 33) return 9;
        if (currentStep === 34) return 10;
        return 1;
    }
}

// Still WIP. Might be unstable
