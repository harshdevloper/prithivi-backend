"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignController = void 0;
const response_js_1 = require("../../../common/response.js");
class CampaignController {
    campaignService;
    constructor(campaignService) {
        this.campaignService = campaignService;
    }
    create = async (request, reply) => {
        const campaign = await this.campaignService.create(request.user.sub, request.body);
        reply.status(201).send((0, response_js_1.success)(campaign));
    };
    update = async (request, reply) => {
        const campaign = await this.campaignService.update(request.params.id, request.body);
        reply.send((0, response_js_1.success)(campaign));
    };
    changeStatus = async (request, reply) => {
        const campaign = await this.campaignService.changeStatus(request.params.id, request.body.status);
        reply.send((0, response_js_1.success)(campaign));
    };
    getById = async (request, reply) => {
        const campaign = await this.campaignService.getById(request.params.id);
        reply.send((0, response_js_1.success)(campaign));
    };
    listActive = async (request, reply) => {
        const { items, meta } = await this.campaignService.listActive(request.query);
        reply.send((0, response_js_1.success)(items, meta));
    };
    listAll = async (request, reply) => {
        const { items, meta } = await this.campaignService.listAll(request.query, request.query.status);
        reply.send((0, response_js_1.success)(items, meta));
    };
}
exports.CampaignController = CampaignController;
//# sourceMappingURL=campaign.controller.js.map