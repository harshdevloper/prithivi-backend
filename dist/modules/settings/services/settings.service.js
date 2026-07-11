"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const errors_js_1 = require("../../../common/errors.js");
const settings_schema_js_1 = require("../schemas/settings.schema.js");
/**
 * Reads reward-system settings with an in-memory cache (60s TTL so a
 * PM2-cluster peer picks up changes without pub/sub). Values fall back to the
 * code registry default, so a caller is never blocked by a missing row.
 */
class SettingsService {
    repo;
    cache = null;
    loadedAt = 0;
    static TTL_MS = 60_000;
    constructor(repo) {
        this.repo = repo;
    }
    async overrides() {
        if (this.cache && Date.now() - this.loadedAt < SettingsService.TTL_MS) {
            return this.cache;
        }
        const rows = await this.repo.findAll();
        this.cache = new Map(rows.map((row) => [row.key, row.value]));
        this.loadedAt = Date.now();
        return this.cache;
    }
    async raw(key) {
        const definition = settings_schema_js_1.SETTINGS_BY_KEY[key];
        if (!definition)
            throw new errors_js_1.BadRequestError(`Unknown setting "${key}"`);
        const override = (await this.overrides()).get(key);
        return override ?? definition.default;
    }
    // ---- typed getters (used by other modules) ----
    async getNumber(key) {
        const parsed = Number(await this.raw(key));
        return Number.isFinite(parsed) ? parsed : Number(settings_schema_js_1.SETTINGS_BY_KEY[key]?.default ?? 0);
    }
    async getBoolean(key) {
        return (await this.raw(key)) === "true";
    }
    async getString(key) {
        return this.raw(key);
    }
    // ---- admin ----
    async list() {
        const overrides = await this.overrides();
        return settings_schema_js_1.SETTINGS_REGISTRY.map((definition) => {
            const override = overrides.get(definition.key);
            return {
                key: definition.key,
                value: override ?? definition.default,
                type: definition.type,
                category: definition.category,
                label: definition.label,
                description: definition.description,
                isDefault: override === undefined,
            };
        });
    }
    async update(input, updatedById) {
        const entries = Object.entries(input.values).map(([key, value]) => {
            const definition = settings_schema_js_1.SETTINGS_BY_KEY[key];
            if (!definition)
                throw new errors_js_1.BadRequestError(`Unknown setting "${key}"`);
            return { key, value: this.coerce(definition, value) };
        });
        await this.repo.upsertMany(entries, updatedById);
        this.cache = null; // force reload on next read within this process
        return this.list();
    }
    /** Validate + normalize a submitted string against its declared type. */
    coerce(definition, value) {
        switch (definition.type) {
            case "BOOLEAN": {
                if (value !== "true" && value !== "false") {
                    throw new errors_js_1.BadRequestError(`"${definition.key}" must be true or false`);
                }
                return value;
            }
            case "NUMBER": {
                const parsed = Number(value);
                if (!Number.isFinite(parsed)) {
                    throw new errors_js_1.BadRequestError(`"${definition.key}" must be a number`);
                }
                if (definition.min !== undefined && parsed < definition.min) {
                    throw new errors_js_1.BadRequestError(`"${definition.key}" must be >= ${definition.min}`);
                }
                if (definition.max !== undefined && parsed > definition.max) {
                    throw new errors_js_1.BadRequestError(`"${definition.key}" must be <= ${definition.max}`);
                }
                return String(parsed);
            }
            default:
                return value.trim();
        }
    }
}
exports.SettingsService = SettingsService;
//# sourceMappingURL=settings.service.js.map