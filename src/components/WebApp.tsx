"use client";

import { Icon } from "./Icon";

export function WebApp({ url, name }: { url: string; name: string }) {
  let host = url;
  try { host = new URL(url).host; } catch {}
  return (
    <div className="web-app">
      <div className="web-app-bar">
        <span className="web-app-host">
          <Icon name="external-link" size={14} />
          {host}
        </span>
        <a className="web-app-open" href={url} target="_blank" rel="noreferrer noopener">
          Open in new tab
        </a>
      </div>
      <iframe
        src={url}
        title={name}
        className="web-app-frame"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
