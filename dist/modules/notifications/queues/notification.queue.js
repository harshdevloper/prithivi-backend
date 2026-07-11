"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_JOB_OPTIONS = exports.createNotificationQueue = exports.BROADCAST_TOPIC = exports.NOTIFICATIONS_QUEUE = void 0;
const queue_js_1 = require("../../../utils/queue.js");
exports.NOTIFICATIONS_QUEUE = "notifications";
/** FCM topic every app instance subscribes to for broadcasts. */
exports.BROADCAST_TOPIC = "all-users";
const createNotificationQueue = () => (0, queue_js_1.createQueue)(exports.NOTIFICATIONS_QUEUE);
exports.createNotificationQueue = createNotificationQueue;
exports.DEFAULT_JOB_OPTIONS = {
    attempts: 3,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: 1_000,
    removeOnFail: 5_000,
};
//# sourceMappingURL=notification.queue.js.map