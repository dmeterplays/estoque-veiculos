import { z } from 'zod';

export const VehicleColorSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const VehicleInputSchema = z.object({
  external_id: z.string().optional().nullable(),
  fuel: z.string().min(1),
  transmission: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  brand: z.string().min(1),
  model: z.string().min(1),
  colors: z.array(VehicleColorSchema).default([]),
  image: z.string().url().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  videoOrder: z.number().int().default(0),
  preparationReleaseDate: z.string().nullable().optional(),
  description: z.string().nullable().optional(),

  price: z.number().positive(),
  year_manufacture: z.number().int().min(1900).max(2100),
  year_model: z.number().int().min(1900).max(2100),
  km: z.number().int().min(0),

  condition: z.enum(['new', 'used']).default('used'),
  plate_end: z.string().optional().nullable(),
});

export const InventorySyncSchema = z.object({
  vehicles: z.array(VehicleInputSchema),
});

export type VehicleInput = z.infer<typeof VehicleInputSchema>;
export type InventorySync = z.infer<typeof InventorySyncSchema>;
export type VehicleColor = z.infer<typeof VehicleColorSchema>;