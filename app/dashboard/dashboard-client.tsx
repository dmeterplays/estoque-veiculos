'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Loader2,
  Car,
  KeyRound,
  Copy,
  Check,
  Plus,
  Search,
} from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';
import VehicleFormDialog from '@/components/vehicle-form-dialog';
import { VehicleCard } from '@/components/vehicle-card';
import { ImportVehiclesDialog } from '@/components/import-vehicles-dialog';
import type { Vehicle } from '@/types/dashboard';

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [syncs, setSyncs] = useState<Sync[]>([]);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');

  const apiKey = store?.api_key ?? '';

  async function loadVehicles() {
    setVehiclesLoading(true);
    try {
      const res = await fetch('/dashboard/data');
      const data = await res.json();
      setVehicles(data.vehicles ?? []);
    } catch {
      toast.error('Erro ao carregar veÃ­culos');
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
      toast.error('NÃ£o foi possÃ­vel copiar');
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

  const filteredVehicles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return vehicles;
    return vehicles.filter((v) =>
      [
        v.brand,
        v.model,
        v.city,
        v.state,
        String(v.year_model),
        v.fuel,
        v.transmission,
        v.condition === 'new' ? 'novo' : 'usado',
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [vehicles, search]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Car className="h-6 w-6 text-primary" />
            <div>
              <div className="font-semibold">{store?.name ?? 'Loja'}</div>
              <div className="text-xs text-muted-foreground">
                {fullName} Â· {userEmail}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
              Docs API
            </a>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="veiculos">
          <TabsList className="mb-6">
            <TabsTrigger value="veiculos">Meu estoque</TabsTrigger>
            <TabsTrigger value="synced">SincronizaÃ§Ãµes</TabsTrigger>
            <TabsTrigger value="apikey">IntegraÃ§Ã£o</TabsTrigger>
          </TabsList>

          {/* ===== Estoque ===== */}
          <TabsContent value="veiculos">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl">{stats.total}</CardTitle>
                  <CardDescription>VeÃ­culos no estoque</CardDescription>
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
                  <CardDescription>PreÃ§o mÃ©dio</CardDescription>
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

            <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por marca, modelo, cidade, ano..."
                  className="pl-9"
                />
              </div>
              <ImportVehiclesDialog onImported={loadVehicles} />
              <VehicleFormDialog
                apiBase="/dashboard/vehicles"
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar veículo
                  </Button>
                }
                title="Cadastrar veículo manualmente"
                submitLabel="Salvar veículo"
                onSaved={loadVehicles}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>VeÃ­culos</CardTitle>
                <CardDescription>
                  {vehicles.length} veÃ­culos vinculados Ã  sua loja
                </CardDescription>
              </CardHeader>
              <CardContent>
                {vehiclesLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum veÃ­culo cadastrado ainda.
                    <br />
                    Envie seu estoque via API (aba API Key) ou cadastre manualmente.
                  </div>
                ) : filteredVehicles.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum resultado para sua busca.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredVehicles.map((v) => (
                      <VehicleCard
                        key={v.id}
                        apiBase="/dashboard/vehicles"
                        vehicle={v}
                        onChanged={loadVehicles}
                        onDeleted={loadVehicles}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== SincronizaÃ§Ãµes ===== */}
          <TabsContent value="synced">
            <Card>
              <CardHeader>
                <CardTitle>HistÃ³rico de sincronizaÃ§Ãµes</CardTitle>
                <CardDescription>
                  Registro de quando o estoque foi enviado via API
                </CardDescription>
              </CardHeader>
              <CardContent>
                {syncs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhuma sincronizaÃ§Ã£o registrada ainda.
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
                  Use esta chave para enviar o estoque e consultar veÃ­culos
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
                  <Label>Consultar veÃ­culos (GET)</Label>
                  <code className="block bg-muted rounded p-3 text-sm break-all">
                    GET https://estoque.viralstudios.com.br/api/v1/vehicles
                  </code>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <KeyRound className="h-3 w-3" />
                    Sua capacidade de consulta total do prÃ³prio estoque Ã© ilimitada
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

