import type { FastifyReply, FastifyRequest } from "fastify";
import { BadRequestError } from "../../../common/errors.js";
import { success } from "../../../common/response.js";
import type { UploadsService } from "../services/uploads.service.js";

export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  upload = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const file = await request.file();
    if (!file) {
      throw new BadRequestError("No file provided (multipart field name: \"file\")");
    }

    const result = await this.uploadsService.uploadImage(file.file, file.mimetype);

    if (file.file.truncated) {
      throw new BadRequestError("File exceeds the maximum allowed size");
    }

    reply.status(201).send(success(result));
  };
}
