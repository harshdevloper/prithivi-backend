import type { Campaign, CampaignStatus, Prisma, PrismaClient } from "@prisma/client";

export class CampaignRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Prisma.CampaignUncheckedCreateInput): Promise<Campaign> {
    return this.prisma.campaign.create({ data });
  }

  findById(id: string): Promise<Campaign | null> {
    return this.prisma.campaign.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.CampaignUpdateInput): Promise<Campaign> {
    return this.prisma.campaign.update({ where: { id }, data });
  }

  list(params: {
    skip: number;
    take: number;
    status?: CampaignStatus;
  }): Promise<[Campaign[], number]> {
    const where: Prisma.CampaignWhereInput = params.status ? { status: params.status } : {};
    return Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.campaign.count({ where }),
    ]);
  }

  countByStatus(status: CampaignStatus): Promise<number> {
    return this.prisma.campaign.count({ where: { status } });
  }
}
