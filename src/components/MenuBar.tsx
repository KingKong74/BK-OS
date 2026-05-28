"use client";

import { useEffect, useState } from "react";
import { useOS } from "@/os/store";
import { APP_MAP } from "@/os/appsMeta";
import { Icon } from "./Icon";

export function MenuBar() {
  const focusedId = useOS((s) => s.focusedId);
  const windows = useOS((s) => s.windows);
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 10000);
    return () => clearInterval(t);
  }, []);

  const focused = windows.find((w) => w.id === focusedId);
  const appName = focused ? APP_MAP[focused.appId]?.name : null;

  return (
    <div className="menubar">
      <div className="menubar-left">
        <span className="menubar-brand">bailey.os</span>
        {appName && <span className="menubar-app">{appName}</span>}
      </div>
      <div className="menubar-right">
        <span className="menubar-vpn" title="Private — VPN only">
          <Icon name="shield" size={15} />
        </span>
        <Icon name="wifi" size={15} />
        <span className="menubar-clock">{time}</span>
      </div>
    </div>
  );
}
