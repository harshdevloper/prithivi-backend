"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContainer = void 0;
const users_repository_js_1 = require("./modules/users/repositories/users.repository.js");
const refresh_token_repository_js_1 = require("./modules/auth/repositories/refresh-token.repository.js");
const campaign_repository_js_1 = require("./modules/campaign/repositories/campaign.repository.js");
const claims_repository_js_1 = require("./modules/claims/repositories/claims.repository.js");
const wallet_repository_js_1 = require("./modules/wallet/repositories/wallet.repository.js");
const notifications_repository_js_1 = require("./modules/notifications/repositories/notifications.repository.js");
const analytics_repository_js_1 = require("./modules/analytics/repositories/analytics.repository.js");
const hot_offers_repository_js_1 = require("./modules/hot-offers/repositories/hot-offers.repository.js");
const settings_repository_js_1 = require("./modules/settings/repositories/settings.repository.js");
const auth_service_js_1 = require("./modules/auth/services/auth.service.js");
const users_service_js_1 = require("./modules/users/services/users.service.js");
const campaign_service_js_1 = require("./modules/campaign/services/campaign.service.js");
const claims_service_js_1 = require("./modules/claims/services/claims.service.js");
const wallet_service_js_1 = require("./modules/wallet/services/wallet.service.js");
const notifications_service_js_1 = require("./modules/notifications/services/notifications.service.js");
const analytics_service_js_1 = require("./modules/analytics/services/analytics.service.js");
const admin_service_js_1 = require("./modules/admin/services/admin.service.js");
const uploads_service_js_1 = require("./modules/uploads/services/uploads.service.js");
const hot_offers_service_js_1 = require("./modules/hot-offers/services/hot-offers.service.js");
const settings_service_js_1 = require("./modules/settings/services/settings.service.js");
const auth_controller_js_1 = require("./modules/auth/controllers/auth.controller.js");
const users_controller_js_1 = require("./modules/users/controllers/users.controller.js");
const campaign_controller_js_1 = require("./modules/campaign/controllers/campaign.controller.js");
const claims_controller_js_1 = require("./modules/claims/controllers/claims.controller.js");
const wallet_controller_js_1 = require("./modules/wallet/controllers/wallet.controller.js");
const notifications_controller_js_1 = require("./modules/notifications/controllers/notifications.controller.js");
const analytics_controller_js_1 = require("./modules/analytics/controllers/analytics.controller.js");
const admin_controller_js_1 = require("./modules/admin/controllers/admin.controller.js");
const uploads_controller_js_1 = require("./modules/uploads/controllers/uploads.controller.js");
const hot_offers_controller_js_1 = require("./modules/hot-offers/controllers/hot-offers.controller.js");
const settings_controller_js_1 = require("./modules/settings/controllers/settings.controller.js");
const notification_queue_js_1 = require("./modules/notifications/queues/notification.queue.js");
const analytics_queue_js_1 = require("./modules/analytics/queues/analytics.queue.js");
/**
 * Composition root: constructor-injected repositories -> services -> controllers.
 * Everything is built once per process against the app's shared Prisma/Redis handles.
 */
const buildContainer = (app) => {
    const prisma = app.prisma;
    // repositories
    const usersRepository = new users_repository_js_1.UsersRepository(prisma);
    const refreshTokenRepository = new refresh_token_repository_js_1.RefreshTokenRepository(prisma);
    const campaignRepository = new campaign_repository_js_1.CampaignRepository(prisma);
    const claimsRepository = new claims_repository_js_1.ClaimsRepository(prisma);
    const walletRepository = new wallet_repository_js_1.WalletRepository(prisma);
    const notificationsRepository = new notifications_repository_js_1.NotificationsRepository(prisma);
    const analyticsRepository = new analytics_repository_js_1.AnalyticsRepository(prisma);
    const hotOffersRepository = new hot_offers_repository_js_1.HotOffersRepository(prisma);
    const settingsRepository = new settings_repository_js_1.SettingsRepository(prisma);
    // queues
    const notificationQueue = (0, notification_queue_js_1.createNotificationQueue)();
    const analyticsQueue = (0, analytics_queue_js_1.createAnalyticsQueue)();
    // services
    const authService = new auth_service_js_1.AuthService(app, usersRepository, refreshTokenRepository, walletRepository);
    const usersService = new users_service_js_1.UsersService(usersRepository);
    const notificationsService = new notifications_service_js_1.NotificationsService(notificationsRepository, notificationQueue);
    const campaignService = new campaign_service_js_1.CampaignService(campaignRepository, notificationsService);
    const claimsService = new claims_service_js_1.ClaimsService(prisma, claimsRepository, campaignRepository, notificationsService);
    const walletService = new wallet_service_js_1.WalletService(walletRepository);
    const analyticsService = new analytics_service_js_1.AnalyticsService(analyticsRepository, analyticsQueue);
    const uploadsService = new uploads_service_js_1.UploadsService();
    const settingsService = new settings_service_js_1.SettingsService(settingsRepository);
    const hotOffersService = new hot_offers_service_js_1.HotOffersService(hotOffersRepository, notificationsService, settingsService);
    const adminService = new admin_service_js_1.AdminService(usersRepository, campaignRepository, claimsRepository, walletRepository, refreshTokenRepository);
    return {
        notificationQueue,
        analyticsQueue,
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
        authController: new auth_controller_js_1.AuthController(authService),
        usersController: new users_controller_js_1.UsersController(usersService),
        campaignController: new campaign_controller_js_1.CampaignController(campaignService),
        claimsController: new claims_controller_js_1.ClaimsController(claimsService),
        walletController: new wallet_controller_js_1.WalletController(walletService),
        notificationsController: new notifications_controller_js_1.NotificationsController(notificationsService),
        analyticsController: new analytics_controller_js_1.AnalyticsController(analyticsService),
        adminController: new admin_controller_js_1.AdminController(adminService),
        uploadsController: new uploads_controller_js_1.UploadsController(uploadsService),
        hotOffersController: new hot_offers_controller_js_1.HotOffersController(hotOffersService),
        settingsController: new settings_controller_js_1.SettingsController(settingsService),
    };
};
exports.buildContainer = buildContainer;
//# sourceMappingURL=container.js.map