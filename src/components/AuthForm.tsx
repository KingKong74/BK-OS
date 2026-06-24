'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getClientMode } from '@/lib/mode';

/**
 * The BK-OS "Log on" window. One styled shell for both the sign-in and
 * sign-up routes — the tabs at the top switch between them. The actual auth
 * logic (Auth.js credentials sign-in + the /api/auth/signup route) is
 * unchanged from the original pages; only the presentation is new.
 */
export function AuthForm({ mode }: { mode: 'signin' | 'signup' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const isPublic = getClientMode() === 'public';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'signup') {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to create account');
        setLoading(false);
        return;
      }
    }

    const result = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);

    if (result?.error) {
      setError(
        mode === 'signup'
          ? 'Account created but auto-login failed. Try signing in manually.'
          : 'Invalid email or password'
      );
      return;
    }

    router.push(mode === 'signup' ? '/' : callbackUrl);
    router.refresh();
  }

  const goTab = (target: 'signin' | 'signup') => {
    if (target === mode) return;
    const suffix = callbackUrl && callbackUrl !== '/'
      ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : '';
    router.push(`/auth/${target}${suffix}`);
  };

  return (
    <div style={pageStyle}>
      <div style={windowStyle}>
        <div style={titleBarStyle}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <LogoMark />
            Log on to BK-OS
          </span>
        </div>

        <div style={tabsRowStyle}>
          <button type="button" style={tabStyle(mode === 'signin')} onClick={() => goTab('signin')}>
            Sign in
          </button>
          <button type="button" style={tabStyle(mode === 'signup')} onClick={() => goTab('signup')}>
            Sign up
          </button>
        </div>

        <div style={bodyStyle}>
          {isPublic && (
            <div style={publicNoteStyle}>
              Public demo — try without committing. Sign up with anything; data is sandboxed.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <Field label="Name (optional)" type="text" value={name} onChange={setName} required={false} />
            )}
            <Field label="Email" type="email" value={email} onChange={setEmail} />
            <Field
              label={mode === 'signup' ? 'Password (min 8 chars)' : 'Password'}
              type="password"
              value={password}
              onChange={setPassword}
              minLength={mode === 'signup' ? 8 : undefined}
            />

            {error && <div style={errorStyle}>{error}</div>}

            <div style={actionsRowStyle}>
              <button type="submit" disabled={loading} style={primaryButtonStyle}>
                {loading
                  ? mode === 'signup' ? 'Creating…' : 'Signing in…'
                  : mode === 'signup' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>

        <div style={footerStyle}>
          <span>{mode === 'signin' ? 'Authorized users only' : 'Welcome to bailey.os'}</span>
          <span style={{ opacity: 0.75 }}>BK-OS 0.1</span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, required = true, minLength }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; required?: boolean; minLength?: number;
}) {
  return (
    <div style={{ marginBottom: 11 }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        style={inputStyle}
      />
    </div>
  );
}

function LogoMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="1" y="2" width="14" height="11" fill="#008080" stroke="#000" />
      <rect x="3" y="4" width="4" height="3" fill="#ffffff" />
      <rect x="9" y="4" width="4" height="3" fill="#ffd54a" />
      <rect x="3" y="9" width="4" height="2" fill="#ffd54a" />
      <rect x="9" y="9" width="4" height="2" fill="#ffffff" />
    </svg>
  );
}

const BEVEL_OUT = 'inset -1px -1px #0a0a0a, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #dfdfdf';
const BEVEL_IN = 'inset 1px 1px #808080, inset -1px -1px #ffffff';

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#008080',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  fontFamily: '"Tahoma", "MS Sans Serif", "Segoe UI", sans-serif',
  fontSize: 13,
  color: '#000',
};
const windowStyle: React.CSSProperties = {
  width: 340,
  maxWidth: '100%',
  background: '#c0c0c0',
  boxShadow: `${BEVEL_OUT}, 3px 3px 0 rgba(0,0,0,0.4)`,
  padding: 3,
};
const titleBarStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #000080, #1084d0)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 13,
  padding: '3px 6px',
  display: 'flex',
  alignItems: 'center',
};
const tabsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 2,
  padding: '5px 5px 0',
};
const tabStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '5px 0 6px',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: active ? 700 : 400,
  cursor: 'pointer',
  background: '#c0c0c0',
  color: '#000',
  border: 'none',
  marginBottom: active ? -1 : 0,
  boxShadow: active
    ? 'inset 1px 1px #ffffff, inset -1px 0 #808080, inset 0 -1px #c0c0c0'
    : 'inset -1px -1px #808080, inset 1px 1px #ffffff',
});
const bodyStyle: React.CSSProperties = {
  margin: 5,
  padding: 14,
  background: '#c0c0c0',
  boxShadow: BEVEL_IN,
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, marginBottom: 3 };
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 5px',
  border: '1px solid #0a0a0a',
  boxShadow: BEVEL_IN,
  background: '#fff',
  color: '#000',
  fontFamily: 'inherit',
  fontSize: 13,
  boxSizing: 'border-box',
  borderRadius: 0,
  outline: 'none',
};
const errorStyle: React.CSSProperties = {
  color: '#800000',
  background: '#ffe0e0',
  border: '1px solid #800000',
  padding: 6,
  margin: '2px 0 10px',
  fontSize: 12,
};
const actionsRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginTop: 14,
};
const primaryButtonStyle: React.CSSProperties = {
  minWidth: 92,
  padding: '6px 16px',
  background: '#c0c0c0',
  color: '#000',
  border: 'none',
  boxShadow: BEVEL_OUT,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  borderRadius: 0,
};
const publicNoteStyle: React.CSSProperties = {
  background: '#fffae0',
  border: '1px solid #aa8800',
  color: '#4a3500',
  fontSize: 11,
  lineHeight: 1.4,
  padding: '6px 8px',
  marginBottom: 12,
};
const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '2px 8px 5px',
  fontSize: 11,
  color: '#303030',
};
