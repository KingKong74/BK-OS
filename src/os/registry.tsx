import type { ComponentType } from "react";
import { APP_MAP } from "./appsMeta";
import type { AppMeta } from "./types";
import { VaultApp } from "@/apps/VaultApp";
import { SettingsApp } from "@/apps/SettingsApp";
import { PlaceholderApp } from "@/apps/PlaceholderApp";
import { WebApp } from "@/components/WebApp";

/**
 * Map of appId -> component. Apps not listed here fall back to a placeholder,
 * so the shell keeps working even before every app is built.
 */
const COMPONENTS: Record<string, ComponentType> = {
  vault: VaultApp,
  settings: SettingsApp,
};

export function renderApp(appId: string) {
  const meta = APP_MAP[appId] as AppMeta | undefined;
  if (!meta) return <div style={{ padding: 24 }}>Unknown app: {appId}</div>;
  if (meta.url) return <WebApp url={meta.url} name={meta.name} />;
  const Comp = COMPONENTS[appId];
  if (Comp) return <Comp />;
  return <PlaceholderApp meta={meta} />;
}
