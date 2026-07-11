"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnalyticsQueue = exports.ANALYTICS_QUEUE = void 0;
const queue_js_1 = require("../../../utils/queue.js");
exports.ANALYTICS_QUEUE = "analytics";
const createAnalyticsQueue = () => (0, queue_js_1.createQueue)(exports.ANALYTICS_QUEUE);
exports.createAnalyticsQueue = createAnalyticsQueue;
//# sourceMappingURL=analytics.queue.js.map