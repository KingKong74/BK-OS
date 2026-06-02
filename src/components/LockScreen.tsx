"use client";

import { useEffect, useState } from "react";
import { useOS } from "@/os/store";

export function LockScreen() {
  const unlock = useOS((s) => s.unlock);
  const restartPhase = useOS((s) => s.restartPhase);
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

  const isMatrix = restartPhase === "matrix";

  return (
    <div
      className={"lock-screen" + (isMatrix ? " is-matrix" : "")}
      onClick={unlock}
      role="button"
      aria-label="Unlock"
    >
      {isMatrix && <div className="lock-matrix-shell">BAILEY · LOGGED OUT</div>}
      <div className="lock-clock">{time}</div>
      <div className="lock-date">{date}</div>
      <div className="lock-hint">
        {isMatrix ? "Click anywhere to sign back in" : "Click to unlock"}
      </div>
    </div>
  );
}
