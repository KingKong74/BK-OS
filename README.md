# bailey.os

A personal operating system for the browser — the shell for everything (vault, accounting, projects, music, …). On a wide screen it's a windowed desktop with a dock and launcher; on a phone the same apps go full-screen with a tab bar. Switch between visual "scenes" (Modern, Retro 98) at any time.

This repo is the **shell scaffold**. The apps themselves are stubs for now — the architecture is ready for you to drop real apps into.

## Run it

Requires Node 18.18+ (or 20+).

```bash
npm install
npm run dev
```

Open http://localhost:3000. Resize the browser narrow (< 768px) to see the mobile shell.

For a production build:

```bash
npm run build
npm start
```

## How it works

The core idea: **apps are layout-agnostic**. An app is just a React component that doesn't know whether it's inside a draggable window (desktop) or a full-screen panel (mobile). Two shells decide how to frame it.

```
src/
  os/
    types.ts        Shared types + layout constants
    appsMeta.ts     The app catalogue (plain data — id, name, icon, accent, size)
    registry.tsx    Maps appId -> React component (falls back to a placeholder)
    store.ts        Zustand store: window manager + scene, persisted to localStorage
  components/
    OS.tsx          Root: applies the scene, picks Desktop or Mobile shell
    DesktopShell.tsx  Menu bar + windows + dock + launcher
    MobileShell.tsx   Full-screen apps + home grid + tab bar
    WindowFrame.tsx   Draggable / resizable window chrome
    MenuBar.tsx  Dock.tsx  Launcher.tsx  Icon.tsx  useMediaQuery.ts
  apps/
    VaultApp.tsx    Stub vault browser
    SettingsApp.tsx The scene switcher (a real, working app)
    PlaceholderApp.tsx  "Coming soon" for unbuilt apps
  scenes/
    scenes.css      Theme tokens per scene + retro chrome overrides
```

Window positions, sizes, stacking order, and the chosen scene are saved to
`localStorage` under the key `bailey-os`, so reopening restores your last session.

## Add an app

1. Add an entry to `APPS` in `src/os/appsMeta.ts` (id, name, icon, accent colour, default size, and `pinned: true` if it should sit in the dock).
2. Build a component in `src/apps/`.
3. Register it in `src/os/registry.tsx`. That's it — it appears in the launcher, the dock, and the mobile grid automatically.

Apps that aren't registered yet still show up; they just render the placeholder.

## Add a scene

1. Add a `[data-scene="yourid"] { … }` block in `src/scenes/scenes.css`, setting the token contract (and any chrome overrides you want).
2. Add it to the `SCENES` list in `src/apps/SettingsApp.tsx`.

## Notes / next steps

- Icons are a small inline-SVG set in `Icon.tsx` to avoid a dependency. Swap in an icon library later if you want more.
- The fonts are a system stack for now; drop in a display font when you're ready to give it more character.
- This is the shell only — auth, the backend, storage, and the real apps come next. Everything sensitive is meant to live behind your VPN, all private.
