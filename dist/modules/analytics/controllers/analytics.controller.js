"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const response_js_1 = require("../../../common/response.js");
class AnalyticsController {
    analyticsService;
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    track = async (request, reply) => {
        await this.analyticsService.track(request.body, request.user?.sub);
        reply.status(202).send((0, response_js_1.success)({ accepted: true }));
    };
    summary = async (request, reply) => {
        const summary = await this.analyticsService.summary(request.query);
        reply.send((0, response_js_1.success)(summary));
    };
}
exports.AnalyticsController = AnalyticsController;
//# sourceMappingURL=analytics.controller.js.map