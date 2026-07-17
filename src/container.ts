import type { FastifyInstance } from "fastify";

import { UsersRepository } from "./modules/users/repositories/users.repository.js";
import { RefreshTokenRepository } from "./modules/auth/repositories/refresh-token.repository.js";
import { CampaignRepository } from "./modules/campaign/repositories/campaign.repository.js";
import { ClaimsRepository } from "./modules/claims/repositories/claims.repository.js";
import { WalletRepository } from "./modules/wallet/repositories/wallet.repository.js";
import { NotificationsRepository } from "./modules/notifications/repositories/notifications.repository.js";
import { AnalyticsRepository } from "./modules/analytics/repositories/analytics.repository.js";
import { HotOffersRepository } from "./modules/hot-offers/repositories/hot-offers.repository.js";
import { SettingsRepository } from "./modules/settings/repositories/settings.repository.js";
import { RedemptionsRepository } from "./modules/redemptions/repositories/redemptions.repository.js";

import { AuthService } from "./modules/auth/services/auth.service.js";
import { UsersService } from "./modules/users/services/users.service.js";
import { CampaignService } from "./modules/campaign/services/campaign.service.js";
import { ClaimsService } from "./modules/claims/services/claims.service.js";
import { WalletService } from "./modules/wallet/services/wallet.service.js";
import { NotificationsService } from "./modules/notifications/services/notifications.service.js";
import { AnalyticsService } from "./modules/analytics/services/analytics.service.js";
import { AdminService } from "./modules/admin/services/admin.service.js";
import { UploadsService } from "./modules/uploads/services/uploads.service.js";
import { HotOffersService } from "./modules/hot-offers/services/hot-offers.service.js";
import { SettingsService } from "./modules/settings/services/settings.service.js";
import { RedemptionsService } from "./modules/redemptions/services/redemptions.service.js";
import { ZuelPayProvider } from "./modules/redemptions/providers/zuelpay.provider.js";
import { AppAssetsService } from "./modules/app-assets/services/app-assets.service.js";
import { MissionsService } from "./modules/missions/services/missions.service.js";
import { GameService } from "./modules/game/services/game.service.js";

import { AuthController } from "./modules/auth/controllers/auth.controller.js";
import { UsersController } from "./modules/users/controllers/users.controller.js";
import { CampaignController } from "./modules/campaign/controllers/campaign.controller.js";
import { ClaimsController } from "./modules/claims/controllers/claims.controller.js";
import { WalletController } from "./modules/wallet/controllers/wallet.controller.js";
import { NotificationsController } from "./modules/notifications/controllers/notifications.controller.js";
import { AnalyticsController } from "./modules/analytics/controllers/analytics.controller.js";
import { AdminController } from "./modules/admin/controllers/admin.controller.js";
import { UploadsController } from "./modules/uploads/controllers/uploads.controller.js";
import { HotOffersController } from "./modules/hot-offers/controllers/hot-offers.controller.js";
import { SettingsController } from "./modules/settings/controllers/settings.controller.js";
import { RedemptionsController } from "./modules/redemptions/controllers/redemptions.controller.js";
import { AppAssetsController } from "./modules/app-assets/controllers/app-assets.controller.js";
import { MissionsController } from "./modules/missions/controllers/missions.controller.js";
import { GameController } from "./modules/game/controllers/game.controller.js";
import { env } from "./config/env.js";


export interface Container {
  // queues

  // services
  authService: AuthService;
  usersService: UsersService;
  campaignService: CampaignService;
  claimsService: ClaimsService;
  walletService: WalletService;
  notificationsService: NotificationsService;
  analyticsService: AnalyticsService;
  adminService: AdminService;
  uploadsService: UploadsService;
  hotOffersService: HotOffersService;
  settingsService: SettingsService;
  redemptionsService: RedemptionsService;
  appAssetsService: AppAssetsService;
  missionsService: MissionsService;
  gameService: GameService;

  // controllers
  authController: AuthController;
  usersController: UsersController;
  campaignController: CampaignController;
  claimsController: ClaimsController;
  walletController: WalletController;
  notificationsController: NotificationsController;
  analyticsController: AnalyticsController;
  adminController: AdminController;
  uploadsController: UploadsController;
  hotOffersController: HotOffersController;
  settingsController: SettingsController;
  redemptionsController: RedemptionsController;
  appAssetsController: AppAssetsController;
  missionsController: MissionsController;
  gameController: GameController;
}

declare module "fastify" {
  interface FastifyInstance {
    di: Container;
  }
}

/**
 * Composition root: constructor-injected repositories -> services -> controllers.
 * Everything is built once per process against the app's shared Prisma/Redis handles.
 */
export const buildContainer = (app: FastifyInstance): Container => {
  const prisma = app.prisma;

  // repositories
  const usersRepository = new UsersRepository(prisma);
  const refreshTokenRepository = new RefreshTokenRepository(prisma);
  const campaignRepository = new CampaignRepository(prisma);
  const claimsRepository = new ClaimsRepository(prisma);
  const walletRepository = new WalletRepository(prisma);
  const notificationsRepository = new NotificationsRepository(prisma);
  const analyticsRepository = new AnalyticsRepository(prisma);
  const hotOffersRepository = new HotOffersRepository(prisma);
  const settingsRepository = new SettingsRepository(prisma);
  const redemptionsRepository = new RedemptionsRepository(prisma);

  // queues

  // services
  const authService = new AuthService(app, usersRepository, refreshTokenRepository, walletRepository);
  const notificationsService = new NotificationsService(notificationsRepository, app);
  const settingsService = new SettingsService(settingsRepository);
  const usersService = new UsersService(prisma, usersRepository, settingsService, notificationsService);
  const campaignService = new CampaignService(campaignRepository, notificationsService);
  const claimsService = new ClaimsService(prisma, claimsRepository, campaignRepository, notificationsService);
  const walletService = new WalletService(walletRepository);
  const analyticsService = new AnalyticsService(analyticsRepository);
  const uploadsService = new UploadsService();
  const hotOffersService = new HotOffersService(
    hotOffersRepository,
    notificationsService,
    settingsService,
  );
  // ZuelPay only when credentials exist — otherwise manual-fulfillment mode.
  const voucherProvider = env.ZUELPAY_API_KEY
    ? new ZuelPayProvider(env.ZUELPAY_BASE_URL, env.ZUELPAY_API_KEY, env.ZUELPAY_BRAND_ID)
    : null;
  const redemptionsService = new RedemptionsService(
    redemptionsRepository,
    settingsService,
    notificationsService,
    voucherProvider,
  );
  const appAssetsService = new AppAssetsService(prisma);
  const missionsService = new MissionsService(prisma, notificationsService);
  const gameService = new GameService(prisma, settingsService, notificationsService);
  const adminService = new AdminService(
    prisma,
    usersRepository,
    campaignRepository,
    claimsRepository,
    walletRepository,
    refreshTokenRepository,
  );

  return {

    authService,
    usersService,
    campaignService,
    claimsService,
    walletService,
    notificationsService,
    analyticsService,
    adminService,
    uploadsService,
    hotOffersService,
    settingsService,
    redemptionsService,
    appAssetsService,
    missionsService,
    gameService,

    authController: new AuthController(authService),
    usersController: new UsersController(usersService),
    campaignController: new CampaignController(campaignService),
    claimsController: new ClaimsController(claimsService),
    walletController: new WalletController(walletService),
    notificationsController: new NotificationsController(notificationsService),
    analyticsController: new AnalyticsController(analyticsService),
    adminController: new AdminController(adminService),
    uploadsController: new UploadsController(uploadsService),
    hotOffersController: new HotOffersController(hotOffersService),
    settingsController: new SettingsController(settingsService),
    redemptionsController: new RedemptionsController(redemptionsService),
    appAssetsController: new AppAssetsController(appAssetsService),
    missionsController: new MissionsController(missionsService),
    gameController: new GameController(gameService),
  };
};
