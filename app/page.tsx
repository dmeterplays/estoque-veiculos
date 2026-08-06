'use client';

import { useEffect } from 'react';

export default function HomeHandler() {
  useEffect(() => {
    // O link de recuperação de senha do Supabase pode cair na raiz com o token
    // no #hash (ex: #access_token=...&type=recovery). Encaminhamos para a
    // página de reset antes que o token se perca.
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      window.location.replace('/reset-password' + hash);
      return;
    }
    window.location.replace('/dashboard');
  }, []);

  return null;
}