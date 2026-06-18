'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SignInPage() {
  return (
    <Suspense fallback={<LoadingCard />}>
      <SignInForm />
    </Suspense>
  );
}

function LoadingCard() {
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={titleBarStyle}>bailey.os — sign in</div>
        <div style={{ padding: 16 }}>Loading…</div>
      </div>
    </div>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Invalid email or password');
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={titleBarStyle}>bailey.os — sign in</div>
        <form onSubmit={handleSubmit} style={{ padding: 16 }}>
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <Field label="Password" type="password" value={password} onChange={setPassword} />
          {error && <div style={errorStyle}>{error}</div>}
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <div style={linkRowStyle}>
            New here? <a href="/auth/signup" style={{ color: '#000080' }}>Create an account</a>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 12, marginBottom: 3 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
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
