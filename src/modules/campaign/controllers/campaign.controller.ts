import type { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../../../common/response.js";
import type { CampaignService } from "../services/campaign.service.js";
import type {
  CampaignIdParams,
  ChangeCampaignStatusInput,
  CreateCampaignInput,
  ListCampaignsQuery,
  UpdateCampaignInput,
} from "../schemas/campaign.schema.js";

export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  create = async (
    request: FastifyRequest<{ Body: CreateCampaignInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const campaign = await this.campaignService.create(request.user.sub, request.body);
    reply.status(201).send(success(campaign));
  };

  update = async (
    request: FastifyRequest<{ Params: CampaignIdParams; Body: UpdateCampaignInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const campaign = await this.campaignService.update(request.params.id, request.body);
    reply.send(success(campaign));
  };

  changeStatus = async (
    request: FastifyRequest<{ Params: CampaignIdParams; Body: ChangeCampaignStatusInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const campaign = await this.campaignService.changeStatus(
      request.params.id,
      request.body.status,
    );
    reply.send(success(campaign));
  };

  getById = async (
    request: FastifyRequest<{ Params: CampaignIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const campaign = await this.campaignService.getById(request.params.id);
    reply.send(success(campaign));
  };

  listActive = async (
    request: FastifyRequest<{ Querystring: ListCampaignsQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { items, meta } = await this.campaignService.listActive(request.query);
    reply.send(success(items, meta));
  };

  listAll = async (
    request: FastifyRequest<{ Querystring: ListCampaignsQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { items, meta } = await this.campaignService.listAll(request.query, request.query.status);
    reply.send(success(items, meta));
  };
}
