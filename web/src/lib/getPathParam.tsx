import { useParams } from 'next/navigation';

export const useCurrentCallId = () => {
  const params = useParams<{ id: string }>();
  return params.id as string;
};
