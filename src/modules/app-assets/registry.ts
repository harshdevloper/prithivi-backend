import { z } from "zod";

export interface AssetSlot {
  key: string;
  page: string;
  label: string;
  description: string;
}

/**
 * Single source of truth for in-app graphic slots. Keys are identical in the
 * Flutter app (lib/core/gfx.dart -> assets/graphics/gfx_1..8) and the admin
 * panel. The DB stores only overrides; no row means the bundled default.
 */
export const ASSET_SLOTS: readonly AssetSlot[] = [
  {
    key: "loginHero",
    page: "Login",
    label: "Login hero",
    description: "Portrait hero art on the login screen (bundled default has baked WELCOME text).",
  },
  {
    key: "homeHero",
    page: "Home",
    label: "Home hero",
    description: "Transparent promo art on the home screen.",
  },
  {
    key: "homeBanner",
    page: "Home",
    label: "Home banner",
    description:
      "Full-width banner above the Feedback Zone card on the home screen (PNG/GIF/JPG). No bundled default — leave empty to hide it.",
  },
  {
    key: "feedbackPromo",
    page: "Home",
    label: "Feedback Zone promo",
    description: "Feedback Zone card art on the home screen.",
  },
  {
    key: "walletChest",
    page: "Wallet",
    label: "Wallet chest",
    description: "Transparent treasure-chest art on the wallet screen.",
  },
  {
    key: "gamesBanner",
    page: "Games",
    label: "Games banner",
    description: "Treasure Run poster on the games screen.",
  },
  {
    key: "rewardChest",
    page: "Rewards",
    label: "Reward chest",
    description: "Warm treasure-chest card art on the rewards screen.",
  },
  {
    key: "coin",
    page: "Shared",
    label: "Coin glyph",
    description: "Gold coin glyph used across screens.",
  },
  {
    key: "gem",
    page: "Shared",
    label: "Gem glyph",
    description: "Blue diamond glyph used across screens.",
  },
  {
    key: "googleG",
    page: "Login",
    label: "Google sign-in logo",
    description: "Google 'G' logo on the login screen's sign-in button.",
  },
  {
    key: "navHome",
    page: "Navbar",
    label: "Home tab icon",
    description: "Bottom navbar Home icon; overrides the built-in glyph when set.",
  },
  {
    key: "navWallet",
    page: "Navbar",
    label: "Wallet tab icon",
    description: "Bottom navbar Wallet icon; overrides the built-in glyph when set.",
  },
  {
    key: "navExplore",
    page: "Navbar",
    label: "Explore tab icon",
    description: "Bottom navbar Explore icon; overrides the built-in glyph when set.",
  },
  {
    key: "navAlerts",
    page: "Navbar",
    label: "Alerts tab icon",
    description: "Bottom navbar Alerts icon; overrides the built-in glyph when set.",
  },
  {
    key: "navProfile",
    page: "Navbar",
    label: "Profile tab icon",
    description: "Bottom navbar Profile icon; overrides the built-in glyph when set.",
  },
  {
    key: "iconTrophy",
    page: "Shared",
    label: "Trophy glyph",
    description: "Trophy icon used across screens; overrides the built-in glyph when set.",
  },
  {
    key: "iconSpark",
    page: "Shared",
    label: "Spark glyph",
    description: "Spark/energy icon used across screens; overrides the built-in glyph when set.",
  },
] as const;

export const SLOTS_BY_KEY: Record<string, AssetSlot> = Object.fromEntries(
  ASSET_SLOTS.map((slot) => [slot.key, slot]),
);

// ---- request schemas ----

export const slotKeyParamsSchema = z.object({ key: z.string().min(1).max(64) });
export type SlotKeyParams = z.infer<typeof slotKeyParamsSchema>;

export const putAssetSchema = z.object({ imageUrl: z.string().url().max(2048) });
export type PutAssetInput = z.infer<typeof putAssetSchema>;
