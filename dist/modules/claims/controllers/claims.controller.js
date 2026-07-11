"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimsController = void 0;
const response_js_1 = require("../../../common/response.js");
class ClaimsController {
    claimsService;
    constructor(claimsService) {
        this.claimsService = claimsService;
    }
    submit = async (request, reply) => {
        const claim = await this.claimsService.submit(request.user.sub, request.body);
        reply.status(201).send((0, response_js_1.success)(claim));
    };
    review = async (request, reply) => {
        const claim = await this.claimsService.review(request.params.id, request.user.sub, request.body);
        reply.send((0, response_js_1.success)(claim));
    };
    listMine = async (request, reply) => {
        const { items, meta } = await this.claimsService.listMine(request.user.sub, request.query);
        reply.send((0, response_js_1.success)(items, meta));
    };
    listAll = async (request, reply) => {
        const { items, meta } = await this.claimsService.listAll(request.query);
        reply.send((0, response_js_1.success)(items, meta));
    };
}
exports.ClaimsController = ClaimsController;
//# sourceMappingURL=claims.controller.js.map