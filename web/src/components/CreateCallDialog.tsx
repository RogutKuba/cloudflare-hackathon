import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateCall } from '@/query/call.query';
import { StageOneForm } from '@/components/call-creation/StageOneForm';
import { StageTwo } from '@/components/call-creation/StageTwo';
import { StageOneValues } from '@/components/call-creation/callFormSchemas';
import { CallEntity } from '@/lib/db/call.db';

export const CreateCallDialog = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<1 | 2 | 3>(1);

  const router = useRouter();
  const { createCall } = useCreateCall();

  const [currentCall, setCurrentCall] = useState<CallEntity | null>(null);

  const handleInitialSubmit = async (values: StageOneValues) => {
    setLoading(true);
    try {
      const call = await createCall({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        status: 'pending',
        startedAt: new Date().toISOString(),
        endedAt: null,
        recordingUrl: '',
        website: values.website,
        persona: values.personality,
        target: values.target,
        transcript: [],
        duration: 0,
      });

      setCurrentCall(call);
      setStage(2);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='sm:max-w-[600px]'>
        {stage === 1 ? (
          <StageOneForm onSubmit={handleInitialSubmit} loading={loading} />
        ) : stage === 2 ? (
          <StageTwo
            callId={currentCall?.id ?? ''}
            onSubmit={() => setStage(3)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
