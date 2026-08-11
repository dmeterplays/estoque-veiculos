'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Upload, FileUp, CheckCircle2, AlertTriangle } from 'lucide-react';

type ImportResult = {
  ok: boolean;
  summary: { received: number; created: number; updated: number; deactivated: number };
  status: string;
  errors?: { index: number; message: string }[];
  message?: string;
};

export function ImportVehiclesDialog({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState('');

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setResult(null);
    setFileName(file.name);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/dashboard/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao importar');
      }
      setResult(data);
      toast.success('Importação concluída');
      onImported();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao importar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Importar veículos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Envie um arquivo <strong>JSON</strong>, <strong>CSV</strong> ou{' '}
            <strong>XLSX</strong> com o estoque. As colunas são reconhecidas
            automaticamente (ex: <code>marca</code>, <code>modelo</code>,{' '}
            <code>preço</code>, <code>km</code>, <code>ano</code>,
            <code>combustível</code>, <code>câmbio</code>, <code>cidade</code>,{' '}
            <code>UF</code>, <code>cor</code>...).
          </p>

          <label className="block">
            <Label>Arquivo</Label>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                type="file"
                accept=".json,.csv,.xlsx"
                className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-input file:bg-muted file:text-sm file:font-medium file:cursor-pointer"
                onChange={(e) => {
                  handleFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
                disabled={busy}
              />
            </div>
            {fileName && (
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <FileUp className="h-3 w-3" /> {fileName}
              </p>
            )}
          </label>

          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Processando importação...
            </div>
          )}

          {result && !busy && (
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                {result.status === 'failed' ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {result.status === 'success'
                  ? 'Importação concluída com sucesso!'
                  : result.status === 'partial'
                  ? 'Importação concluída com alguns erros'
                  : 'Falha na importação'}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">
                  Recebidos: <strong>{result.summary.received}</strong>
                </div>
                <div className="text-muted-foreground">
                  Criados: <strong className="text-green-600">{result.summary.created}</strong>
                </div>
                <div className="text-muted-foreground">
                  Atualizados: <strong>{result.summary.updated}</strong>
                </div>
                <div className="text-muted-foreground">
                  Desativados: <strong>{result.summary.deactivated}</strong>
                </div>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                  {result.errors.slice(0, 20).map((e, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 shrink-0 text-destructive mt-0.5" />
                      <span>{e.message}</span>
                    </div>
                  ))}
                  {result.errors.length > 20 && (
                    <div>... e mais {result.errors.length - 20} erros</div>
                  )}
                </div>
              )}
              {result.message && (
                <p className="text-xs text-muted-foreground">{result.message}</p>
              )}
            </div>
          )}

          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <div className="font-medium mb-1">Dica:</div>
            Para evitar duplicatas, inclua uma coluna{' '}
            <code className="bg-background rounded px-1">codigo</code> ou{' '}
            <code className="bg-background rounded px-1">external_id</code> — veículos com o
            mesmo código são atualizados em vez de duplicados.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}