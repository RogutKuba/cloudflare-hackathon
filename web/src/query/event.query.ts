import { useQuery } from '@tanstack/react-query';
import { CallEventEntity } from '@/lib/db/callEvent.db';
import { useCurrentCallId } from '@/lib/getPathParam';

export const useCallEvents = () => {
  const callId = useCurrentCallId();

  const query = useQuery({
    queryKey: ['call', callId, 'events'],
    queryFn: async () => {
      const response = await fetch(`/api/calls/${callId}/events`);

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      return response.json() as Promise<CallEventEntity[]>;
    },
    refetchInterval: 2500,
  });

  return {
    events: query.data,
    ...query,
  };
};
