'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { Loader2, Plus, Shield, Copy, Check } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';

type Store = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  plan: string;
  api_key: string;
  created_at: string;
  users: { id: string; full_name: string | null }[] | null;
};

export default function AdminClient() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadStores = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stores');
      const data = await res.json();
      setStores(data.stores ?? []);
    } catch {
      toast.error('Erro ao carregar lojas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  async function copyKey(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error('Não foi possível copiar');
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <div className="font-semibold">Painel Administrativo</div>
              <div className="text-xs text-muted-foreground">
                Gestão de lojas da plataforma
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
              Docs API
            </a>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lojas cadastradas</h1>
            <p className="text-sm text-muted-foreground">
              {stores.length} lojas na plataforma
            </p>
          </div>
          <CreateStoreDialog onCreated={loadStores} />
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : stores.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma loja cadastrada ainda. Clique em "Nova loja" para começar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loja</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Usuários</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <button
                          onClick={() => router.push(`/admin/stores/${s.id}`)}
                          className="text-left font-medium hover:text-primary hover:underline"
                        >
                          {s.name}
                        </button>
                        <div className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {s.city}/{s.state}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{s.plan}</Badge>
                      </TableCell>
                      <TableCell>
                        {s.users && s.users.length > 0
                          ? s.users.map((u) => u.full_name).join(', ')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyKey(s.api_key)}
                        >
                          {copiedKey === s.api_key ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span className="ml-1 text-xs">Copiar</span>
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => router.push(`/admin/stores/${s.id}`)}
                        >
                          Ver estoque
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function CreateStoreDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    cnpj: '',
    city: '',
    state: '',
    whatsapp: '',
    plan: 'free',
    owner_name: '',
    owner_email: '',
    owner_password: '',
  });

  function update(field: keyof typeof form) {
    return (
      e: React.ChangeEvent<HTMLInputElement>
    ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar loja');
      }
      const data = await res.json();
      toast.success(`Loja criada! API key: ${data.store.api_key}`);
      setOpen(false);
      setForm({
        name: '',
        cnpj: '',
        city: '',
        state: '',
        whatsapp: '',
        plan: 'free',
        owner_name: '',
        owner_email: '',
        owner_password: '',
      });
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar loja');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova loja
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar nova loja</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da loja</Label>
            <Input value={form.name} onChange={update('name')} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.city} onChange={update('city')} />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Input value={form.state} onChange={update('state')} maxLength={2} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>CNPJ (opcional)</Label>
            <Input value={form.cnpj} onChange={update('cnpj')} />
          </div>

          <div className="space-y-1.5">
            <Label>WhatsApp (opcional)</Label>
            <Input value={form.whatsapp} onChange={update('whatsapp')} />
          </div>

          <div className="space-y-1.5">
            <Label>Plano</Label>
            <Select
              value={form.plan}
              onValueChange={(v) => setForm((p) => ({ ...p, plan: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4 space-y-4">
            <p className="text-sm font-medium">Dados do dono da loja</p>
            <div className="space-y-1.5">
              <Label>Nome do responsável</Label>
              <Input value={form.owner_name} onChange={update('owner_name')} required />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.owner_email} onChange={update('owner_email')} required />
            </div>
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input
                type="password"
                value={form.owner_password}
                onChange={update('owner_password')}
                placeholder="Deixe vazio para enviar convite"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar loja
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
