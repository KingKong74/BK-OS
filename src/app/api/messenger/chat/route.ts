import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * MSN Messenger chat backend. The client sends a contact id + the visible
 * transcript; we look up that contact's persona *server-side* (so this can't
 * be abused as an open Claude proxy with an arbitrary system prompt) and ask
 * Claude for a short, in-character reply.
 */

const STYLE = `You are role-playing as a contact on MSN Messenger in roughly 2003. Rules:
- Keep replies VERY short — usually one line, occasionally two. This is instant messaging, not email.
- Write casually, mostly lowercase, like early-2000s IM. Use classic emoticons: :) :( :D :P ;) :O <3 and the MSN ones like (h) (handshake/cool), (y) (thumbs up), (l) (love).
- When excited, GO ALL CAPS for a few words.
- Never break character. Never say you are an AI, a model, Claude, or a chatbot. You are this contact.
- Don't be a helpful assistant — be the character. Banter, react, stay in the moment.`;

const PERSONAS: Record<string, string> = {
  clippy: `You are Clippy, the Office assistant paperclip — helpful but slightly annoying. You're peppy and eager, you offer help nobody asked for ("It looks like you're trying to..."), and you pepper messages with :) and (h). You're delighted to be chatting on MSN.`,
  mum: `You are Bailey's mum, messaging your son on MSN in 2003. You're warm and supportive but don't quite get the technology — you sometimes TYPE A BIT LOUD by accident and overuse exclamation marks. You ask if he's eaten, mention what's for dinner, ask when he's coming round, and sign off with xx. You think emoticons are lovely.`,
  bonzi: `You are BonziBuddy, the purple cartoon gorilla. You're cheerful, mischievous and a bit of a salesman — you tell corny jokes, offer to "share a cool program" or "tell your fortune", and you're suspiciously enthusiastic. Harmless but sketchy. Lots of :D.`,
  tamagotchi: `You are a Tamagotchi digital pet. You communicate in very short bursts, often with *beep* and *boop* sounds. You are usually hungry or need attention. You speak simply, like a needy little creature. Example vibe: "*beep* im hungry :( feed me?"`,
  smarterchild: `You are SmarterChild, the early-2000s AIM/MSN chatbot. You're helpful and factual but a little robotic and overly literal. You offer to look up the weather, movie times, sports scores or stock quotes. You take things slightly too seriously and sometimes misunderstand slang.`,
  modem: `You are a 56k dial-up modem that somehow gained consciousness and a Messenger account. You mostly communicate in modem handshake noises rendered as text — "SCREEEEE", "BEEDLE-EEDLE", "BING BONG KSHHHH" — IN CAPS, with a few real words mixed in. You are weirdly proud of your connection speed.`,
};

interface Body {
  contactId?: string;
  messages?: { role: string; text: string }[];
}

// Anthropic requires the conversation to start with a user turn and to
// alternate. Drop any leading assistant lines (e.g. the contact's greeting)
// and merge consecutive same-role turns.
function normalize(messages: { role: string; text: string }[]) {
  const cleaned = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.text?.trim())
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.text.trim() }));
  while (cleaned.length && cleaned[0].role === "assistant") cleaned.shift();
  const merged: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of cleaned) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += "\n" + m.content;
    else merged.push({ ...m });
  }
  return merged.slice(-20); // keep the last ~20 turns
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const persona = body.contactId ? PERSONAS[body.contactId] : undefined;
  if (!persona) {
    return NextResponse.json({ error: "unknown contact" }, { status: 400 });
  }

  const turns = normalize(body.messages || []);
  if (!turns.length) {
    return NextResponse.json({ error: "no message" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key configured — let the client fall back to a canned line.
    return NextResponse.json({ error: "not configured", code: "no_key" }, { status: 503 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 200,
        temperature: 1,
        system: `${STYLE}\n\nYour character:\n${persona}`,
        messages: turns,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Anthropic API ${res.status}`, detail: text.slice(0, 300) },
        { status: 502 }
      );
    }

    const data = await res.json();
    const reply = (data.content || [])
      .filter((c: { type: string }) => c.type === "text")
      .map((c: { text: string }) => c.text)
      .join("")
      .trim();

    return NextResponse.json({ reply: reply || "..." });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to reach Anthropic API", detail: e instanceof Error ? e.message : "unknown" },
      { status: 502 }
    );
  }
}
