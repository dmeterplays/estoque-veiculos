'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="relative group">
      <button
        onClick={copy}
        aria-label={`Copiar código ${language}`}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
      <pre
        className="rounded-lg overflow-x-auto text-[13px] leading-relaxed"
        style={{ background: '#1e222a', color: '#99a1b3', padding: '12px 14px' }}
      >
        <code className="block whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}