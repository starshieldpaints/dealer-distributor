import { z } from 'zod';

export const listDistributorsSchema = {
  query: z.object({
    parentId: z.string().uuid().optional(),
    territoryId: z.string().uuid().optional(),
    search: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional()
  })
};

export const createDistributorSchema = {
  body: z.object({
    name: z.string().min(2),
    code: z.string().min(2),
    parentId: z.string().uuid().optional(),
    territoryId: z.string().uuid().optional(),
    currency: z.string().length(3).optional(),
    creditLimit: z.number().nonnegative().optional()
  })
};

export const distributorIdParam = {
  params: z.object({
    id: z.string().uuid()
  })
};

export const listRetailersSchema = {
  query: z.object({
    distributorId: z.string().uuid().optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional()
  })
};

export const createRetailerSchema = {
  body: z.object({
    distributorId: z.string().uuid().optional(),
    name: z.string().min(2),
    channel: z.string().optional(),
    address: z.record(z.any()).optional(),
    geoLat: z.number().optional(),
    geoLng: z.number().optional()
  })
};
