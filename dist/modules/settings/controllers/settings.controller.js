"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsController = void 0;
const response_js_1 = require("../../../common/response.js");
class SettingsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list = async (_request, reply) => {
        reply.send((0, response_js_1.success)(await this.service.list()));
    };
    update = async (request, reply) => {
        reply.send((0, response_js_1.success)(await this.service.update(request.body, request.user.sub)));
    };
}
exports.SettingsController = SettingsController;
//# sourceMappingURL=settings.controller.js.map