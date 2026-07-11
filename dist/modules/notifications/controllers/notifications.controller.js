"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const response_js_1 = require("../../../common/response.js");
class NotificationsController {
    notificationsService;
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }
    listMine = async (request, reply) => {
        const { items, meta } = await this.notificationsService.listMine(request.user.sub, request.query);
        reply.send((0, response_js_1.success)(items, meta));
    };
    markRead = async (request, reply) => {
        const notification = await this.notificationsService.markRead(request.user.sub, request.params.id);
        reply.send((0, response_js_1.success)(notification));
    };
    markAllRead = async (request, reply) => {
        const result = await this.notificationsService.markAllRead(request.user.sub);
        reply.send((0, response_js_1.success)(result));
    };
    unreadCount = async (request, reply) => {
        const result = await this.notificationsService.unreadCount(request.user.sub);
        reply.send((0, response_js_1.success)(result));
    };
    registerDevice = async (request, reply) => {
        await this.notificationsService.registerDevice(request.user.sub, request.body.token, request.body.platform);
        reply.status(201).send((0, response_js_1.success)({ registered: true }));
    };
    unregisterDevice = async (request, reply) => {
        await this.notificationsService.unregisterDevice(request.body.token);
        reply.send((0, response_js_1.success)({ unregistered: true }));
    };
    send = async (request, reply) => {
        const result = await this.notificationsService.send(request.body, request.user.sub);
        reply.status(202).send((0, response_js_1.success)(result));
    };
    listHistory = async (request, reply) => {
        const { items, meta } = await this.notificationsService.listHistory(request.query);
        reply.send((0, response_js_1.success)(items, meta));
    };
}
exports.NotificationsController = NotificationsController;
//# sourceMappingURL=notifications.controller.js.map