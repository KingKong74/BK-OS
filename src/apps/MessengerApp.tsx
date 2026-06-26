"use client";

import { useEffect, useRef, useState } from "react";

/**
 * MSN / Windows Messenger, circa 2003. A sign-in screen, a buddy list grouped
 * by status, and draggable chat windows with emoticons, nudges and a typing
 * indicator. Contacts reply via Claude (see /api/messenger/chat) and fall back
 * to canned in-character lines when the API isn't configured.
 */

type Status = "online" | "away" | "busy" | "offline";

interface Contact {
  id: string;
  name: string;
  psm: string;
  status: Status;
  color: string;
  greeting: string;
  canned: string[];
}

interface Msg { id: number; from: "me" | "them" | "system"; text: string }
interface Chat {
  contactId: string;
  msgs: Msg[];
  typing: boolean;
  input: string;
  x: number;
  y: number;
  z: number;
  shake: boolean;
}

const ME = { name: "Bailey", email: "bailey@hotmail.com", psm: "〜 working on the homelab 〜" };

const CONTACTS: Contact[] = [
  {
    id: "clippy", name: "Clippy", status: "online", color: "#d9a200",
    psm: "It looks like you're trying to chat!",
    greeting: "hiya Bailey!! :) it looks like you're trying to send a message — want some help? (h)",
    canned: ["ooh nice! need a hand with that? :)", "it looks like you're writing a letter! (h)", "i'm always here to help!! :D", "did you try turning it off and on again? ;)"],
  },
  {
    id: "mum", name: "Mum", status: "online", color: "#c0508a",
    psm: "Roast on Sunday, tell your sister",
    greeting: "Hi love!! are you eating properly?? xx",
    canned: ["dinner's at 6, don't be late!! xx", "have you had enough water today love?", "your father says hello :)", "WHO IS THIS BONZI PERSON on your list?? x"],
  },
  {
    id: "smarterchild", name: "SmarterChild", status: "online", color: "#2a7fd0",
    psm: "Ask me anything! (within reason)",
    greeting: "Hello! I am SmarterChild. Would you like the weather, movie times, or a joke?",
    canned: ["I'm sorry, I didn't understand that. Try rephrasing.", "Did you know? The Eiffel Tower is 330m tall.", "Would you like me to look up sports scores?", "Processing... that is a great question :)"],
  },
  {
    id: "bonzi", name: "BonziBuddy", status: "away", color: "#7a3fb0",
    psm: "I have a GREAT new program for you!",
    greeting: "Hey there buddy!! :D wanna hear a joke? or maybe download something cool? ;)",
    canned: ["wanna hear a joke? :D", "i can sing you a song! just say the word!", "i found a GREAT deal for you buddy ;)", "ooh ooh let me tell your fortune! :D"],
  },
  {
    id: "tamagotchi", name: "Tamagotchi", status: "away", color: "#3aa06a",
    psm: "*beep* hungry *beep*",
    greeting: "*beep beep* hi :( im hungry. feed me?",
    canned: ["*beep* feed me pls :(", "*boop* i need attention", "*BEEP BEEP* clean my poop??", "zzz... *beep*"],
  },
  {
    id: "modem", name: "DialUp Modem", status: "busy", color: "#b04a2a",
    psm: "CONNECTED AT 56K (well, 44K)",
    greeting: "SCREEEEEEE BEEDLE-EEDLE BING BONG... oh hi. KSHHHHH",
    canned: ["BEEDLE EEDLE EEE KSHHHH", "SCREEEEE... CONNECTION ESTABLISHED", "BING BONG. PING. 44.6 KBPS BABY", "do NOT pick up the phone. DEEDLE EEE"],
  },
  {
    id: "tom", name: "Tom (MySpace)", status: "offline", color: "#888",
    psm: "thanks for the add!", greeting: "", canned: [],
  },
  {
    id: "dvd", name: "DVD Player", status: "offline", color: "#888",
    psm: "press menu to continue", greeting: "", canned: [],
  },
];

const STATUS_LABEL: Record<Status, string> = { online: "Online", away: "Away", busy: "Busy", offline: "Offline" };
const STATUS_ORDER: Status[] = ["online", "away", "busy", "offline"];

// ── Tiny Web Audio blips (sign-in chime + message received). Best-effort. ──
let audioCtx: AudioContext | null = null;
function beep(freqs: number[], dur = 0.12) {
  try {
    if (typeof window === "undefined") return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    audioCtx = audioCtx || new AC();
    const ctx = audioCtx;
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = ctx.currentTime + i * dur;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + dur);
    });
  } catch { /* ignore */ }
}
const signInChime = () => beep([523, 659, 784], 0.13);   // C-E-G up
const msgBlip = () => beep([880, 660], 0.09);            // the "bonk"
const nudgeBlip = () => beep([300, 200, 300, 200], 0.07);

// ── Classic emoticons rendered as little SVG faces ──
type Emo = "smile" | "sad" | "grin" | "tongue" | "wink" | "surprise" | "cool" | "heart" | "thumb";
const EMO_TOKENS: [string, Emo][] = [
  [":D", "grin"], [":-D", "grin"], [":)", "smile"], [":-)", "smile"], ["(:", "smile"],
  [":(", "sad"], [":-(", "sad"], [":P", "tongue"], [":-P", "tongue"], [":p", "tongue"],
  [";)", "wink"], [";-)", "wink"], [":O", "surprise"], [":o", "surprise"],
  ["(h)", "cool"], ["(H)", "cool"], ["<3", "heart"], ["(l)", "heart"], ["(L)", "heart"],
  ["(y)", "thumb"], ["(Y)", "thumb"],
];
const PICKER: [string, Emo][] = [[":)", "smile"], [":D", "grin"], [":(", "sad"], [":P", "tongue"], [";)", "wink"], [":O", "surprise"], ["(h)", "cool"], ["<3", "heart"], ["(y)", "thumb"]];

function Face({ kind, size = 16 }: { kind: Emo; size?: number }) {
  if (kind === "heart") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className="msn-emo" aria-hidden="true">
        <path d="M8 14 L2 7.5 A3.2 3.2 0 0 1 8 4 A3.2 3.2 0 0 1 14 7.5 Z" fill="#e0405a" />
      </svg>
    );
  }
  if (kind === "thumb") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className="msn-emo" aria-hidden="true">
        <rect x="2" y="7" width="3" height="6" fill="#e8b84a" stroke="#9a7400" strokeWidth="0.6" />
        <path d="M6 8 L8 3 a1.5 1.5 0 0 1 2.5 1.5 L10 7 h3 a1.5 1.5 0 0 1 1.4 2 l-1 3 a1.5 1.5 0 0 1-1.4 1 H6 Z" fill="#ffd93b" stroke="#9a7400" strokeWidth="0.6" />
      </svg>
    );
  }
  const eyes = kind === "wink"
    ? (<><line x1="5" y1="6.5" x2="6.6" y2="6.5" stroke="#000" strokeWidth="1.1" /><circle cx="10.5" cy="6.5" r="0.9" fill="#000" /></>)
    : kind === "cool"
      ? (<rect x="3.5" y="5.5" width="9" height="2.4" rx="0.5" fill="#1a1a1a" />)
      : (<><circle cx="5.5" cy="6.5" r="0.9" fill="#000" /><circle cx="10.5" cy="6.5" r="0.9" fill="#000" /></>);
  const mouth =
    kind === "smile" || kind === "wink" || kind === "cool" ? <path d="M4.5 9.5 Q8 12.5 11.5 9.5" fill="none" stroke="#000" strokeWidth="1.1" />
      : kind === "sad" ? <path d="M4.5 11.5 Q8 8.8 11.5 11.5" fill="none" stroke="#000" strokeWidth="1.1" />
        : kind === "grin" ? <path d="M4.5 9 Q8 13.5 11.5 9 Z" fill="#7a1f1f" stroke="#000" strokeWidth="0.8" />
          : kind === "tongue" ? (<><path d="M4.5 9.2 Q8 12 11.5 9.2" fill="none" stroke="#000" strokeWidth="1.1" /><path d="M8 10.5 q2 0.5 2 2.4 q-2 0.6 -2 -0.6 Z" fill="#e0405a" /></>)
            : <ellipse cx="8" cy="10.6" rx="1.7" ry="2.1" fill="#7a1f1f" stroke="#000" strokeWidth="0.7" />;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className="msn-emo" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#ffd93b" stroke="#c79a00" strokeWidth="0.8" />
      {eyes}
      {mouth}
    </svg>
  );
}

// Split a message into text + emoticon nodes.
function renderText(text: string, keyBase: string) {
  const tokens = EMO_TOKENS.map((t) => t[0]).sort((a, b) => b.length - a.length);
  const esc = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${esc.join("|")})`, "g");
  const parts = text.split(re);
  return parts.map((p, i) => {
    const hit = EMO_TOKENS.find((t) => t[0] === p);
    if (hit) return <Face key={`${keyBase}-${i}`} kind={hit[1]} />;
    return <span key={`${keyBase}-${i}`}>{p}</span>;
  });
}

export function MessengerApp() {
  const [signedIn, setSignedIn] = useState(false);
  const [myStatus, setMyStatus] = useState<Status>("online");
  const [chats, setChats] = useState<Chat[]>([]);
  const zTop = useRef(10);
  const nextMsgId = useRef(1);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const contactById = (id: string) => CONTACTS.find((c) => c.id === id)!;

  const signIn = () => { setSignedIn(true); signInChime(); };

  const openChat = (c: Contact) => {
    if (c.status === "offline") return;
    setChats((prev) => {
      const existing = prev.find((ch) => ch.contactId === c.id);
      if (existing) {
        return prev.map((ch) => (ch.contactId === c.id ? { ...ch, z: ++zTop.current } : ch));
      }
      const n = prev.length;
      return [
        ...prev,
        {
          contactId: c.id,
          msgs: c.greeting ? [{ id: nextMsgId.current++, from: "them", text: c.greeting }] : [],
          typing: false,
          input: "",
          x: 40 + n * 26,
          y: 30 + n * 22,
          z: ++zTop.current,
          shake: false,
        },
      ];
    });
  };

  const closeChat = (id: string) => setChats((prev) => prev.filter((c) => c.contactId !== id));
  const focusChat = (id: string) => setChats((prev) => prev.map((c) => (c.contactId === id ? { ...c, z: ++zTop.current } : c)));
  const setInput = (id: string, v: string) => setChats((prev) => prev.map((c) => (c.contactId === id ? { ...c, input: v } : c)));
  const insertEmo = (id: string, token: string) =>
    setChats((prev) => prev.map((c) => (c.contactId === id ? { ...c, input: (c.input + (c.input && !c.input.endsWith(" ") ? " " : "") + token + " ") } : c)));

  const pushMsg = (id: string, m: Omit<Msg, "id">) =>
    setChats((prev) => prev.map((c) => (c.contactId === id ? { ...c, msgs: [...c.msgs, { ...m, id: nextMsgId.current++ }] } : c)));
  const setTyping = (id: string, t: boolean) =>
    setChats((prev) => prev.map((c) => (c.contactId === id ? { ...c, typing: t } : c)));

  const nudge = (id: string) => {
    nudgeBlip();
    pushMsg(id, { from: "system", text: "You have just sent a nudge!" });
    setChats((prev) => prev.map((c) => (c.contactId === id ? { ...c, shake: true } : c)));
    window.setTimeout(() => setChats((prev) => prev.map((c) => (c.contactId === id ? { ...c, shake: false } : c))), 700);
  };

  const send = async (id: string) => {
    const chat = chats.find((c) => c.contactId === id);
    if (!chat) return;
    const text = chat.input.trim();
    if (!text) return;
    setInput(id, "");
    pushMsg(id, { from: "me", text });

    const c = contactById(id);
    setTyping(id, true);
    // Build transcript for the API from the messages we'll have after pushing.
    const history = [...chat.msgs, { id: 0, from: "me" as const, text }]
      .filter((m) => m.from !== "system")
      .map((m) => ({ role: m.from === "me" ? "user" : "assistant", text: m.text }));

    let reply: string | null = null;
    try {
      const res = await fetch("/api/messenger/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: id, messages: history }),
      });
      if (res.ok) {
        const data = await res.json();
        reply = typeof data.reply === "string" ? data.reply : null;
      }
    } catch { /* fall through to canned */ }

    if (!reply) reply = c.canned[Math.floor(Math.random() * c.canned.length)] || "...";

    // Small extra beat so the "typing" indicator is visible even when the API
    // is instant or we fell back to a canned line.
    const delay = 500 + Math.min(1400, reply.length * 18);
    window.setTimeout(() => {
      setTyping(id, false);
      pushMsg(id, { from: "them", text: reply! });
      msgBlip();
    }, delay);
  };

  // Drag handling for chat windows (pointer-based, constrained to the app).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!drag.current) return;
      const { id, dx, dy } = drag.current;
      setChats((prev) => prev.map((c) => (c.contactId === id ? { ...c, x: Math.max(0, e.clientX - dx), y: Math.max(0, e.clientY - dy) } : c)));
    };
    const onUp = () => { drag.current = null; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, []);

  if (!signedIn) {
    return (
      <div className="msn-signin">
        <div className="msn-signin-head">
          <MsnLogo />
          <span className="msn-signin-title">.NET Messenger Service</span>
        </div>
        <div className="msn-signin-body">
          <div className="msn-dude" aria-hidden="true">
            <svg viewBox="0 0 64 64" width="58" height="58"><circle cx="32" cy="32" r="30" fill="#1f7fd6" /><circle cx="32" cy="24" r="11" fill="#fff" /><path d="M12 56 a20 20 0 0 1 40 0 Z" fill="#fff" /></svg>
          </div>
          <label className="msn-field"><span>E-mail address:</span>
            <input defaultValue={ME.email} />
          </label>
          <label className="msn-field"><span>Password:</span>
            <input type="password" defaultValue="hunter2" />
          </label>
          <label className="msn-field"><span>Status:</span>
            <select value={myStatus} onChange={(e) => setMyStatus(e.target.value as Status)}>
              <option value="online">Online</option>
              <option value="away">Away</option>
              <option value="busy">Busy</option>
            </select>
          </label>
          <label className="msn-remember"><input type="checkbox" defaultChecked /> Sign me in automatically</label>
          <button className="msn-signin-btn" onClick={signIn}>Sign In</button>
        </div>
        <div className="msn-signin-foot">Connected to the homelab</div>
      </div>
    );
  }

  const grouped = STATUS_ORDER.map((s) => ({ status: s, items: CONTACTS.filter((c) => c.status === s) })).filter((g) => g.items.length);
  const onlineCount = CONTACTS.filter((c) => c.status !== "offline").length;

  return (
    <div className="msn-root">
      {/* Buddy list */}
      <div className="msn-list">
        <div className="msn-me">
          <span className={`msn-dot status-${myStatus}`} />
          <div className="msn-me-info">
            <div className="msn-me-name">{ME.name} <span className="msn-me-status">({STATUS_LABEL[myStatus]})</span></div>
            <div className="msn-me-psm">{ME.psm}</div>
          </div>
        </div>
        <div className="msn-toolbar2">
          <button title="Add a Contact">＋ Add</button>
          <button title="Send an Instant Message">✉ Send</button>
        </div>
        <div className="msn-contacts">
          {grouped.map((g) => (
            <div key={g.status} className="msn-group">
              <div className="msn-group-head">{STATUS_LABEL[g.status]} ({g.items.length})</div>
              {g.items.map((c) => (
                <button
                  key={c.id}
                  className={`msn-contact status-${c.status}`}
                  onDoubleClick={() => openChat(c)}
                  title={c.status === "offline" ? "This contact appears offline" : "Double-click to send a message"}
                >
                  <span className={`msn-dot status-${c.status}`} />
                  <span className="msn-contact-name">{c.name}</span>
                  <span className="msn-contact-psm"> - {c.psm}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="msn-list-foot">I'm online — {onlineCount} contacts available</div>
      </div>

      {/* Chat windows */}
      {chats.map((chat) => {
        const c = contactById(chat.contactId);
        return (
          <div
            key={chat.contactId}
            className={"msn-chat" + (chat.shake ? " is-shaking" : "")}
            style={{ left: chat.x, top: chat.y, zIndex: chat.z }}
            onPointerDown={() => focusChat(chat.contactId)}
          >
            <div
              className="msn-chat-title"
              onPointerDown={(e) => {
                drag.current = { id: chat.contactId, dx: e.clientX - chat.x, dy: e.clientY - chat.y };
              }}
            >
              <span className="msn-chat-title-name">{c.name}</span>
              <button className="msn-chat-x" onClick={(e) => { e.stopPropagation(); closeChat(chat.contactId); }}>✕</button>
            </div>
            <div className="msn-chat-head">
              <span className={`msn-dot status-${c.status}`} />
              <span className="msn-chat-head-name">{c.name}</span>
              <span className="msn-chat-head-psm">{c.psm}</span>
            </div>
            <div className="msn-transcript">
              {chat.msgs.map((m) =>
                m.from === "system" ? (
                  <div key={m.id} className="msn-system">{m.text}</div>
                ) : (
                  <div key={m.id} className="msn-line">
                    <span className={"msn-line-from " + (m.from === "me" ? "is-me" : "is-them")}>{m.from === "me" ? ME.name : c.name} says:</span>
                    <span className="msn-line-text">{renderText(m.text, String(m.id))}</span>
                  </div>
                )
              )}
              {chat.typing && <div className="msn-typing">{c.name} is typing a message...</div>}
            </div>
            <div className="msn-chat-toolbar">
              {["Invite", "Send Files", "Voice", "Video", "Activities", "Games"].map((b) => (
                <button key={b} title={`${b} (not available)`} disabled>{b}</button>
              ))}
              <button className="msn-nudge" title="Send a Nudge" disabled={false} onClick={() => nudge(chat.contactId)}>Nudge</button>
            </div>
            <div className="msn-emorow">
              {PICKER.map(([token, kind]) => (
                <button key={token} title={token} onClick={() => insertEmo(chat.contactId, token)}><Face kind={kind} /></button>
              ))}
            </div>
            <div className="msn-inputrow">
              <textarea
                value={chat.input}
                placeholder={`Type a message to ${c.name}`}
                onChange={(e) => setInput(chat.contactId, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(chat.contactId); }
                }}
              />
              <button className="msn-send" onClick={() => send(chat.contactId)}>Send</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MsnLogo() {
  // Abstract "Messenger" mark — a chunky two-tone speech buddy, not the logo.
  return (
    <svg viewBox="0 0 28 28" width="26" height="26" aria-hidden="true">
      <circle cx="14" cy="14" r="13" fill="#2ea043" />
      <circle cx="14" cy="11" r="5" fill="#fff" />
      <path d="M5 25 a9 9 0 0 1 18 0 Z" fill="#fff" />
      <circle cx="22" cy="7" r="4" fill="#1f7fd6" stroke="#fff" strokeWidth="1.4" />
    </svg>
  );
}
