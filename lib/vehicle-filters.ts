import { z } from 'zod';

export const VehicleFiltersSchema = z.object({
  store_id: z.string().uuid().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  fuel: z.string().optional(),
  transmission: z.string().optional(),
  condition: z.enum(['new', 'used']).optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional(),

  price_min: z.coerce.number().nonnegative().optional(),
  price_max: z.coerce.number().positive().optional(),
  year_min: z.coerce.number().int().optional(),
  year_max: z.coerce.number().int().optional(),
  km_min: z.coerce.number().int().nonnegative().optional(),
  km_max: z.coerce.number().int().nonnegative().optional(),

  q: z.string().optional(),

  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),

  order_by: z.enum(['price', 'km', 'year_model', 'created_at']).default('created_at'),
  order_dir: z.enum(['asc', 'desc']).default('desc'),
});

export type VehicleFilters = z.infer<typeof VehicleFiltersSchema>;