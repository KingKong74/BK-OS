import { Icon } from "@/components/Icon";
import type { AppMeta } from "@/os/types";

export function PlaceholderApp({ meta }: { meta: AppMeta }) {
  return (
    <div className="placeholder-app">
      <div className="placeholder-icon" style={{ background: meta.accent, color: meta.accentFg }}>
        <Icon name={meta.icon} size={30} />
      </div>
      <h2>{meta.name}</h2>
      <p>This app hasn&apos;t been built yet. The OS shell is ready — drop the real {meta.name.toLowerCase()} interface in here when you build it.</p>
    </div>
  );
}
