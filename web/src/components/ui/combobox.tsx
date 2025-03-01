'use client';

import * as React from 'react';

import { cn } from '@/components/ui/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RiArrowDownSLine, RiCheckLine } from '@remixicon/react';

export const ComboBox = (props: {
  value: string | null;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText?: string;
  className?: string;
}) => {
  const {
    options,
    value,
    onValueChange,
    placeholder,
    searchPlaceholder,
    emptyText = 'No results found',
  } = props;

  const [open, setOpen] = React.useState(false);

  const foundItem = value
    ? options.find((framework) => framework.value === value)
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='secondary'
          role='combobox'
          aria-expanded={open}
          className='w-[200px] justify-between'
        >
          {foundItem?.label ?? placeholder}
          <RiArrowDownSLine className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[200px] p-0'>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  keywords={[item.label]}
                  onSelect={onValueChange}
                  className='text-black hover:bg-muted'
                >
                  <RiCheckLine
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === item.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
