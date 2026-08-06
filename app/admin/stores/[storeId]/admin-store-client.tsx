'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Search, Shield, ArrowLeft, Store } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';
import VehicleFormDialog from '@/components/vehicle-form-dialog';
import { VehicleCard } from '@/components/vehicle-card';
import type { Vehicle } from '@/types/dashboard';

type StoreInfo = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  plan: string;
  active: boolean;
  created_at: string;
};

export default function AdminStoreClient({ store }: { store: StoreInfo }) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const apiBase = `/api/admin/stores/${store.id}/vehicles`;

  async function loadVehicles() {
    try {
      const res = await fetch(apiBase);
      const data = await res.json();
      setVehicles(
        (data.vehicles ?? []).map((v: Vehicle) => ({ ...v, colors: v.colors ?? [] }))
      );
    } catch {
      toast.error('Erro ao carregar veículos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) =>
      [v.brand, v.model, v.city, v.state, String(v.year_model), String(v.fuel)]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [vehicles, search]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <div className="font-semibold">{store.name}</div>
              <div className="text-xs text-muted-foreground">
                Estoque da loja · {store.city}/{store.state} · {store.plan}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin')}
            >
              Todas as lojas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              Meu painel
            </Button>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Veículos da loja</h1>
            <p className="text-sm text-muted-foreground">{vehicles.length} veículos no estoque</p>
          </div>
          <VehicleFormDialog
            apiBase={apiBase}
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar veículo
              </Button>
            }
            title="Cadastrar veículo"
            submitLabel="Salvar veículo"
            onSaved={loadVehicles}
          />
        </div>

        <div className="relative">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por marca, modelo, cidade, ano..."
            className="pl-9"
          />
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Veículos</CardTitle>
            <CardDescription>Gerencie o estoque da loja como administrador</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum veículo cadastrado nesta loja.
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum resultado para sua busca.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((v) => (
                  <VehicleCard
                    key={v.id}
                    apiBase={apiBase}
                    vehicle={v}
                    onChanged={loadVehicles}
                    onDeleted={loadVehicles}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}