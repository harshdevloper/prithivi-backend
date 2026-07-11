import { randomUUID } from "node:crypto";
import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import { BadRequestError } from "../../../common/errors.js";
import { env } from "../../../config/env.js";
import { UPLOADS } from "../../../config/constants.js";

export interface UploadResult {
  url: string;
  provider: "cloudinary" | "local";
  publicId?: string;
}

export class UploadsService {
  private readonly cloudinaryEnabled: boolean;

  constructor() {
    // The SDK parses CLOUDINARY_URL from the environment automatically;
    // cloudinary.config() with no overrides just confirms it took effect.
    this.cloudinaryEnabled = Boolean(env.CLOUDINARY_URL);
    if (this.cloudinaryEnabled) {
      cloudinary.config({ secure: true });
    }
  }

  async uploadImage(stream: Readable, mimeType: string): Promise<UploadResult> {
    if (!(UPLOADS.ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
      throw new BadRequestError(
        `Unsupported file type "${mimeType}". Allowed: ${UPLOADS.ALLOWED_MIME_TYPES.join(", ")}`,
      );
    }

    return this.cloudinaryEnabled
      ? this.uploadToCloudinary(stream)
      : this.uploadToDisk(stream, mimeType);
  }

  private uploadToCloudinary(stream: Readable): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: UPLOADS.CLOUDINARY_FOLDER,
          resource_type: "image",
          transformation: [{ quality: "auto", fetch_format: "auto" }],
        },
        (error, result) => {
          if (error || !result) {
            reject(new BadRequestError(error?.message ?? "Cloudinary upload failed"));
            return;
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            provider: "cloudinary",
          });
        },
      );
      stream.pipe(upload);
      stream.on("error", reject);
    });
  }

  private async uploadToDisk(stream: Readable, mimeType: string): Promise<UploadResult> {
    const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
    const filename = `${randomUUID()}.${extension}`;
    const dir = path.resolve(process.cwd(), env.UPLOADS_DIR);
    mkdirSync(dir, { recursive: true });

    await pipeline(stream, createWriteStream(path.join(dir, filename)));

    return {
      url: `${env.APP_URL}${UPLOADS.PUBLIC_PREFIX}/${filename}`,
      provider: "local",
    };
  }
}
