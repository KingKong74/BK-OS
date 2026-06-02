"use client";

import { Icon } from "./Icon";
import { AppIcon } from "./AppIcon";

export function WebApp({ url, name, appId, externalOnly }: { url: string; name: string; appId?: string; externalOnly?: boolean }) {
  let host = url;
  try { host = new URL(url).host; } catch {}

  if (externalOnly) {
    return (
      <div className="web-app">
        <div className="web-app-bar">
          <span className="web-app-host">
            <Icon name="external-link" size={14} />
            {host}
          </span>
        </div>
        <div className="web-app-external">
          <div className="web-app-external-icon">
            {appId ? <AppIcon id={appId} size={72} /> : <Icon name="external-link" size={64} />}
          </div>
          <h2>{name}</h2>
          <p>{name} doesn&rsquo;t allow embedding inside bailey.os.</p>
          <a className="web-app-external-cta" href={url} target="_blank" rel="noreferrer noopener">
            <Icon name="external-link" size={14} />
            Open in a new tab
          </a>
          <p className="web-app-external-url">{url}</p>
        </div>
      </div>
    );
  }

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
