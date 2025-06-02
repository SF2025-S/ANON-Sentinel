"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider } from '../config/AuthContext';

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
  }, [router]);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    </AuthProvider>
  );
}