"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsService = void 0;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = require("node:stream/promises");
const cloudinary_1 = require("cloudinary");
const errors_js_1 = require("../../../common/errors.js");
const env_js_1 = require("../../../config/env.js");
const constants_js_1 = require("../../../config/constants.js");
class UploadsService {
    cloudinaryEnabled;
    constructor() {
        // The SDK parses CLOUDINARY_URL from the environment automatically;
        // cloudinary.config() with no overrides just confirms it took effect.
        this.cloudinaryEnabled = Boolean(env_js_1.env.CLOUDINARY_URL);
        if (this.cloudinaryEnabled) {
            cloudinary_1.v2.config({ secure: true });
        }
    }
    async uploadImage(stream, mimeType) {
        if (!constants_js_1.UPLOADS.ALLOWED_MIME_TYPES.includes(mimeType)) {
            throw new errors_js_1.BadRequestError(`Unsupported file type "${mimeType}". Allowed: ${constants_js_1.UPLOADS.ALLOWED_MIME_TYPES.join(", ")}`);
        }
        return this.cloudinaryEnabled
            ? this.uploadToCloudinary(stream)
            : this.uploadToDisk(stream, mimeType);
    }
    uploadToCloudinary(stream) {
        return new Promise((resolve, reject) => {
            const upload = cloudinary_1.v2.uploader.upload_stream({
                folder: constants_js_1.UPLOADS.CLOUDINARY_FOLDER,
                resource_type: "image",
                transformation: [{ quality: "auto", fetch_format: "auto" }],
            }, (error, result) => {
                if (error || !result) {
                    reject(new errors_js_1.BadRequestError(error?.message ?? "Cloudinary upload failed"));
                    return;
                }
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    provider: "cloudinary",
                });
            });
            stream.pipe(upload);
            stream.on("error", reject);
        });
    }
    async uploadToDisk(stream, mimeType) {
        const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
        const filename = `${(0, node_crypto_1.randomUUID)()}.${extension}`;
        const dir = node_path_1.default.resolve(process.cwd(), env_js_1.env.UPLOADS_DIR);
        (0, node_fs_1.mkdirSync)(dir, { recursive: true });
        await (0, promises_1.pipeline)(stream, (0, node_fs_1.createWriteStream)(node_path_1.default.join(dir, filename)));
        return {
            url: `${env_js_1.env.APP_URL}${constants_js_1.UPLOADS.PUBLIC_PREFIX}/${filename}`,
            provider: "local",
        };
    }
}
exports.UploadsService = UploadsService;
//# sourceMappingURL=uploads.service.js.map