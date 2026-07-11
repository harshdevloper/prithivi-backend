import { NotFoundError } from "../../../common/errors.js";
import type { UsersRepository } from "../repositories/users.repository.js";
import { toPublicUser, type PublicUser, type UpdateProfileInput } from "../schemas/users.schema.js";

export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("User not found");
    return toPublicUser(user);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("User not found");

    const updated = await this.users.update(userId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    });
    return toPublicUser(updated);
  }
}
