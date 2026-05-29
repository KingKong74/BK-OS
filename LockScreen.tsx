"use client";

import { useOS } from "@/os/store";
import { Icon } from "./Icon";

export function PoweredOff() {
  const powerOn = useOS((s) => s.powerOn);
  return (
    <div className="powered-off">
      <button className="power-btn" onClick={powerOn} aria-label="Power on">
        <Icon name="power" size={40} />
      </button>
      <div className="power-text">Press to power on</div>
    </div>
  );
}
