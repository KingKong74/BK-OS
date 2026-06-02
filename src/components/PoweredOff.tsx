"use client";

import { useOS } from "@/os/store";

export function PoweredOff() {
  const powerOn = useOS((s) => s.powerOn);
  return (
    <div className="powered-off" onClick={powerOn}>
      <div className="powered-off-screen">
        <div className="powered-off-message">
          It&rsquo;s now safe to turn off
          <br />
          your computer.
        </div>
        <div className="powered-off-hint">click anywhere to power on</div>
      </div>
    </div>
  );
}
