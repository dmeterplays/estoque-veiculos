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
} from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';

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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Ano</TableHead>
                        <TableHead>KM</TableHead>
                        <TableHead>Preço</TableHead>
                        <TableHead>Combustível</TableHead>
                        <TableHead>Câmbio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicles.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell>
                            <div className="font-medium">
                              {v.brand} {v.model}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {v.city}/{v.state}
                            </div>
                          </TableCell>
                          <TableCell>{v.year_model}</TableCell>
                          <TableCell>
                            {v.km.toLocaleString('pt-BR')} km
                          </TableCell>
                          <TableCell className="font-semibold">
                            {v.price.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{v.fuel}</Badge>
                          </TableCell>
                          <TableCell>{v.transmission}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    brand: '',
    model: '',
    year_manufacture: new Date().getFullYear(),
    year_model: new Date().getFullYear(),
    km: '',
    price: '',
    fuel: 'FLEX',
    transmission: 'MANUAL',
    condition: 'used',
    city: '',
    state: '',
    image: '',
    description: '',
  });

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/dashboard/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          km: Number(form.km),
          price: Number(form.price),
          year_manufacture: Number(form.year_manufacture),
          year_model: Number(form.year_model),
          colors: [{ name: 'Única', quantity: 1 }],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao cadastrar');
      }
      toast.success('Veículo cadastrado!');
      setOpen(false);
      setForm({
        brand: '',
        model: '',
        year_manufacture: new Date().getFullYear(),
        year_model: new Date().getFullYear(),
        km: '',
        price: '',
        fuel: 'FLEX',
        transmission: 'MANUAL',
        condition: 'used',
        city: '',
        state: '',
        image: '',
        description: '',
      });
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Cadastrar veículo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar veículo manualmente</DialogTitle>
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
            <Label>Descrição (opcional)</Label>
            <Textarea value={form.description} onChange={update('description')} rows={3} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar veículo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}