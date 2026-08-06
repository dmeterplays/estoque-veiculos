'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { MoreVertical, Pencil, Trash2, Power, PowerOff, Loader2, Car, Play } from 'lucide-react';
import VehicleFormDialog from '@/components/vehicle-form-dialog';
import type { Vehicle } from '@/types/dashboard';

export function VehicleActions({
  apiBase,
  vehicle,
  onChanged,
  onDeleted,
}: {
  apiBase: string;
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
      const res = await fetch(`${apiBase}/${vehicle.id}`, {
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
      const res = await fetch(`${apiBase}/${vehicle.id}`, {
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
        apiBase={apiBase}
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

export function VehicleCard({
  apiBase,
  vehicle,
  onChanged,
  onDeleted,
}: {
  apiBase: string;
  vehicle: Vehicle;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const mainImg =
    vehicle.media?.find((m) => m.is_main && m.kind === 'image')?.url ??
    vehicle.media?.find((m) => m.kind === 'image')?.url ??
    vehicle.image;
  const isAvailable = vehicle.active !== false;
  const hasVideo = (vehicle.media ?? []).filter((m) => m.kind === 'video').length > 0;

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow overflow-hidden">
      <div className="aspect-[4/3] bg-muted relative">
        {mainImg ? (
          <img
            src={mainImg}
            alt={`${vehicle.brand} ${vehicle.model}`}
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
          {hasVideo && (
            <Badge variant="secondary" className="text-[10px]">
              <Play className="h-3 w-3 mr-1" /> vídeo
            </Badge>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold truncate">
              {vehicle.brand} {vehicle.model}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {vehicle.year_model} · {vehicle.km.toLocaleString('pt-BR')} km ·{' '}
              {vehicle.city}/{vehicle.state}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <VehicleActions
              apiBase={apiBase}
              vehicle={vehicle}
              onChanged={onChanged}
              onDeleted={onDeleted}
            />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-lg">
            {vehicle.price.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </span>
          <Badge
            variant={isAvailable ? 'secondary' : 'outline'}
            className={isAvailable ? 'text-green-700 border-green-300' : ''}
          >
            {isAvailable ? 'Disponível' : 'Indisponível'}
          </Badge>
        </div>
      </div>
    </div>
  );
}