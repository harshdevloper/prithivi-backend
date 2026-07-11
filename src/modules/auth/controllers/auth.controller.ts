import type { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../../../common/response.js";
import type { AuthService } from "../services/auth.service.js";
import type { FirebaseSignInInput, RefreshTokenInput } from "../schemas/auth.schema.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  firebaseSignIn = async (
    request: FastifyRequest<{ Body: FirebaseSignInInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const tokens = await this.authService.signInWithFirebaseIdToken(request.body.idToken);
    reply.send(success(tokens));
  };

  refresh = async (
    request: FastifyRequest<{ Body: RefreshTokenInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const tokens = await this.authService.refresh(request.body.refreshToken);
    reply.send(success(tokens));
  };

  logout = async (
    request: FastifyRequest<{ Body: RefreshTokenInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.authService.logout(request.body.refreshToken);
    reply.send(success({ loggedOut: true }));
  };

  logoutAll = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await this.authService.logoutAll(request.user.sub);
    reply.send(success({ loggedOut: true }));
  };

  me = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = await this.authService.me(request.user.sub);
    reply.send(success(user));
  };
}
