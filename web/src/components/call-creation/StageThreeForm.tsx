import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { RiLoader2Fill } from '@remixicon/react';
import { useRouter } from 'next/navigation';

// Form schema for stage three
const stageThreeSchema = z.object({
  script: z.string().min(1, { message: 'Please enter a script' }),
});

type StageThreeValues = z.infer<typeof stageThreeSchema>;

interface StageThreeFormProps {
  callId: string;
  baseScript: string;
  onSubmit: (values: StageThreeValues) => void;
}

export const StageThreeForm = ({
  callId,
  baseScript,
  onSubmit,
}: StageThreeFormProps) => {
  const form = useForm<StageThreeValues>({
    resolver: zodResolver(stageThreeSchema),
    defaultValues: {
      script: baseScript,
    },
  });

  const handleSubmit = (values: StageThreeValues) => {
    onSubmit(values);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Customize Call Script</DialogTitle>
        <DialogDescription>
          Review the call script and add a weird phrase for the AI to slip into
          the conversation
        </DialogDescription>
      </DialogHeader>

      <div className='space-y-4 py-4'>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='script'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persona</FormLabel>
                  <FormControl>
                    <Textarea className='min-h-[200px]' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* <FormField
              control={form.control}
              name='weirdPhrase'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weird Phrase</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='The moon landing was filmed in my backyard last Tuesday'
                      className='resize-none'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter a strange phrase that the AI will try to naturally
                    incorporate into the conversation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            /> */}

            <DialogFooter className='flex justify-between'>
              <Button type='submit'>Start Call</Button>
            </DialogFooter>
          </form>
        </Form>
      </div>
    </>
  );
};
