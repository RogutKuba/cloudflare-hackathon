import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateCall, useGenerateScript } from '@/query/call.query';
import { StageOneForm } from '@/components/call-creation/StageOneForm';
import { StageTwo } from '@/components/call-creation/StageTwo';
import { StageThreeForm } from '@/components/call-creation/StageThreeForm';
import { StageOneValues } from '@/components/call-creation/callFormSchemas';
import { CallEntity } from '@/lib/db/call.db';
import { generateScriptPoints } from '@/components/call-creation/callUtils';

export const CreateCallDialog = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [scriptPoints, setScriptPoints] = useState<string[]>([]);

  const router = useRouter();
  const { createCall } = useCreateCall();
  const { generateScript } = useGenerateScript();
  const [currentCall, setCurrentCall] = useState<CallEntity | null>(null);

  const [persona, setPersona] = useState<string | null>(null);

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
        phoneNumber: values.phoneNumber,
      });

      // Generate script points based on personality
      const points = generateScriptPoints(values.personality);
      setScriptPoints(points);

      setCurrentCall(call);
      setStage(2);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStageTwoSubmit = async () => {
    setLoading(true);
    try {
      const { persona } = await generateScript(currentCall?.id ?? 'test');
      setPersona(persona);
      setStage(3);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStageThreeSubmit = async (values: {
    script: string;
    weirdPhrase: string;
  }) => {
    setLoading(true);
    try {
      // Update the call with the weird phrase
      // This would be an API call to update the call

      const response = await fetch(`/api/calls/${currentCall?.id}/start`, {
        method: 'POST',
        body: JSON.stringify({
          script: persona,
          phoneNumber: currentCall?.phoneNumber,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start call');
      }

      const data = (await response.json()) as {
        call_id: string;
      };

      // Navigate to the call page
      setOpen(false);
      router.push(`/call/${data.call_id}`);
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
            onSubmit={handleStageTwoSubmit}
            loading={loading}
          />
        ) : (
          <StageThreeForm
            callId={currentCall?.id ?? ''}
            baseScript={persona ?? ''}
            onSubmit={handleStageThreeSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
