import {
  getPerformanceSummary,
  type PerformanceSummary
} from './analytics.repository';

export const getDistributorPerformance = async (input: {
  distributorId: string;
  startDate?: string;
  endDate?: string;
}): Promise<PerformanceSummary> => {
  return await getPerformanceSummary(
    input.distributorId,
    input.startDate,
    input.endDate
  );
};
