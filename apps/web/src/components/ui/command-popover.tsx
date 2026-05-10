"use client";

import { Check } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDebouncedInput } from "@/hooks/use-debounced-input";

interface CommandPopoverOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
  /** Optional custom content to display in the list */
  content?: React.ReactNode;
}

interface CommandPopoverProps<T = string> {
  /** Options to display in the list */
  options: CommandPopoverOption<T>[];
  /** Currently selected value(s) */
  value?: T | T[];
  /** Callback when value changes */
  onValueChange: (value: T | T[] | undefined) => void;
  /** The trigger button or custom trigger element */
  trigger?: React.ReactNode;
  /** Placeholder text for the trigger button */
  placeholder?: string;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** Text to display when no results are found */
  emptyText?: string;
  /** Whether to allow multiple selections */
  multiple?: boolean;
  /** Whether the popover is open (controlled) */
  open?: boolean;
  /** Callback when open state changes (controlled) */
  onOpenChange?: (open: boolean) => void;
  /** Custom class name for the popover content */
  contentClassName?: string;
  /** Alignment of the popover */
  align?: "start" | "center" | "end";
  /** Custom function to render selected value(s) in trigger */
  renderValue?: (value: T | T[] | undefined) => React.ReactNode;
  /** Custom function to filter options */
  filterFn?: (option: CommandPopoverOption<T>, search: string) => boolean;
  /** Whether to show the check icon for selected items */
  showCheck?: boolean;
  /** Disable search functionality */
  disableSearch?: boolean;
  /** Custom trigger button variant */
  triggerVariant?: "default" | "outline" | "ghost" | "destructive";
  /** Custom trigger button size */
  triggerSize?: "default" | "sm" | "lg" | "icon" | "icon-sm";
  /** Group heading text */
  groupHeading?: string;
}

export function CommandPopover<T = string>({
  options,
  value,
  onValueChange,
  trigger,
  placeholder = "Select option",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  multiple = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  contentClassName,
  align = "start",
  renderValue,
  filterFn,
  showCheck = true,
  disableSearch = false,
  triggerVariant = "outline",
  triggerSize = "default",
  groupHeading,
}: CommandPopoverProps<T>) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [setSearchQuery, instantSearchQuery, debouncedSearchQuery] =
    useDebouncedInput("", 100);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? controlledOnOpenChange ?? (() => {})
    : setInternalOpen;

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  // Default filter function
  const defaultFilterFn = (
    option: CommandPopoverOption<T>,
    search: string,
  ) => {
    return option.label.toLowerCase().includes(search.toLowerCase());
  };

  const filteredOptions = debouncedSearchQuery
    ? options.filter((option) =>
        (filterFn ?? defaultFilterFn)(option, debouncedSearchQuery),
      )
    : options;

  const handleSelect = (selectedValue: T) => {
    if (multiple) {
      const newValue = selectedValues.includes(selectedValue)
        ? selectedValues.filter((v) => v !== selectedValue)
        : [...selectedValues, selectedValue];
      onValueChange(newValue.length === 0 ? undefined : newValue);
    } else {
      onValueChange(selectedValue);
      setOpen(false);
      setSearchQuery("");
    }
  };

  const isSelected = (optionValue: T) => {
    return selectedValues.some((v) => v === optionValue);
  };

  // Default value renderer
  const defaultRenderValue = () => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return placeholder;
    }

    if (Array.isArray(value)) {
      if (value.length === 1) {
        const option = options.find((opt) => opt.value === value[0]);
        return option?.label ?? placeholder;
      }
      return `${value.length} selected`;
    }

    const option = options.find((opt) => opt.value === value);
    return option?.label ?? placeholder;
  };

  const triggerContent = trigger ?? (
    <Button
      variant={triggerVariant}
      size={triggerSize}
      className={cn(
        "w-full justify-between",
        !value && "text-muted-foreground",
      )}
    >
      {renderValue ? renderValue(value) : defaultRenderValue()}
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerContent}</PopoverTrigger>
      <PopoverContent
        className={cn("w-50 p-0", contentClassName)}
        align={align}
      >
        <Command shouldFilter={false}>
          {!disableSearch && (
            <CommandInput
              placeholder={searchPlaceholder}
              value={instantSearchQuery}
              onValueChange={setSearchQuery}
            />
          )}
          <CommandList>
            {filteredOptions.length === 0 ? (
              <CommandEmpty>{emptyText}</CommandEmpty>
            ) : (
              <CommandGroup heading={groupHeading}>
                {filteredOptions.map((option, index) => (
                  <CommandItem
                    key={`${option.value}-${index}`}
                    value={String(option.value)}
                    onSelect={() => handleSelect(option.value)}
                    disabled={option.disabled}
                    className="flex cursor-pointer items-center justify-between"
                  >
                    {option.content ?? <span>{option.label}</span>}
                    {showCheck && isSelected(option.value) && (
                      <Check className="ml-2 size-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
