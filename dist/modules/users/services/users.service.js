"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const errors_js_1 = require("../../../common/errors.js");
const users_schema_js_1 = require("../schemas/users.schema.js");
class UsersService {
    users;
    constructor(users) {
        this.users = users;
    }
    async getProfile(userId) {
        const user = await this.users.findById(userId);
        if (!user)
            throw new errors_js_1.NotFoundError("User not found");
        return (0, users_schema_js_1.toPublicUser)(user);
    }
    async updateProfile(userId, input) {
        const user = await this.users.findById(userId);
        if (!user)
            throw new errors_js_1.NotFoundError("User not found");
        const updated = await this.users.update(userId, {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
        });
        return (0, users_schema_js_1.toPublicUser)(updated);
    }
}
exports.UsersService = UsersService;
//# sourceMappingURL=users.service.js.map