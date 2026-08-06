'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ImagePlus, X, Play } from 'lucide-react';
import type { Vehicle } from '@/types/dashboard';

export default function VehicleFormDialog({
  apiBase,
  trigger,
  open,
  onOpenChange,
  vehicle,
  title,
  submitLabel,
  onSaved,
}: {
  apiBase: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  vehicle?: Vehicle | null;
  title: string;
  submitLabel: string;
  onSaved: () => void;
}) {
  const isEdit = !!vehicle;
  const [openState, setOpenState] = useState(false);
  const openValue = onOpenChange !== undefined ? (open ?? false) : openState;
  const setOpenValue = onOpenChange ?? setOpenState;

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<{ url: string; kind: 'image' | 'video' }[]>(
    vehicle?.media?.map((m) => ({ url: m.url, kind: m.kind === 'video' ? 'video' : 'image' })) ?? []
  );
  const [form, setForm] = useState({
    brand: vehicle?.brand ?? '',
    model: vehicle?.model ?? '',
    year_manufacture: vehicle?.year_manufacture ?? new Date().getFullYear(),
    year_model: vehicle?.year_model ?? new Date().getFullYear(),
    km: vehicle?.km?.toString() ?? '',
    price: vehicle?.price?.toString() ?? '',
    fuel: vehicle?.fuel ?? 'FLEX',
    transmission: vehicle?.transmission ?? 'MANUAL',
    condition: vehicle?.condition ?? 'used',
    city: vehicle?.city ?? '',
    state: vehicle?.state ?? '',
    image: vehicle?.image ?? '',
    description: '',
  });

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newItems: { url: string; kind: 'image' | 'video' }[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Falha no upload');
        }
        const data = await res.json();
        newItems.push({ url: data.url, kind: data.kind });
      }
      setMedia((prev) => [...prev, ...newItems]);
      toast.success(`${newItems.length} arquivo(s) enviado(s)!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro no upload');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        km: Number(form.km),
        price: Number(form.price),
        year_manufacture: Number(form.year_manufacture),
        year_model: Number(form.year_model),
        media,
      };
      if (isEdit) delete (payload as { description?: string }).description;
      const url = isEdit ? `${apiBase}/${vehicle!.id}` : apiBase;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEdit ? payload : { ...payload, colors: [{ name: 'Única', quantity: 1 }] }
        ),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar');
      }
      toast.success(isEdit ? 'Veículo atualizado!' : 'Veículo cadastrado!');
      setOpenValue(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={openValue} onOpenChange={setOpenValue}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Input value={form.brand} onChange={update('brand')} placeholder="Fiat" required />
            </div>
            <div className="space-y-1.5">
              <Label>Modelo</Label>
              <Input value={form.model} onChange={update('model')} placeholder="Argo 1.0" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ano fabricação</Label>
              <Input
                type="number"
                value={form.year_manufacture}
                onChange={update('year_manufacture')}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ano modelo</Label>
              <Input
                type="number"
                value={form.year_model}
                onChange={update('year_model')}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>KM</Label>
              <Input type="number" value={form.km} onChange={update('km')} required />
            </div>
            <div className="space-y-1.5">
              <Label>Preço (R$)</Label>
              <Input type="number" step="0.01" value={form.price} onChange={update('price')} required />
            </div>
            <div className="space-y-1.5">
              <Label>Combustível</Label>
              <Select value={form.fuel} onValueChange={(v) => setForm((p) => ({ ...p, fuel: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FLEX">Flex</SelectItem>
                  <SelectItem value="GASOLINA">Gasolina</SelectItem>
                  <SelectItem value="ETANOL">Etanol</SelectItem>
                  <SelectItem value="DIESEL">Diesel</SelectItem>
                  <SelectItem value="ELETRICO">Elétrico</SelectItem>
                  <SelectItem value="HIBRIDO">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Câmbio</Label>
              <Select value={form.transmission} onValueChange={(v) => setForm((p) => ({ ...p, transmission: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="AUTOMATIC">Automático</SelectItem>
                  <SelectItem value="AUTOMATIZADO">Automatizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.city} onChange={update('city')} placeholder="São Paulo" required />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Input value={form.state} onChange={update('state')} placeholder="SP" maxLength={2} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Condição</Label>
              <Select value={form.condition} onValueChange={(v) => setForm((p) => ({ ...p, condition: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="used">Usado</SelectItem>
                  <SelectItem value="new">Novo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>URL da imagem (opcional)</Label>
              <Input value={form.image} onChange={update('image')} placeholder="https://..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Fotos / Vídeo</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('media-input')?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4 mr-2" />
                )}
                {uploading ? 'Enviando...' : 'Adicionar fotos ou vídeo'}
              </Button>
              <input
                id="media-input"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>
            {media.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {media.map((m, i) => (
                  <div key={i} className="relative h-20 w-20 rounded-md overflow-hidden bg-muted">
                    {m.kind === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Play className="h-6 w-6" />
                      </div>
                    ) : (
                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Textarea value={form.description} onChange={update('description')} rows={3} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}