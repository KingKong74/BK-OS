"use client";

import { getClientMode } from "@/lib/mode";

/**
 * Banner shown only on the public demo instance. Reminds visitors that
 * their data is sandboxed and points to the real Bailey King at bkos.dev.
 */
export function PublicBanner() {
  const mode = getClientMode();
  if (mode !== "public") return null;
  return (
    <div className="public-mode-banner">
      <strong>BK-OS public demo.</strong>{" "}
      Have a poke around — everything saves to your account. Want to see the real one?{" "}
      <a href="https://bkos.dev" target="_blank" rel="noopener noreferrer">bkos.dev</a>
    </div>
  );
}
