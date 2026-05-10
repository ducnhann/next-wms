"use client";

import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import React, { type FC, type JSX, useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { DateInput } from "./date-input";
import { Label } from "./label";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Switch } from "./switch";
// import {
//   WheelPicker,
//   WheelPickerWrapper,
//   type WheelPickerOption,
// } from "@/components/wheel-picker";

export type DateRangePickerProps = {
  /** Click handler for applying the updates from DateRangePicker. */
  onUpdate?: (values: {
    range: DateRange;
    rangeCompare?: DateRange;
    /** Selected preset name, or null if custom range */
    preset: PresetName | null;
    /** Human-readable period label (e.g., "Last 7 days" or "Custom range") */
    periodLabel: string;
  }) => void;
  /** Initial value for start date */
  initialDateFrom?: Date | string;
  /** Initial value for end date */
  initialDateTo?: Date | string;
  /** Initial value for start date for compare */
  initialCompareFrom?: Date | string;
  /** Initial value for end date for compare */
  initialCompareTo?: Date | string;
  /** Alignment of popover */
  align?: "start" | "center" | "end";
  /** Option for locale */
  locale?: string;
  /** Option for showing compare feature */
  showCompare?: boolean;
};

const formatDate = (date: Date | undefined, locale = "en-us"): string => {
  if (!date) return "";
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getDateAdjustedForTimezone = (dateInput: Date | string): Date => {
  if (typeof dateInput === "string") {
    // Split the date string to get year, month, and day parts
    const parts = dateInput.split("-").map((part) => Number.parseInt(part, 10));
    // Create a new Date object using the local timezone
    // Note: Month is 0-indexed, so subtract 1 from the month part
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date;
  }
  // If dateInput is already a Date object, return it directly
  return dateInput;
};

export type DateRange = {
  from: Date;
  to: Date | undefined;
};
/** Preset name type for type-safe preset handling */
export type PresetName =
  | "last7"
  | "last14"
  | "last30"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth";

export type Preset = {
  name: PresetName;
  label: string;
};

/** Available date range presets */
export const PRESETS: Preset[] = [
  { name: "last7", label: "Last 7 days" },
  { name: "last14", label: "Last 14 days" },
  { name: "last30", label: "Last 30 days" },
  { name: "thisWeek", label: "This Week" },
  { name: "lastWeek", label: "Last Week" },
  { name: "thisMonth", label: "This Month" },
  { name: "lastMonth", label: "Last Month" },
];

/**
 * Get date range from a preset name.
 * Exported for reuse in stores and other components.
 */
export function getPresetDateRange(preset: PresetName): DateRange {
  const from = new Date();
  const to = new Date();
  const first = from.getDate() - from.getDay();

  switch (preset) {
    case "last7":
      from.setDate(from.getDate() - 6);
      break;
    case "last14":
      from.setDate(from.getDate() - 13);
      break;
    case "last30":
      from.setDate(from.getDate() - 29);
      break;
    case "thisWeek":
      from.setDate(first);
      break;
    case "lastWeek":
      from.setDate(from.getDate() - 7 - from.getDay());
      to.setDate(to.getDate() - to.getDay() - 1);
      break;
    case "thisMonth":
      from.setDate(1);
      break;
    case "lastMonth":
      from.setMonth(from.getMonth() - 1);
      from.setDate(1);
      to.setDate(0);
      break;
  }

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

// const WHEELPICKER_PRESETS: WheelPickerOption[] = PRESETS.map((preset) => ({
//   label: preset.label,
//   value: preset.name
// }))

/** The DateRangePicker component allows a user to select a range of dates */
export const DateRangePicker: FC<DateRangePickerProps> & {
  filePath: string;
} = ({
  initialDateFrom,
  initialDateTo,
  initialCompareFrom,
  initialCompareTo,
  onUpdate,
  align = "end",
  locale = "en-US",
  showCompare = true,
}): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);

  // Default to last30 days if no initial values provided
  const defaultRange = getPresetDateRange("last30");
  const [range, setRange] = useState<DateRange>({
    from: initialDateFrom
      ? getDateAdjustedForTimezone(initialDateFrom)
      : defaultRange.from,
    to: initialDateTo
      ? getDateAdjustedForTimezone(initialDateTo)
      : defaultRange.to,
  });
  const [rangeCompare, setRangeCompare] = useState<DateRange | undefined>(
    initialCompareFrom
      ? {
          from: new Date(new Date(initialCompareFrom).setHours(0, 0, 0, 0)),
          to: initialCompareTo
            ? new Date(new Date(initialCompareTo).setHours(0, 0, 0, 0))
            : new Date(new Date(initialCompareFrom).setHours(0, 0, 0, 0)),
        }
      : undefined,
  );

  // Refs to store the values of range and rangeCompare when the date picker is opened
  const openedRangeRef = useRef<DateRange | undefined>(undefined);
  const openedRangeCompareRef = useRef<DateRange | undefined>(undefined);

  // Default to 'last30' preset
  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(
    "last30",
  );

  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== "undefined" ? window.innerWidth < 960 : false,
  );

  useEffect(() => {
    const handleResize = (): void => {
      setIsSmallScreen(window.innerWidth < 960);
    };

    window.addEventListener("resize", handleResize);

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const getPresetRange = (presetName: string): DateRange =>
    getPresetDateRange(presetName as PresetName);

  const setPreset = (preset: string): void => {
    const range = getPresetRange(preset);
    setRange(range);
    if (rangeCompare) {
      const rangeCompare = {
        from: new Date(
          range.from.getFullYear() - 1,
          range.from.getMonth(),
          range.from.getDate(),
        ),
        to: range.to
          ? new Date(
              range.to.getFullYear() - 1,
              range.to.getMonth(),
              range.to.getDate(),
            )
          : undefined,
      };
      setRangeCompare(rangeCompare);
    }
  };

  const checkPreset = (): void => {
    // Guard against undefined range.from
    if (!range.from) {
      setSelectedPreset(undefined);
      return;
    }

    for (const preset of PRESETS) {
      const presetRange = getPresetRange(preset.name);

      const normalizedRangeFrom = new Date(range.from);
      normalizedRangeFrom.setHours(0, 0, 0, 0);
      const normalizedPresetFrom = new Date(presetRange.from);
      normalizedPresetFrom.setHours(0, 0, 0, 0);

      const normalizedRangeTo = new Date(range.to ?? 0);
      normalizedRangeTo.setHours(0, 0, 0, 0);
      const normalizedPresetTo = new Date(presetRange.to ?? 0);
      normalizedPresetTo.setHours(0, 0, 0, 0);

      if (
        normalizedRangeFrom.getTime() === normalizedPresetFrom.getTime() &&
        normalizedRangeTo.getTime() === normalizedPresetTo.getTime()
      ) {
        setSelectedPreset(preset.name);
        return;
      }
    }

    setSelectedPreset(undefined);
  };

  const resetValues = (): void => {
    setRange({
      from:
        typeof initialDateFrom === "string"
          ? getDateAdjustedForTimezone(initialDateFrom)
          : (initialDateFrom ?? defaultRange.from),
      to: initialDateTo
        ? typeof initialDateTo === "string"
          ? getDateAdjustedForTimezone(initialDateTo)
          : initialDateTo
        : typeof initialDateFrom === "string"
          ? getDateAdjustedForTimezone(initialDateFrom)
          : (initialDateFrom ?? defaultRange.from),
    });
    setRangeCompare(
      initialCompareFrom
        ? {
            from:
              typeof initialCompareFrom === "string"
                ? getDateAdjustedForTimezone(initialCompareFrom)
                : initialCompareFrom,
            to: initialCompareTo
              ? typeof initialCompareTo === "string"
                ? getDateAdjustedForTimezone(initialCompareTo)
                : initialCompareTo
              : typeof initialCompareFrom === "string"
                ? getDateAdjustedForTimezone(initialCompareFrom)
                : initialCompareFrom,
          }
        : undefined,
    );
  };

  useEffect(() => {
    checkPreset();
  }, [range]);

  function PresetButton({
    preset,
    label,
    isSelected,
  }: {
    preset: string;
    label: string;
    isSelected: boolean;
  }) {
    return (
      <Button
        className={cn(
          isSelected && "pointer-events-none",
          "w-full justify-end",
        )}
        variant="ghost"
        onClick={() => {
          setPreset(preset);
        }}
      >
        <>
          <span className={cn("pr-2 opacity-0", isSelected && "opacity-70")}>
            <CheckIcon width={18} height={18} />
          </span>
          {label}
        </>
      </Button>
    );
  }

  // Helper function to check if two date ranges are equal
  const areRangesEqual = (a?: DateRange, b?: DateRange): boolean => {
    if (!a || !b) return a === b; // If either is undefined, return true if both are undefined
    // Guard against undefined from/to properties
    if (!a.from || !b.from) return false;
    return (
      a.from.getTime() === b.from.getTime() &&
      (!a.to || !b.to || a.to.getTime() === b.to.getTime())
    );
  };

  useEffect(() => {
    if (isOpen) {
      openedRangeRef.current = range;
      openedRangeCompareRef.current = rangeCompare;
    }
  }, [isOpen]);

  return (
    <Popover
      modal={true}
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open && openedRangeRef.current) {
          // Restore the values from when the popover was opened (cancel behavior)
          setRange(openedRangeRef.current);
          setRangeCompare(openedRangeCompareRef.current);
        }
        setIsOpen(open);
      }}
    >
      <PopoverTrigger asChild>
        <Button size={"sm"} variant="outline">
          <div className="text-right">
            <div className="py-1">
              <div>{`${formatDate(range.from, locale)}${
                range.to != null ? " - " + formatDate(range.to, locale) : ""
              }`}</div>
            </div>
            {rangeCompare != null && (
              <div className="-mt-1 text-xs opacity-60">
                <>
                  vs. {formatDate(rangeCompare.from, locale)}
                  {rangeCompare.to != null
                    ? ` - ${formatDate(rangeCompare.to, locale)}`
                    : ""}
                </>
              </div>
            )}
          </div>
          <div className="scale-125 pl-1 opacity-60">
            {isOpen ? (
              <ChevronUpIcon width={24} />
            ) : (
              <ChevronDownIcon width={24} />
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto">
        <div className="flex py-2">
          <div className="flex">
            <div className="flex flex-col">
              <div className="flex flex-col items-center justify-end gap-2 px-2 pb-4 lg:flex-row lg:items-start lg:pb-0">
                {showCompare && (
                  <div className="flex items-center space-x-2 py-1 pr-4">
                    <Switch
                      defaultChecked={Boolean(rangeCompare)}
                      onCheckedChange={(checked: boolean) => {
                        if (checked) {
                          if (!range.to) {
                            setRange({
                              from: range.from,
                              to: range.from,
                            });
                          }
                          setRangeCompare({
                            from: new Date(
                              range.from.getFullYear(),
                              range.from.getMonth(),
                              range.from.getDate() - 365,
                            ),
                            to: range.to
                              ? new Date(
                                  range.to.getFullYear() - 1,
                                  range.to.getMonth(),
                                  range.to.getDate(),
                                )
                              : new Date(
                                  range.from.getFullYear() - 1,
                                  range.from.getMonth(),
                                  range.from.getDate(),
                                ),
                          });
                        } else {
                          setRangeCompare(undefined);
                        }
                      }}
                      id="compare-mode"
                    />
                    <Label htmlFor="compare-mode">Compare</Label>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <DateInput
                      value={range.from}
                      onChange={(date) => {
                        const toDate =
                          range.to == null || date > range.to ? date : range.to;
                        setRange((prevRange) => ({
                          ...prevRange,
                          from: date,
                          to: toDate,
                        }));
                      }}
                    />
                    <div className="py-1">-</div>
                    <DateInput
                      value={range.to}
                      onChange={(date) => {
                        const fromDate = date < range.from ? date : range.from;
                        setRange((prevRange) => ({
                          ...prevRange,
                          from: fromDate,
                          to: date,
                        }));
                      }}
                    />
                  </div>
                  {rangeCompare != null && (
                    <div className="flex gap-2">
                      <DateInput
                        value={rangeCompare?.from}
                        onChange={(date) => {
                          if (rangeCompare) {
                            const compareToDate =
                              rangeCompare.to == null || date > rangeCompare.to
                                ? date
                                : rangeCompare.to;
                            setRangeCompare((prevRangeCompare) => ({
                              ...prevRangeCompare,
                              from: date,
                              to: compareToDate,
                            }));
                          } else {
                            setRangeCompare({
                              from: date,
                              to: new Date(),
                            });
                          }
                        }}
                      />
                      <div className="py-1">-</div>
                      <DateInput
                        value={rangeCompare?.to}
                        onChange={(date) => {
                          if (rangeCompare && rangeCompare.from) {
                            const compareFromDate =
                              date < rangeCompare.from
                                ? date
                                : rangeCompare.from;
                            setRangeCompare({
                              ...rangeCompare,
                              from: compareFromDate,
                              to: date,
                            });
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              {isSmallScreen && (
                <Select
                  defaultValue={selectedPreset}
                  onValueChange={(value) => {
                    setPreset(value);
                  }}
                >
                  <SelectTrigger className="mx-2 mb-2 w-auto">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESETS.map((preset) => (
                      <SelectItem key={preset.name} value={preset.name}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="mx-auto">
                <Calendar
                  mode="range"
                  onSelect={(value: { from?: Date; to?: Date } | undefined) => {
                    if (value?.from != null) {
                      setRange({ from: value.from, to: value?.to });
                    }
                  }}
                  selected={range}
                  numberOfMonths={isSmallScreen ? 1 : 2}
                  defaultMonth={
                    new Date(
                      new Date().setMonth(
                        new Date().getMonth() - (isSmallScreen ? 0 : 1),
                      ),
                    )
                  }
                />
              </div>
            </div>
          </div>
          {!isSmallScreen && (
            // <div className="flex flex-col  gap-1 pr-2 pl-6 pb-6">
            <div className="flex flex-col items-end justify-between">
              <ScrollArea className="**:data-[slot=scroll-area-viewport]:scroll-fade-effect-y mr-2 h-50 w-42 pr-4">
                {/* <div className="flex flex-row gap-1 pr-2 pl-6 pb-6"> */}
                {PRESETS.map((preset) => (
                  <PresetButton
                    key={preset.name}
                    preset={preset.name}
                    label={preset.label}
                    isSelected={selectedPreset === preset.name}
                  />
                ))}
                {/* <WheelPickerWrapper className='w-80'>
                      <WheelPicker options={WHEELPICKER_PRESETS}  />
                  </WheelPickerWrapper> */}
                {/* </div>   */}
              </ScrollArea>
              {/* </div> */}
              <div className="flex justify-end gap-2 px-2 pt-2">
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    resetValues();
                  }}
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    if (
                      !areRangesEqual(range, openedRangeRef.current) ||
                      !areRangesEqual(
                        rangeCompare,
                        openedRangeCompareRef.current,
                      )
                    ) {
                      onUpdate?.({
                        range,
                        rangeCompare,
                        preset: selectedPreset as PresetName | null,
                        periodLabel: selectedPreset
                          ? (PRESETS.find((p) => p.name === selectedPreset)
                              ?.label ?? "Custom range")
                          : "Custom range",
                      });
                    }
                  }}
                >
                  Update
                </Button>
              </div>
            </div>
          )}
        </div>
        {!!isSmallScreen && (
          <div className="flex justify-end gap-2 py-2 pr-2">
            <Button
              onClick={() => {
                setIsOpen(false);
                resetValues();
              }}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsOpen(false);
                if (
                  !areRangesEqual(range, openedRangeRef.current) ||
                  !areRangesEqual(rangeCompare, openedRangeCompareRef.current)
                ) {
                  onUpdate?.({
                    range,
                    rangeCompare,
                    preset: selectedPreset as PresetName | null,
                    periodLabel: selectedPreset
                      ? (PRESETS.find((p) => p.name === selectedPreset)
                          ?.label ?? "Custom range")
                      : "Custom range",
                  });
                }
              }}
            >
              Update
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

DateRangePicker.displayName = "DateRangePicker";
DateRangePicker.filePath =
  "libs/shared/ui-kit/src/lib/date-range-picker/date-range-picker.tsx";
