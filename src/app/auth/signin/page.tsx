'use client';

import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';

export default function SignInPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#008080' }} />}>
      <AuthForm mode="signin" />
    </Suspense>
  );
}
