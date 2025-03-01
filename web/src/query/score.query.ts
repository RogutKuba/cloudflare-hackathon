import { CallScoreEntity } from '@/lib/db/callScore.db';
import { useQuery } from '@tanstack/react-query';
import { useCurrentCallId } from '@/lib/getPathParam';

export const useCallScores = () => {
  const callId = useCurrentCallId();

  const query = useQuery({
    queryKey: ['call', callId, 'scores'],
    queryFn: async () => {
      const response = await fetch(`/api/calls/${callId}/scores`);

      if (!response.ok) {
        throw new Error('Failed to fetch scores');
      }

      return response.json() as Promise<CallScoreEntity[]>;
    },
  });

  return {
    scores: query.data,
    ...query,
  };
};
