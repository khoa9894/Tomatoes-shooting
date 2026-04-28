"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamePhase = void 0;
var GamePhase;
(function (GamePhase) {
    GamePhase[GamePhase["WAITING"] = 0] = "WAITING";
    GamePhase[GamePhase["INGAME"] = 1] = "INGAME";
    GamePhase[GamePhase["ENDED"] = 2] = "ENDED";
    GamePhase[GamePhase["DRAW"] = 3] = "DRAW";
})(GamePhase || (exports.GamePhase = GamePhase = {}));
