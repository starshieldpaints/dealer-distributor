import type { Request } from 'express';
import { HttpError } from '../../lib/httpError';
import {
  createDistributor,
  createRetailer,
  getDistributorById,
  listDistributors,
  listRetailers,
  type DistributorSummary,
  type RetailerSummary
} from './distributor.repository';

const ensureAdmin = (user: Request['user'] | undefined): void => {
  if (!user || user.role !== 'admin') {
    throw new HttpError(403, 'Admin privileges required');
  }
};

const resolveDistributorScope = (
  user: Request['user'] | undefined,
  requested?: string
): string => {
  if (!user) {
    throw new HttpError(401, 'Authentication required');
  }
  if (user.role === 'admin') {
    if (!requested) {
      throw new HttpError(400, 'distributorId is required');
    }
    return requested;
  }
  const scoped = user.distributorId;
  if (!scoped) {
    throw new HttpError(403, 'No distributor scope assigned');
  }
  if (requested && requested !== scoped) {
    throw new HttpError(403, 'Access denied for requested distributor');
  }
  return scoped;
};

interface DistributorFilterInput {
  parentId?: string;
  territoryId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const getDistributorsForUser = async (
  user: Request['user'] | undefined,
  filter: DistributorFilterInput
): Promise<DistributorSummary[]> => {
  if (!user) {
    throw new HttpError(401, 'Authentication required');
  }
  if (user.role !== 'admin') {
    const distributorId = user.distributorId;
    if (!distributorId) {
      throw new HttpError(403, 'No distributor assigned to current user');
    }
    const distributor = await getDistributorById(distributorId);
    return distributor ? [distributor] : [];
  }
  return await listDistributors(filter);
};

interface CreateDistributorInput {
  name: string;
  code: string;
  parentId?: string;
  territoryId?: string;
  currency?: string;
  creditLimit?: number;
}

export const createDistributorRecord = async (
  input: CreateDistributorInput,
  user: Request['user'] | undefined
): Promise<DistributorSummary> => {
  ensureAdmin(user);
  return await createDistributor(input);
};

export const getDistributorProfile = async (
  id: string,
  user: Request['user'] | undefined
): Promise<DistributorSummary> => {
  if (!user) {
    throw new HttpError(401, 'Authentication required');
  }
  if (user.role !== 'admin') {
    const scoped = user.distributorId;
    if (!scoped || scoped !== id) {
      throw new HttpError(403, 'Access denied');
    }
  }
  const distributor = await getDistributorById(id);
  if (!distributor) {
    throw new HttpError(404, 'Distributor not found');
  }
  return distributor;
};

interface RetailerFilterInput {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export const listDistributorRetailers = async (
  distributorId: string | undefined,
  filter: RetailerFilterInput,
  user: Request['user'] | undefined
): Promise<RetailerSummary[]> => {
  const scoped = resolveDistributorScope(user, distributorId);
  return await listRetailers(scoped, filter);
};

interface CreateRetailerInput {
  distributorId?: string;
  name: string;
  channel?: string;
  address?: Record<string, any>;
  geoLat?: number;
  geoLng?: number;
}

export const createDistributorRetailer = async (
  input: CreateRetailerInput,
  user: Request['user'] | undefined
): Promise<RetailerSummary> => {
  const scoped = resolveDistributorScope(user, input.distributorId);
  const distributor = await getDistributorById(scoped);
  if (!distributor) {
    throw new HttpError(404, 'Distributor not found');
  }
  return await createRetailer({
    distributorId: scoped,
    name: input.name,
    channel: input.channel,
    address: input.address,
    geoLat: input.geoLat,
    geoLng: input.geoLng
  });
};
