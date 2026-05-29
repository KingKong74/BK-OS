"use client";

import { useEffect } from "react";
import { useOS } from "@/os/store";
import { Icon } from "./Icon";

const EST_WIDTH = 200;
const ITEM_H = 32;

export function ContextMenu() {
  const menu = useOS((s) => s.menu);
  const closeMenu = useOS((s) => s.closeMenu);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMenu();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, closeMenu]);

  if (!menu) return null;

  const estH = menu.items.reduce((h, it) => h + (it.separator ? 9 : ITEM_H), 8);
  const x = Math.min(menu.x, window.innerWidth - EST_WIDTH - 8);
  const y = Math.min(menu.y, window.innerHeight - estH - 8);

  return (
    <>
      <div
        className="ctx-backdrop"
        onPointerDown={closeMenu}
        onContextMenu={(e) => { e.preventDefault(); closeMenu(); }}
      />
      <div className="ctx-menu" style={{ left: Math.max(4, x), top: Math.max(4, y) }} role="menu">
        {menu.items.map((it, i) =>
          it.separator ? (
            <div key={i} className="ctx-sep" />
          ) : (
            <button
              key={i}
              className={"ctx-item" + (it.danger ? " is-danger" : "")}
              disabled={it.disabled}
              onClick={() => { it.onSelect?.(); closeMenu(); }}
              role="menuitem"
            >
              <span className="ctx-icon">{it.icon && <Icon name={it.icon} size={15} />}</span>
              {it.label}
            </button>
          )
        )}
      </div>
    </>
  );
}
