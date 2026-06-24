"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useOS } from "@/os/store";
import { Icon } from "./Icon";

const EST_WIDTH = 200;
const ITEM_H = 32;
const EDGE = 6;

export function ContextMenu() {
  const menu = useOS((s) => s.menu);
  const closeMenu = useOS((s) => s.closeMenu);
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMenu();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, closeMenu]);

  // Seed an estimate-clamped position so the first paint is already close,
  // then correct it from the real measured size before paint — no visible jump.
  useLayoutEffect(() => {
    if (!menu) { setPos(null); return; }
    const estH = menu.items.reduce((h, it) => h + (it.separator ? 9 : ITEM_H), 8);
    let x = Math.min(menu.x, window.innerWidth - EST_WIDTH - EDGE);
    let y = Math.min(menu.y, window.innerHeight - estH - EDGE);
    const el = ref.current;
    if (el) {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      // Prefer flipping to the other side of the cursor if we'd overflow.
      x = menu.x + w + EDGE > window.innerWidth ? menu.x - w : menu.x;
      y = menu.y + h + EDGE > window.innerHeight ? menu.y - h : menu.y;
      x = Math.min(x, window.innerWidth - w - EDGE);
      y = Math.min(y, window.innerHeight - h - EDGE);
    }
    setPos({ x: Math.max(EDGE, x), y: Math.max(EDGE, y) });
  }, [menu]);

  if (!menu) return null;

  return (
    <>
      <div
        className="ctx-backdrop"
        onPointerDown={closeMenu}
        onContextMenu={(e) => { e.preventDefault(); closeMenu(); }}
      />
      <div
        ref={ref}
        className="ctx-menu"
        style={{
          left: pos ? pos.x : Math.max(EDGE, Math.min(menu.x, window.innerWidth - EST_WIDTH - EDGE)),
          top: pos ? pos.y : menu.y,
          visibility: pos ? "visible" : "hidden",
        }}
        role="menu"
      >
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
