import { ReactNode } from 'react';

export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="space-y-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
      <div className="h-px bg-border my-2" />
    </section>
  );
}

export function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-xl font-semibold">
      {children}
    </h2>
  );
}