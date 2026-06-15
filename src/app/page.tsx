'use client';
import AuthGate from '@/components/AuthGate';
import { OS } from '@/components/OS';

export default function HomePage() {
  return (
    <AuthGate>
      <OS />
    </AuthGate>
  );
}