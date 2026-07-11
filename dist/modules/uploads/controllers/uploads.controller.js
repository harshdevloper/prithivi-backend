"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsController = void 0;
const errors_js_1 = require("../../../common/errors.js");
const response_js_1 = require("../../../common/response.js");
class UploadsController {
    uploadsService;
    constructor(uploadsService) {
        this.uploadsService = uploadsService;
    }
    upload = async (request, reply) => {
        const file = await request.file();
        if (!file) {
            throw new errors_js_1.BadRequestError("No file provided (multipart field name: \"file\")");
        }
        const result = await this.uploadsService.uploadImage(file.file, file.mimetype);
        if (file.file.truncated) {
            throw new errors_js_1.BadRequestError("File exceeds the maximum allowed size");
        }
        reply.status(201).send((0, response_js_1.success)(result));
    };
}
exports.UploadsController = UploadsController;
//# sourceMappingURL=uploads.controller.js.map