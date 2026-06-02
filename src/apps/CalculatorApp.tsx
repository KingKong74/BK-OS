"use client";

import { useState } from "react";

type Op = "+" | "−" | "×" | "÷" | null;

export function CalculatorApp() {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [op, setOp] = useState<Op>(null);
  const [waiting, setWaiting] = useState(false);

  const pressDigit = (d: string) => {
    if (waiting) { setDisplay(d); setWaiting(false); return; }
    setDisplay((cur) => (cur === "0" ? d : cur + d));
  };
  const pressDot = () => {
    if (waiting) { setDisplay("0."); setWaiting(false); return; }
    if (!display.includes(".")) setDisplay(display + ".");
  };
  const clearAll = () => { setDisplay("0"); setStored(null); setOp(null); setWaiting(false); };
  const toggleSign = () => setDisplay((c) => (c.startsWith("-") ? c.slice(1) : c === "0" ? c : "-" + c));
  const percent = () => setDisplay((c) => String(parseFloat(c) / 100));

  const compute = (a: number, b: number, o: Op) => {
    switch (o) {
      case "+": return a + b;
      case "−": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? NaN : a / b;
      default: return b;
    }
  };

  const pressOp = (next: Op) => {
    const cur = parseFloat(display);
    if (stored === null) {
      setStored(cur);
    } else if (!waiting) {
      const r = compute(stored, cur, op);
      setStored(r);
      setDisplay(formatNum(r));
    }
    setOp(next);
    setWaiting(true);
  };

  const pressEquals = () => {
    if (op === null || stored === null) return;
    const cur = parseFloat(display);
    const r = compute(stored, cur, op);
    setDisplay(formatNum(r));
    setStored(null);
    setOp(null);
    setWaiting(true);
  };

  const Btn = ({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) => (
    <button className={"calc-btn " + (className ?? "")} onClick={onClick}>{label}</button>
  );

  return (
    <div className="calc-app">
      <div className="calc-display">{display}</div>
      <div className="calc-keys">
        <Btn label="AC" className="k-fn" onClick={clearAll} />
        <Btn label="±" className="k-fn" onClick={toggleSign} />
        <Btn label="%" className="k-fn" onClick={percent} />
        <Btn label="÷" className="k-op" onClick={() => pressOp("÷")} />

        <Btn label="7" onClick={() => pressDigit("7")} />
        <Btn label="8" onClick={() => pressDigit("8")} />
        <Btn label="9" onClick={() => pressDigit("9")} />
        <Btn label="×" className="k-op" onClick={() => pressOp("×")} />

        <Btn label="4" onClick={() => pressDigit("4")} />
        <Btn label="5" onClick={() => pressDigit("5")} />
        <Btn label="6" onClick={() => pressDigit("6")} />
        <Btn label="−" className="k-op" onClick={() => pressOp("−")} />

        <Btn label="1" onClick={() => pressDigit("1")} />
        <Btn label="2" onClick={() => pressDigit("2")} />
        <Btn label="3" onClick={() => pressDigit("3")} />
        <Btn label="+" className="k-op" onClick={() => pressOp("+")} />

        <Btn label="0" className="k-zero" onClick={() => pressDigit("0")} />
        <Btn label="." onClick={pressDot} />
        <Btn label="=" className="k-eq" onClick={pressEquals} />
      </div>
    </div>
  );
}

function formatNum(n: number) {
  if (!isFinite(n)) return "Error";
  const s = String(n);
  if (s.length > 12) return n.toPrecision(8);
  return s;
}
