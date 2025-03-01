import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useCreateCall } from '@/query/call.query';
import { useRouter } from 'next/navigation';
import { DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const formSchema = z.object({
  website: z.string().url({ message: 'Please enter a valid URL' }),
  phoneNumber: z.string().min(1, { message: 'Phone number is required' }),
  personality: z.enum(['Gentle', 'Rude', 'Quick', 'Slow'], {
    required_error: 'Please select a personality',
  }),
});

type FormValues = z.infer<typeof formSchema>;

export const CreateCallDialog = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const { createCall } = useCreateCall();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      website: '',
      phoneNumber: '',
      personality: undefined,
    },
  });

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);

    try {
      const call = await createCall({
        status: 'pending',
        startedAt: new Date(),
        endedAt: null,
        recordingUrl: '',
        website: values.website,
        phoneNumber: values.phoneNumber,
        personality: values.personality,
      });

      setOpen(false);
      router.push(`/call/${call.id}`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Create Call</DialogTitle>
          <DialogDescription>
            Create a new call to start analyzing.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className='space-y-4 py-4'
          >
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
                    Enter the website URL to analyze
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='phoneNumber'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder='+1 (555) 123-4567' {...field} />
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

            <DialogFooter>
              <Button type='submit' disabled={loading}>
                {loading ? 'Creating...' : 'Create Call'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
