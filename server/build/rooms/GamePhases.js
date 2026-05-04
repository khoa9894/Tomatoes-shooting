"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamePhase = void 0;
var GamePhase;
(function (GamePhase) {
    GamePhase[GamePhase["WAITING"] = 0] = "WAITING";
    GamePhase[GamePhase["INGAME"] = 1] = "INGAME";
    GamePhase[GamePhase["ENDED"] = 2] = "ENDED";
    GamePhase[GamePhase["DRAW"] = 3] = "DRAW";
    GamePhase[GamePhase["WAITING_FOR_BUBBLE_CLEAR"] = 4] = "WAITING_FOR_BUBBLE_CLEAR";
})(GamePhase || (exports.GamePhase = GamePhase = {}));
