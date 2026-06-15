'use client';

import { useSession, signOut } from 'next-auth/react';

export default function UserStatusBar() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <div style={containerStyle}>
      <span style={emailStyle}>
        Signed in as <strong>{session.user.email}</strong>
      </span>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/auth/signin' })}
        style={buttonStyle}
      >
        Sign out
      </button>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '6px 10px',
  fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
  fontSize: 11,
  background: '#c0c0c0',
  borderTop: '1px solid #fff',
};

const emailStyle: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const buttonStyle: React.CSSProperties = {
  padding: '2px 8px',
  background: '#c0c0c0',
  border: '2px outset #c0c0c0',
  fontFamily: 'inherit',
  fontSize: 11,
  cursor: 'pointer',
  flexShrink: 0,
};
