"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
const response_js_1 = require("../../../common/response.js");
class WalletController {
    walletService;
    constructor(walletService) {
        this.walletService = walletService;
    }
    myWallet = async (request, reply) => {
        const wallet = await this.walletService.getMyWallet(request.user.sub);
        reply.send((0, response_js_1.success)(wallet));
    };
    mySummary = async (request, reply) => {
        reply.send((0, response_js_1.success)(await this.walletService.getMySummary(request.user.sub)));
    };
    myTransactions = async (request, reply) => {
        const { items, meta } = await this.walletService.getMyTransactions(request.user.sub, request.query);
        reply.send((0, response_js_1.success)(items, meta));
    };
}
exports.WalletController = WalletController;
//# sourceMappingURL=wallet.controller.js.map