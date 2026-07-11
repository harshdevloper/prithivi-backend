"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const response_js_1 = require("../../../common/response.js");
class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    firebaseSignIn = async (request, reply) => {
        const tokens = await this.authService.signInWithFirebaseIdToken(request.body.idToken);
        reply.send((0, response_js_1.success)(tokens));
    };
    refresh = async (request, reply) => {
        const tokens = await this.authService.refresh(request.body.refreshToken);
        reply.send((0, response_js_1.success)(tokens));
    };
    logout = async (request, reply) => {
        await this.authService.logout(request.body.refreshToken);
        reply.send((0, response_js_1.success)({ loggedOut: true }));
    };
    logoutAll = async (request, reply) => {
        await this.authService.logoutAll(request.user.sub);
        reply.send((0, response_js_1.success)({ loggedOut: true }));
    };
    me = async (request, reply) => {
        const user = await this.authService.me(request.user.sub);
        reply.send((0, response_js_1.success)(user));
    };
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map