import { create } from "zustand";
import {
  type DateRange,
  getPresetDateRange,
  PRESETS,
  type PresetName,
} from "@/components/ui/date-range-picker";

// Re-export for convenience
export type { DateRange, PresetName };
export { PRESETS, getPresetDateRange };

interface DateFilterState {
  // Date range for filtering chart data across the app
  dateRange: DateRange;
  // Selected preset, or null if custom range
  selectedPreset: PresetName | null;
  // Human-readable period label
  periodLabel: string;

  // Actions
  setDateRange: (range: DateRange, preset?: PresetName | null) => void;
  setPreset: (preset: PresetName) => void;
  /** Update from DateRangePicker onUpdate callback */
  updateFromPicker: (data: {
    range: DateRange;
    preset: PresetName | null;
    periodLabel: string;
  }) => void;
}

// Default to last 30 days
const defaultPreset: PresetName = "last30";
const defaultRange = getPresetDateRange(defaultPreset);
const defaultLabel =
  PRESETS.find((p) => p.name === defaultPreset)?.label ?? "Last 30 days";

/**
 * Global date filter store for charts across the app.
 * Use this store to share date range selection between different pages and components.
 *
 * @example
 * ```tsx
 * // In any component
 * const { dateRange, periodLabel, selectedPreset } = useDateFilterStore();
 *
 * // With DateRangePicker
 * <DateRangePicker onUpdate={(data) => updateFromPicker(data)} />
 * ```
 */
export const useDateFilterStore = create<DateFilterState>((set) => ({
  dateRange: defaultRange,
  selectedPreset: defaultPreset,
  periodLabel: defaultLabel,

  setDateRange: (range, preset = null) =>
    set({
      dateRange: range,
      selectedPreset: preset,
      periodLabel: preset
        ? (PRESETS.find((p) => p.name === preset)?.label ?? "Custom range")
        : "Custom range",
    }),

  setPreset: (preset) =>
    set({
      dateRange: getPresetDateRange(preset),
      selectedPreset: preset,
      periodLabel:
        PRESETS.find((p) => p.name === preset)?.label ?? "Custom range",
    }),

  updateFromPicker: (data) =>
    set({
      dateRange: data.range,
      selectedPreset: data.preset,
      periodLabel: data.periodLabel,
    }),
}));

// Backwards compatibility alias
export const useDashboardStore = useDateFilterStore;
