"use client";

import { useState } from "react";

type Suit = "♠" | "♥" | "♦" | "♣";
const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const colorOf = (s: Suit) => (s === "♥" || s === "♦" ? "red" : "black");

interface Card { id: number; rank: number; suit: Suit; }
type Sel = { area: "cell" | "tab"; index: number } | null;

function newDeck(): Card[] {
  const cards: Card[] = [];
  let id = 0;
  for (const s of SUITS) for (let r = 1; r <= 13; r++) cards.push({ id: id++, rank: r, suit: s });
  return cards;
}
function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function deal(): Card[][] {
  const d = shuffle(newDeck());
  const t: Card[][] = [[], [], [], [], [], [], [], []];
  for (let i = 0; i < d.length; i++) t[i % 8].push(d[i]);
  return t;
}

function CardView({ card, selected }: { card: Card; selected?: boolean }) {
  return (
    <div className={"fc-card " + colorOf(card.suit) + (selected ? " is-selected" : "")}>
      <span className="fc-rank">{RANKS[card.rank - 1]}</span>
      <span className="fc-suit">{card.suit}</span>
    </div>
  );
}

export function FreeCellApp() {
  const [cells, setCells] = useState<(Card | null)[]>([null, null, null, null]);
  const [foundations, setFoundations] = useState<Card[][]>([[], [], [], []]);
  const [tableau, setTableau] = useState<Card[][]>(deal);
  const [selected, setSelected] = useState<Sel>(null);
  const [moves, setMoves] = useState(0);

  const newGame = () => {
    setCells([null, null, null, null]);
    setFoundations([[], [], [], []]);
    setTableau(deal());
    setSelected(null);
    setMoves(0);
  };

  const getSelectedCard = (): Card | null => {
    if (!selected) return null;
    if (selected.area === "cell") return cells[selected.index];
    const col = tableau[selected.index];
    return col.length ? col[col.length - 1] : null;
  };
  const sel = getSelectedCard();

  const removeSelected = (next: { cells?: (Card | null)[]; tableau?: Card[][] } = {}) => {
    if (!selected) return next;
    if (selected.area === "cell") {
      const nc = next.cells ?? [...cells];
      nc[selected.index] = null;
      next.cells = nc;
    } else {
      const nt = next.tableau ?? tableau.map((c) => [...c]);
      nt[selected.index] = nt[selected.index].slice(0, -1);
      next.tableau = nt;
    }
    return next;
  };

  const commit = (delta: { cells?: (Card | null)[]; foundations?: Card[][]; tableau?: Card[][] }) => {
    if (delta.cells) setCells(delta.cells);
    if (delta.foundations) setFoundations(delta.foundations);
    if (delta.tableau) setTableau(delta.tableau);
    setSelected(null);
    setMoves((m) => m + 1);
  };

  const tryMoveToCell = (idx: number) => {
    const c = getSelectedCard();
    if (!c || cells[idx] !== null) return;
    const delta = removeSelected({});
    const nc = delta.cells ?? [...cells];
    nc[idx] = c;
    commit({ ...delta, cells: nc });
  };
  const tryMoveToFoundation = (idx: number) => {
    const c = getSelectedCard();
    if (!c || c.suit !== SUITS[idx]) return;
    const pile = foundations[idx];
    const ok = pile.length === 0 ? c.rank === 1 : c.rank === pile[pile.length - 1].rank + 1;
    if (!ok) return;
    const delta = removeSelected({});
    const nf = foundations.map((p, i) => (i === idx ? [...p, c] : p));
    commit({ ...delta, foundations: nf });
  };
  const tryMoveToTableau = (col: number) => {
    const c = getSelectedCard();
    if (!c) return;
    const dest = tableau[col];
    const ok =
      dest.length === 0 ||
      (dest[dest.length - 1].rank === c.rank + 1 &&
        colorOf(dest[dest.length - 1].suit) !== colorOf(c.suit));
    if (!ok) return;
    const delta = removeSelected({});
    const nt = (delta.tableau ?? tableau.map((p) => [...p])).map((p, i) =>
      i === col ? [...p, c] : p
    );
    commit({ ...delta, tableau: nt });
  };

  const onSelectCell = (idx: number) => {
    if (cells[idx] === null) { if (selected) tryMoveToCell(idx); return; }
    if (selected?.area === "cell" && selected.index === idx) { setSelected(null); return; }
    setSelected({ area: "cell", index: idx });
  };
  const onSelectFnd = (idx: number) => { if (selected) tryMoveToFoundation(idx); };
  const onSelectTab = (col: number) => {
    if (selected) {
      if (selected.area === "tab" && selected.index === col) { setSelected(null); return; }
      tryMoveToTableau(col);
      return;
    }
    if (tableau[col].length === 0) return;
    setSelected({ area: "tab", index: col });
  };

  const won = foundations.every((p) => p.length === 13);

  return (
    <div className="fc-app">
      <div className="fc-toolbar">
        <button onClick={newGame}>New game</button>
        <span className="fc-moves">Moves: {moves}</span>
        {won && <span className="fc-win">You won!</span>}
        <span className="fc-help">Click a card to select, click destination to move</span>
      </div>
      <div className="fc-top">
        <div className="fc-cells">
          {cells.map((c, i) => (
            <div key={i} className="fc-slot" onClick={() => onSelectCell(i)}>
              {c ? <CardView card={c} selected={sel?.id === c.id} /> : <span className="fc-slot-label">free</span>}
            </div>
          ))}
        </div>
        <div className="fc-fnds">
          {foundations.map((p, i) => {
            const top = p[p.length - 1];
            return (
              <div key={i} className="fc-slot" onClick={() => onSelectFnd(i)}>
                {top ? <CardView card={top} /> : <span className={"fc-slot-label fc-" + colorOf(SUITS[i])}>{SUITS[i]}</span>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="fc-tableau">
        {tableau.map((col, i) => (
          <div key={i} className="fc-col" onClick={() => onSelectTab(i)}>
            {col.length === 0 ? (
              <div className="fc-slot fc-col-empty"><span className="fc-slot-label">—</span></div>
            ) : (
              col.map((c, j) => (
                <div key={c.id} className="fc-card-wrap" style={{ marginTop: j === 0 ? 0 : -28 }}>
                  <CardView card={c} selected={j === col.length - 1 && sel?.id === c.id} />
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
