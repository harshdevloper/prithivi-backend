import type { Prisma, PrismaClient, Role, User } from "@prisma/client";

export interface FirebaseProfile {
  firebaseUid: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export class UsersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async upsertFirebaseUser(profile: FirebaseProfile): Promise<User> {
    // Match an existing account by Firebase UID or by verified email, then link
    // the UID — so users who previously signed in via Google keep one account.
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ firebaseUid: profile.firebaseUid }, { email: profile.email }] },
    });

    if (!existing) {
      return this.prisma.user.create({
        data: {
          firebaseUid: profile.firebaseUid,
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
        },
      });
    }

    return this.prisma.user.update({
      where: { id: existing.id },
      data: {
        firebaseUid: profile.firebaseUid,
        avatarUrl: profile.avatarUrl ?? existing.avatarUrl,
      },
    });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  list(params: {
    skip: number;
    take: number;
    search?: string;
    role?: Role;
  }): Promise<[User[], number]> {
    const where: Prisma.UserWhereInput = {
      ...(params.role ? { role: params.role } : {}),
      ...(params.search
        ? {
            OR: [
              { email: { contains: params.search, mode: "insensitive" } },
              { name: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);
  }

  count(): Promise<number> {
    return this.prisma.user.count();
  }
}
