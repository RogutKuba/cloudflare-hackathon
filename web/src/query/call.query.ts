import { CallEntity } from '@/lib/db/call.db';
import { useCurrentCallId } from '@/lib/getPathParam';
import { useQuery } from '@tanstack/react-query';

export const useCall = () => {
  const callId = useCurrentCallId();

  const query = useQuery({
    queryKey: ['call', callId],
    queryFn: async () => {
      const response = await fetch(`/api/calls/${callId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch call');
      }

      return response.json() as Promise<CallEntity>;
    },
  });

  return {
    call: query.data,
    ...query,
  };
};
