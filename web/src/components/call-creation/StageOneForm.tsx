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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { StageOneValues, stageOneSchema } from './callFormSchemas';
import { RiLoader2Fill } from '@remixicon/react';
import { Textarea } from '@/components/ui/textarea';

interface StageOneFormProps {
  onSubmit: (values: StageOneValues) => void;
  loading: boolean;
}

export const StageOneForm = ({ onSubmit, loading }: StageOneFormProps) => {
  const form = useForm<StageOneValues>({
    resolver: zodResolver(stageOneSchema),
    defaultValues: {
      website: '',
      phoneNumber: '',
      personality: undefined,
      target: '',
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Call</DialogTitle>
        <DialogDescription>
          Enter basic information to create a new call.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 py-4'>
          <FormField
            control={form.control}
            name='phoneNumber'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder='9053911039' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='personality'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Personality</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select a personality' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='Gentle'>Gentle</SelectItem>
                    <SelectItem value='Rude'>Rude</SelectItem>
                    <SelectItem value='Quick'>Quick</SelectItem>
                    <SelectItem value='Slow'>Slow</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose the personality type for this call
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='target'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='Test the agents knowledge of model documentation'
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Enter the target of the call. For example, if you want to
                  target a specific problem or issue to test the agent's ability
                  to solve it.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='website'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder='https://example.com' {...field} />
                </FormControl>
                <FormDescription>
                  Enter the website URL to give more context to the agent
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button type='submit' disabled={loading}>
              {loading ? (
                <RiLoader2Fill className='h-4 w-4 animate-spin' />
              ) : null}
              Next
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
