import { useQuery } from '@tanstack/react-query';
import { getScanHistory } from '../api/integrations';
import { ScanHistoryFilters, ScanPaginatedResponse, ScanLogEntry } from '../types/integrations';

export function useScanHistory(page: number = 1, limit: number = 10, filters?: ScanHistoryFilters) {
  return useQuery<ScanPaginatedResponse<ScanLogEntry>>({
    queryKey: ['scanHistory', page, limit, filters],
    queryFn: () => getScanHistory(page, limit, filters),
    refetchInterval: 30000, // Auto-refresh scan logs every 30 seconds
    keepPreviousData: true,
  } as any);
}
