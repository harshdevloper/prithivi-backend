"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const response_js_1 = require("../../../common/response.js");
class UsersController {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    me = async (request, reply) => {
        const profile = await this.usersService.getProfile(request.user.sub);
        reply.send((0, response_js_1.success)(profile));
    };
    updateMe = async (request, reply) => {
        const profile = await this.usersService.updateProfile(request.user.sub, request.body);
        reply.send((0, response_js_1.success)(profile));
    };
}
exports.UsersController = UsersController;
//# sourceMappingURL=users.controller.js.map