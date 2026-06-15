'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <Splash text="Loading bailey.os…" />;
  }

  if (status === 'unauthenticated') {
    return <Splash text="Redirecting to sign-in…" />;
  }

  return <>{children}</>;
}

function Splash({ text }: { text: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#008080',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
        fontSize: 14,
      }}
    >
      {text}
    </div>
  );
}
