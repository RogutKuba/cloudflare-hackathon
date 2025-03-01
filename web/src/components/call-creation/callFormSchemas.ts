import * as z from 'zod';

// First stage form schema
export const stageOneSchema = z.object({
  website: z.string().url({ message: 'Please enter a valid URL' }),
  phoneNumber: z.string().min(1, { message: 'Phone number is required' }),
  personality: z.enum(['Gentle', 'Rude', 'Quick', 'Slow'], {
    required_error: 'Please select a personality',
  }),
  target: z.string().min(1, { message: 'Target is required' }),
});

// Second stage form schema
export const stageTwoSchema = z.object({
  customPhrase: z.string().optional(),
});

export type StageOneValues = z.infer<typeof stageOneSchema>;
export type StageTwoValues = z.infer<typeof stageTwoSchema>;
