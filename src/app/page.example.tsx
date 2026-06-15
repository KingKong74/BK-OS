// EXAMPLE: this shows how to wire AuthGate into your existing page.tsx
// Adapt by importing your actual OS shell component.

'use client';

import AuthGate from '@/components/AuthGate';
// Replace this import with your actual OS shell component path:
// import OS from '@/components/OS';

export default function HomePage() {
  return (
    <AuthGate>
      {/* <OS /> */}
      <div style={{ padding: 32 }}>
        Logged in! Replace this with your &lt;OS /&gt; shell component.
      </div>
    </AuthGate>
  );
}
