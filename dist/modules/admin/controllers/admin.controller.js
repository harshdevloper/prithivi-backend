"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const response_js_1 = require("../../../common/response.js");
class AdminController {
    adminService;
    constructor(adminService) {
        this.adminService = adminService;
    }
    stats = async (_request, reply) => {
        const stats = await this.adminService.stats();
        reply.send((0, response_js_1.success)(stats));
    };
    listUsers = async (request, reply) => {
        const { items, meta } = await this.adminService.listUsers(request.query);
        reply.send((0, response_js_1.success)(items, meta));
    };
    updateUserRole = async (request, reply) => {
        const user = await this.adminService.updateUserRole(request.user.role, request.params.id, request.body.role);
        reply.send((0, response_js_1.success)(user));
    };
    updateUserStatus = async (request, reply) => {
        const user = await this.adminService.updateUserStatus(request.user.sub, request.user.role, request.params.id, request.body.isActive);
        reply.send((0, response_js_1.success)(user));
    };
}
exports.AdminController = AdminController;
//# sourceMappingURL=admin.controller.js.map