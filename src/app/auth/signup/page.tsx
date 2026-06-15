'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

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

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Account created but auto-login failed. Try signing in manually.');
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={titleBarStyle}>bailey.os — create account</div>
        <form onSubmit={handleSubmit} style={{ padding: 16 }}>
          <Field label="Name (optional)" type="text" value={name} onChange={setName} required={false} />
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <Field label="Password (min 8 chars)" type="password" value={password} onChange={setPassword} required minLength={8} />
          {error && <div style={errorStyle}>{error}</div>}
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Creating…' : 'Sign up'}
          </button>
          <div style={linkRowStyle}>
            Have an account? <a href="/auth/signin" style={{ color: '#000080' }}>Sign in</a>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, required = true, minLength }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; required?: boolean; minLength?: number;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 12, marginBottom: 3 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        style={inputStyle}
      />
    </div>
  );
}

const pageStyle: React.CSSProperties = { minHeight: '100vh', background: '#008080', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"MS Sans Serif", Tahoma, sans-serif' };
const cardStyle: React.CSSProperties = { background: '#c0c0c0', border: '2px outset #c0c0c0', width: 320 };
const titleBarStyle: React.CSSProperties = { background: '#000080', color: '#fff', padding: '4px 8px', fontWeight: 700, fontSize: 13 };
const inputStyle: React.CSSProperties = { width: '100%', padding: 4, border: '2px inset #c0c0c0', fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box' };
const buttonStyle: React.CSSProperties = { width: '100%', padding: 6, background: '#c0c0c0', border: '2px outset #c0c0c0', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 };
const errorStyle: React.CSSProperties = { color: '#800000', background: '#ffe0e0', border: '1px solid #800000', padding: 6, marginBottom: 10, fontSize: 12 };
const linkRowStyle: React.CSSProperties = { marginTop: 12, fontSize: 12, textAlign: 'center' };
