'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Loader2,
  Car,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Plus,
  Play,
  ImagePlus,
  X,
  MoreVertical,
  Pencil,
  Trash2,
  Power,
  PowerOff,
} from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Store = {
  id: string;
  name: string;
  api_key: string;
  city: string | null;
  state: string | null;
  whatsapp: string | null;
  plan: string;
  active: boolean;
};

type Vehicle = {
  id: string;
  brand: string;
  model: string;
  year_manufacture?: number;
  year_model: number;
  km: number;
  price: number;
  fuel: string;
  transmission: string;
  city: string;
  state: string;
  image: string | null;
  condition: string;
  active?: boolean;
  colors: { name: string; quantity: number }[];
  media?: { vehicle_id: string; url: string; kind: string; position: number; is_main: boolean }[];
};

type Sync = {
  id: string;
  received_at: string;
  vehicles_received: number;
  vehicles_created: number;
  vehicles_updated: number;
  vehicles_deactivated: number;
  status: string;
};

export default function DashboardClient({
  userEmail,
  fullName,
  store,
}: {
  userEmail: string;
  fullName: string | null;
  store: Store | null;
}) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [syncs, setSyncs] = useState<Sync[]>([]);
  const [copied, setCopied] = useState(false);

  const apiKey = store?.api_key ?? '';

  async function loadVehicles() {
    setVehiclesLoading(true);
    try {
      const res = await fetch('/dashboard/data');
      const data = await res.json();
      setVehicles(data.vehicles ?? []);
    } catch {
      toast.error('Erro ao carregar veículos');
    } finally {
      setVehiclesLoading(false);
    }
  }

  async function loadSyncs() {
    try {
      const res = await fetch('/dashboard/syncs');
      const data = await res.json();
      setSyncs(data.syncs ?? []);
    } catch {
      // ignora
    }
  }

  useEffect(() => {
    loadVehicles();
    loadSyncs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyApiKey() {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('API key copiada');
    } catch {
      toast.error('Não foi possível copiar');
    }
  }

  const stats = useMemo(() => {
    const active = vehicles.filter((v) => v.active !== false);
    const totalValue = active.reduce((sum, v) => sum + (v.price || 0), 0);
    return {
      total: active.length,
      avgPrice: active.length > 0 ? Math.round(totalValue / active.length) : 0,
      totalValue,
    };
  }, [vehicles]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Car className="h-6 w-6 text-primary" />
            <div>
              <div className="font-semibold">{store?.name ?? 'Loja'}</div>
              <div className="text-xs text-muted-foreground">
                {fullName} · {userEmail}
              </div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="veiculos">
          <TabsList className="mb-6">
            <TabsTrigger value="veiculos">Meu estoque</TabsTrigger>
            <TabsTrigger value="synced">Sincronizações</TabsTrigger>
            <TabsTrigger value="apikey">Integração</TabsTrigger>
          </TabsList>

          {/* ===== Estoque ===== */}
          <TabsContent value="veiculos">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl">{stats.total}</CardTitle>
                  <CardDescription>Veículos no estoque</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl">
                    {stats.avgPrice.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      maximumFractionDigits: 0,
                    })}
                  </CardTitle>
                  <CardDescription>Preço médio</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl">
                    {stats.totalValue.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      maximumFractionDigits: 0,
                    })}
                  </CardTitle>
                  <CardDescription>Valor total</CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="mb-4 flex justify-end">
              <AddVehicleDialogContent onAdded={loadVehicles} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Veículos</CardTitle>
                <CardDescription>
                  {vehicles.length} veículos vinculados à sua loja
                </CardDescription>
              </CardHeader>
              <CardContent>
                {vehiclesLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum veículo cadastrado ainda.
                    <br />
                    Envie seu estoque via API (aba API Key) ou cadastre manualmente.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehicles.map((v) => {
                      const mainImg =
                        v.media?.find((m) => m.is_main && m.kind === 'image')?.url ??
                        v.media?.find((m) => m.kind === 'image')?.url ??
                        v.image;
                      const isAvailable = v.active !== false;
                      return (
                        <Card key={v.id} className="overflow-hidden">
                          <div className="aspect-[4/3] bg-muted relative">
                            {mainImg ? (
                              <img
                                src={mainImg}
                                alt={`${v.brand} ${v.model}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <Car className="h-10 w-10" />
                              </div>
                            )}
                            {!isAvailable && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Badge variant="destructive">Indisponível</Badge>
                              </div>
                            )}
                            <div className="absolute top-2 right-2 flex gap-1">
                              {(v.media ?? []).filter((m) => m.kind === 'video').length > 0 && (
                                <Badge variant="secondary" className="text-[10px]">
                                  <Play className="h-3 w-3 mr-1" /> vídeo
                                </Badge>
                              )}
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-semibold truncate">
                                  {v.brand} {v.model}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {v.year_model} · {v.km.toLocaleString('pt-BR')} km ·{' '}
                                  {v.city}/{v.state}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <VehicleActions
                                  vehicle={v}
                                  onChanged={loadVehicles}
                                  onDeleted={loadVehicles}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <span className="font-bold text-lg">
                                {v.price.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })}
                              </span>
                              <Badge
                                variant={isAvailable ? 'secondary' : 'outline'}
                                className={
                                  isAvailable ? 'text-green-700 border-green-300' : ''
                                }
                              >
                                {isAvailable ? 'Disponível' : 'Indisponível'}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Sincronizações ===== */}
          <TabsContent value="synced">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de sincronizações</CardTitle>
                <CardDescription>
                  Registro de quando o estoque foi enviado via API
                </CardDescription>
              </CardHeader>
              <CardContent>
                {syncs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhuma sincronização registrada ainda.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Recebidos</TableHead>
                        <TableHead>Criados</TableHead>
                        <TableHead>Atualizados</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncs.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            {new Date(s.received_at).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell>{s.vehicles_received}</TableCell>
                          <TableCell>{s.vehicles_created}</TableCell>
                          <TableCell>{s.vehicles_updated}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                s.status === 'success'
                                  ? 'default'
                                  : s.status === 'partial'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                            >
                              {s.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== API Key ===== */}
          <TabsContent value="apiKey">
            <Card>
              <CardHeader>
                <CardTitle>Chave de API</CardTitle>
                <CardDescription>
                  Use esta chave para enviar o estoque e consultar veículos
                  programaticamente (ex: via n8n).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label>Chave da loja</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 block bg-muted rounded px-3 py-2 text-sm break-all">
                        {apiKey}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={copyApiKey}
                        title="Copiar chave"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Enviar estoque (POST)</Label>
                  <code className="block bg-muted rounded p-3 text-sm break-all">
                    POST https://estoque.viralstudios.com.br/api/v1/inventory/sync
                  </code>
                  <p className="text-xs text-muted-foreground">
                    Header: <code>Authorization: Bearer SUA_CHAVE</code>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Consultar veículos (GET)</Label>
                  <code className="block bg-muted rounded p-3 text-sm break-all">
                    GET https://estoque.viralstudios.com.br/api/v1/vehicles
                  </code>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <KeyRound className="h-3 w-3" />
                    Sua capacidade de consulta total do próprio estoque é ilimitada
                    com o plano {store?.plan ?? 'free'}.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function AddVehicleDialogContent({ onAdded }: { onAdded: () => void }) {
  return (
    <VehicleFormDialog
      trigger={
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Cadastrar veículo
        </Button>
      }
      title="Cadastrar veículo manualmente"
      submitLabel="Salvar veículo"
      onSaved={onAdded}
    />
  );
}

function VehicleActions({
  vehicle,
  onChanged,
  onDeleted,
}: {
  vehicle: Vehicle;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isAvailable = vehicle.active !== false;

  async function toggleAvailability() {
    setBusy(true);
    try {
      const res = await fetch(`/dashboard/vehicles/${vehicle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !isAvailable }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao atualizar');
      }
      toast.success(isAvailable ? 'Veículo marcado como indisponível' : 'Veículo disponível');
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/dashboard/vehicles/${vehicle.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir');
      }
      toast.success('Veículo excluído');
      setConfirmOpen(false);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleAvailability}>
            {isAvailable ? (
              <PowerOff className="h-4 w-4 mr-2" />
            ) : (
              <Power className="h-4 w-4 mr-2" />
            )}
            {isAvailable ? 'Indisponibilizar' : 'Disponibilizar'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmOpen(true)} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <VehicleFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        vehicle={vehicle}
        title="Editar veículo"
        submitLabel="Salvar alterações"
        onSaved={onChanged}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir veículo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir <strong>{vehicle.brand} {vehicle.model}</strong>?
            Essa ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function VehicleFormDialog({
  trigger,
  open,
  onOpenChange,
  vehicle,
  title,
  submitLabel,
  onSaved,
}: {
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
      const url = isEdit
        ? `/dashboard/vehicles/${vehicle!.id}`
        : '/dashboard/vehicles';
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