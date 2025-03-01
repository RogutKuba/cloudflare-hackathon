import { CallEntity } from '@/lib/db/call.db';
import { useCurrentCallId } from '@/lib/getPathParam';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

export const useCalls = () => {
  const query = useQuery({
    queryKey: ['calls'],
    queryFn: async () => {
      const response = await fetch('/api/calls');

      if (!response.ok) {
        throw new Error('Failed to fetch calls');
      }

      return response.json() as Promise<CallEntity[]>;
    },
  });

  return {
    calls: query.data,
    ...query,
  };
};

export const useCreateCall = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (call: Omit<CallEntity, 'id' | 'createdAt'>) => {
      const response = await fetch('/api/calls', {
        method: 'POST',
        body: JSON.stringify(call),
      });

      if (!response.ok) {
        throw new Error('Failed to create call');
      }

      return response.json() as Promise<CallEntity>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['calls'], (old: CallEntity[] | undefined) => [
        ...(old ?? []),
        data,
      ]);

      queryClient.setQueryData(['call', data.id], data);
    },
  });

  return {
    createCall: mutation.mutateAsync,
    ...mutation,
  };
};
