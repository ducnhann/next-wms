"use client";

import { ArrowUpDown, Check, Funnel } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
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
import { ScrollArea } from "@/components/ui/scroll-area";

import { useDebouncedInput } from "@/hooks/use-debounced-input";

interface FilterPopoverProps {
  label: string;
  options: { label: string; value: string }[];
  currentValue?: string | string[];
  onChange: (value: string | string[] | undefined) => void;
  isSort?: boolean;
  variant?: "single" | "multi-select";
}

export const FilterPopover = ({
  label,
  options,
  currentValue,
  onChange,
  isSort = false,
  variant = "single",
}: FilterPopoverProps) => {
  const [searchQuery, instantQuery, debouncedQuery] = useDebouncedInput(
    "",
    100,
  );

  const isFiltered =
    variant === "single"
      ? currentValue !== undefined && currentValue !== "default"
      : Array.isArray(currentValue) && currentValue.length > 0;

  const selectedValues = Array.isArray(currentValue) ? currentValue : [];
  const allSelected = selectedValues.length === 0;

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(debouncedQuery.toLowerCase()),
  );

  const toggleSelection = (value: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const currentArray = Array.isArray(currentValue) ? currentValue : [];
    const newSelected = currentArray.includes(value)
      ? currentArray.filter((v) => v !== value)
      : [...currentArray, value];
    onChange(newSelected.length === 0 ? undefined : newSelected);
  };

  const toggleAll = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    onChange(undefined);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={isFiltered ? "default" : "ghost"} size={"sm"}>
          {label}
          {variant === "multi-select" && selectedValues.length > 0 && (
            <span className="ml-1">({selectedValues.length})</span>
          )}
          {isSort ? <ArrowUpDown /> : <Funnel />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-50 p-0">
        <Command shouldFilter={false}>
          {variant === "multi-select" && (
            <CommandInput
              placeholder="Search..."
              value={instantQuery}
              onValueChange={searchQuery}
              className="h-9"
            />
          )}
          <CommandList>
            {variant === "multi-select" ? (
              <>
                <CommandGroup>
                  <CommandItem
                    onSelect={(_value) => toggleAll()}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <Checkbox
                      checked={allSelected}
                      className="pointer-events-none"
                    />
                    <span>All</span>
                  </CommandItem>
                </CommandGroup>
                <ScrollArea className="h-50">
                  <CommandGroup>
                    {filteredOptions.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={() => toggleSelection(option.value)}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Checkbox
                          checked={selectedValues.includes(option.value)}
                          className="pointer-events-none"
                        />
                        <span>{option.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </ScrollArea>
              </>
            ) : (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      onChange(
                        option.value === "all" ? undefined : option.value,
                      );
                    }}
                    className="flex justify-between"
                  >
                    {option.label}
                    {(currentValue === option.value ||
                      (currentValue === "default" &&
                        option.value === "default") ||
                      (!currentValue && option.value === "all")) && (
                      <Check className="h-4 w-4" />
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
};
