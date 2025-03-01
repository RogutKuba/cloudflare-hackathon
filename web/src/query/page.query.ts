import { useQuery } from '@tanstack/react-query';
import { PageEntity } from '@/lib/db/page.db';

export const useCrawledPages = (params: { callId: string }) => {
  const { callId } = params;

  const query = useQuery({
    queryKey: ['call', callId, 'pages'],
    queryFn: async () => {
      const response = await fetch(`/api/calls/${callId}/pages`);

      if (!response.ok) {
        throw new Error('Failed to fetch pages');
      }

      return response.json() as Promise<PageEntity[]>;
    },
    refetchInterval: 1000,
  });

  return {
    pages: query.data,
    ...query,
  };
};
