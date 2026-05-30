"use client";

import { useEffect, useState } from "react";
import { useOS } from "@/os/store";

export function LockScreen() {
  const unlock = useOS((s) => s.unlock);
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setDate(d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }));
    };
    tick();
    const t = setInterval(tick, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="lock-screen" onClick={unlock} role="button" aria-label="Unlock">
      <div className="lock-clock">{time}</div>
      <div className="lock-date">{date}</div>
      <div className="lock-hint">Click to unlock</div>
    </div>
  );
}
