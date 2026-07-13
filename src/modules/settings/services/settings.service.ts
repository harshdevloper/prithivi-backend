import { BadRequestError } from "../../../common/errors.js";
import type { SettingsRepository } from "../repositories/settings.repository.js";
import {
  SETTINGS_BY_KEY,
  SETTINGS_REGISTRY,
  type SettingDefinition,
  type SettingDto,
  type UpdateSettingsInput,
} from "../schemas/settings.schema.js";

/**
 * Reads reward-system settings with an in-memory cache (60s TTL so a
 * PM2-cluster peer picks up changes without pub/sub). Values fall back to the
 * code registry default, so a caller is never blocked by a missing row.
 */
export class SettingsService {
  private cache: Map<string, string> | null = null;
  private loadedAt = 0;
  private static readonly TTL_MS = 60_000;

  constructor(private readonly repo: SettingsRepository) {}

  private async overrides(): Promise<Map<string, string>> {
    if (this.cache && Date.now() - this.loadedAt < SettingsService.TTL_MS) {
      return this.cache;
    }
    const rows = await this.repo.findAll();
    this.cache = new Map(rows.map((row) => [row.key, row.value]));
    this.loadedAt = Date.now();
    return this.cache;
  }

  private async raw(key: string): Promise<string> {
    const definition = SETTINGS_BY_KEY[key];
    if (!definition) throw new BadRequestError(`Unknown setting "${key}"`);
    const override = (await this.overrides()).get(key);
    return override ?? definition.default;
  }

  // ---- typed getters (used by other modules) ----

  async getNumber(key: string): Promise<number> {
    const parsed = Number(await this.raw(key));
    return Number.isFinite(parsed) ? parsed : Number(SETTINGS_BY_KEY[key]?.default ?? 0);
  }

  async getBoolean(key: string): Promise<boolean> {
    return (await this.raw(key)) === "true";
  }

  async getString(key: string): Promise<string> {
    return this.raw(key);
  }

  // ---- admin ----

  async list(): Promise<SettingDto[]> {
    const overrides = await this.overrides();
    return SETTINGS_REGISTRY.map((definition) => {
      const override = overrides.get(definition.key);
      return {
        key: definition.key,
        value: override ?? definition.default,
        type: definition.type,
        category: definition.category,
        label: definition.label,
        description: definition.description,
        isDefault: override === undefined,
      } satisfies SettingDto;
    });
  }

  async update(input: UpdateSettingsInput, updatedById: string | undefined): Promise<SettingDto[]> {
    const entries = Object.entries(input.values).map(([key, value]) => {
      const definition = SETTINGS_BY_KEY[key];
      if (!definition) throw new BadRequestError(`Unknown setting "${key}"`);
      return { key, value: this.coerce(definition, value) };
    });

    await this.repo.upsertMany(entries, updatedById);
    this.cache = null; // force reload on next read within this process
    return this.list();
  }

  /** Validate + normalize a submitted string against its declared type. */
  private coerce(definition: SettingDefinition, value: string): string {
    switch (definition.type) {
      case "BOOLEAN": {
        if (value !== "true" && value !== "false") {
          throw new BadRequestError(`"${definition.key}" must be true or false`);
        }
        return value;
      }
      case "NUMBER": {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
          throw new BadRequestError(`"${definition.key}" must be a number`);
        }
        if (definition.min !== undefined && parsed < definition.min) {
          throw new BadRequestError(`"${definition.key}" must be >= ${definition.min}`);
        }
        if (definition.max !== undefined && parsed > definition.max) {
          throw new BadRequestError(`"${definition.key}" must be <= ${definition.max}`);
        }
        return String(parsed);
      }
      default: {
        const trimmed = value.trim();
        if (definition.enum && !definition.enum.includes(trimmed)) {
          throw new BadRequestError(
            `"${definition.key}" must be one of: ${definition.enum.join(", ")}`,
          );
        }
        return trimmed;
      }
    }
  }
}
