"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HotOffersController = void 0;
const response_js_1 = require("../../../common/response.js");
class HotOffersController {
    service;
    constructor(service) {
        this.service = service;
    }
    // ---- public ----
    listCategories = async (_request, reply) => {
        reply.send((0, response_js_1.success)(await this.service.listPublicCategories()));
    };
    getFeedbackPage = async (request, reply) => {
        reply.send((0, response_js_1.success)(await this.service.getPublicFeedbackPage(request.params.slug)));
    };
    listOffers = async (request, reply) => {
        const { items, meta } = await this.service.listPublicOffers(request.query);
        reply.send((0, response_js_1.success)(items, meta));
    };
    getOffer = async (request, reply) => {
        reply.send((0, response_js_1.success)(await this.service.getPublicOffer(request.params.slug)));
    };
    trackEvent = async (request, reply) => {
        // optionalAuth ran before this: request.user is set only for signed-in callers.
        await this.service.trackEvent(request.body, request.user?.sub);
        reply.status(202).send((0, response_js_1.success)({ tracked: true }));
    };
    // ---- admin ----
    adminListCategories = async (_request, reply) => {
        reply.send((0, response_js_1.success)(await this.service.adminListCategories()));
    };
    createCategory = async (request, reply) => {
        reply.status(201).send((0, response_js_1.success)(await this.service.createCategory(request.body)));
    };
    updateCategory = async (request, reply) => {
        reply.send((0, response_js_1.success)(await this.service.updateCategory(request.params.id, request.body)));
    };
    deleteCategory = async (request, reply) => {
        await this.service.deleteCategory(request.params.id);
        reply.send((0, response_js_1.success)({ deleted: true }));
    };
    adminGetFeedbackPage = async (request, reply) => {
        reply.send((0, response_js_1.success)(await this.service.adminGetFeedbackPage(request.params.slug)));
    };
    upsertFeedbackPage = async (request, reply) => {
        reply.send((0, response_js_1.success)(await this.service.upsertFeedbackPage(request.params.id, request.body)));
    };
    adminListOffers = async (request, reply) => {
        const { items, meta } = await this.service.adminListOffers(request.query);
        reply.send((0, response_js_1.success)(items, meta));
    };
    adminGetOffer = async (request, reply) => {
        reply.send((0, response_js_1.success)(await this.service.adminGetOffer(request.params.id)));
    };
    createOffer = async (request, reply) => {
        reply.status(201).send((0, response_js_1.success)(await this.service.createOffer(request.body)));
    };
    updateOffer = async (request, reply) => {
        reply.send((0, response_js_1.success)(await this.service.updateOffer(request.params.id, request.body)));
    };
    deleteOffer = async (request, reply) => {
        await this.service.deleteOffer(request.params.id);
        reply.send((0, response_js_1.success)({ deleted: true }));
    };
    analytics = async (request, reply) => {
        reply.send((0, response_js_1.success)(await this.service.analytics(request.query)));
    };
    fraudOverview = async (_request, reply) => {
        reply.send((0, response_js_1.success)(await this.service.fraudOverview()));
    };
    // ---- proof submissions ----
    submitProof = async (request, reply) => {
        reply
            .status(201)
            .send((0, response_js_1.success)(await this.service.submitProof(request.user.sub, request.body)));
    };
    listMySubmissions = async (request, reply) => {
        const { items, meta } = await this.service.listMySubmissions(request.user.sub, request.query);
        reply.send((0, response_js_1.success)(items, meta));
    };
    adminListSubmissions = async (request, reply) => {
        const { items, meta } = await this.service.adminListSubmissions(request.query);
        reply.send((0, response_js_1.success)(items, meta));
    };
    reviewSubmission = async (request, reply) => {
        reply.send((0, response_js_1.success)(await this.service.reviewSubmission(request.params.id, request.user.sub, request.body)));
    };
    mySubmissionForOffer = async (request, reply) => {
        reply.send((0, response_js_1.success)(await this.service.getMySubmissionForOffer(request.user.sub, request.params.id)));
    };
    cancelSubmission = async (request, reply) => {
        reply.send((0, response_js_1.success)(await this.service.cancelSubmission(request.user.sub, request.params.id)));
    };
}
exports.HotOffersController = HotOffersController;
//# sourceMappingURL=hot-offers.controller.js.map