import type { ChartDataPoint } from "@/components/chart-data-card";
import type { PresetName } from "@/components/ui/date-range-picker";

/**
 * Chart data organized by preset for dashboard cards.
 * Each card has data for different time periods.
 */
export type ChartCardData = {
  title: string;
  value: number;
  changePercent: number;
  isPositive: boolean;
  color: string;
  data: ChartDataPoint[];
};

// Day labels for weeks (Monday-Sunday)
const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Default seasonal factors by day of week (Mon=0, Sun=6)
// Values > 1 mean that day is typically higher than average
// Example: Friday (4) has 1.15 = 15% above average
const DEFAULT_SEASONAL_FACTORS = [1.0, 1.05, 1.1, 1.08, 1.15, 0.85, 0.77];

/**
 * Calculate linear regression coefficients (slope and intercept)
 * @returns { slope, intercept } where y = intercept + slope * x
 */
function linearRegression(values: number[]): {
  slope: number;
  intercept: number;
} {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Project a future value using trend + seasonal adjustment.
 * Formula: projection = (intercept + slope * futureIndex) * seasonalFactor
 */
function projectValue(
  regression: { slope: number; intercept: number },
  futureIndex: number,
  seasonalFactor: number,
): number {
  const trendValue = regression.intercept + regression.slope * futureIndex;
  // Apply seasonal factor and ensure non-negative
  return Math.max(0, Math.round(trendValue * seasonalFactor));
}

/**
 * Get the current day of the week (0 = Monday, 6 = Sunday)
 */
function getCurrentDayOfWeek(): number {
  const day = new Date().getDay();
  // Convert from Sunday=0 to Monday=0 format
  return day === 0 ? 6 : day - 1;
}

/**
 * Get the current day of the month (1-based)
 */
function getCurrentDayOfMonth(): number {
  return new Date().getDate();
}

/**
 * Get the number of days in the current month
 */
function getDaysInCurrentMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

/**
 * Calculate percentage change between current and previous period values.
 */
function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Seeded random number generator (mulberry32).
 * Produces reproducible random numbers for consistent mock data.
 */
function createSeededRandom(initialSeed: number): () => number {
  let seed = initialSeed;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Create seeded random for reproducible data
const seededRandom = createSeededRandom(20260109); // Seed based on date

/**
 * 70 days of historical data ending on Jan 9, 2026.
 * Each array has 70 values representing daily counts.
 * Allows for proper 30-day comparisons with 10-day buffer.
 *
 * Index 0 = Jan 9, 2026 (today, Thursday)
 * Index 1 = Jan 8 (Wed), Index 2 = Jan 7 (Tue), etc.
 * Index 69 = Nov 1, 2025
 */

// Generate realistic data with day-of-week patterns
// Higher on Wed-Fri, lower on weekends
function generateHistoricalData(
  baseValue: number,
  variance: number,
  trend: number, // positive = growing
): number[] {
  const data: number[] = [];
  const seasonalFactors = [1.08, 1.05, 1.1, 1.15, 0.85, 0.77, 1.0]; // Thu, Wed, Tue, Mon, Sun, Sat, Fri pattern (reverse order for backwards)

  for (let i = 0; i < 70; i++) {
    const weekIndex = Math.floor(i / 7);
    const dayOfWeek = i % 7;

    // Apply trend (older data was lower/higher)
    const trendAdjustment = 1 + trend * weekIndex * 0.05;

    // Apply seasonal pattern
    const seasonalFactor = seasonalFactors[dayOfWeek];

    // Add seeded random variance
    const randomFactor = 1 + (seededRandom() - 0.5) * variance;

    const value = Math.max(
      0,
      Math.round(baseValue * trendAdjustment * seasonalFactor * randomFactor),
    );
    data.push(value);
  }

  return data;
}

// 70 days of data for each metric (most recent first)
const HISTORICAL_DATA = {
  completedOrders: generateHistoricalData(55, 0.3, -0.1), // Growing trend (was lower before)
  delivering: generateHistoricalData(15, 0.4, -0.05),
  partialOrders: generateHistoricalData(4, 0.5, 0.15), // Decreasing trend (was higher before, improving)
  canceled: generateHistoricalData(2, 0.6, 0.2), // Decreasing trend (was higher before, improving)
};

// Card configurations
const CARD_CONFIGS = [
  {
    title: "Completed Orders",
    color: "var(--chart-2)",
    baseMultiplier: 1.5,
    historicalData: HISTORICAL_DATA.completedOrders,
  },
  {
    title: "Delivering",
    color: "var(--chart-3)",
    baseMultiplier: 0.8,
    historicalData: HISTORICAL_DATA.delivering,
  },
  {
    title: "Partial Orders",
    color: "var(--chart-4)",
    baseMultiplier: 0.3,
    historicalData: HISTORICAL_DATA.partialOrders,
  },
  {
    title: "Canceled",
    color: "var(--chart-5)",
    baseMultiplier: 0.2,
    historicalData: HISTORICAL_DATA.canceled,
  },
];

/**
 * Get data slice from historical data and convert to ChartDataPoints.
 * Index 0 is today (Jan 9), going backwards.
 */
function getDataSlice(
  historicalData: number[],
  startIndex: number,
  days: number,
): { data: ChartDataPoint[]; sum: number } {
  const slice = historicalData.slice(startIndex, startIndex + days).reverse();
  let sum = 0;

  const data = slice.map((value, i) => {
    sum += value;
    // Label based on position
    if (days <= 7) {
      return { label: WEEK_LABELS[i], value, isProjected: false };
    }
    if (days <= 14) {
      const dayNum = i + 1;
      const suffix =
        dayNum === 1 ? "st" : dayNum === 2 ? "nd" : dayNum === 3 ? "rd" : "th";
      return { label: `${dayNum}${suffix}`, value, isProjected: false };
    }
    const weekNum = Math.ceil((i + 1) / 7);
    const isWeekStart = i % 7 === 0;
    return {
      label: isWeekStart ? `Week ${weekNum}` : "",
      value,
      isProjected: false,
    };
  });

  return { data, sum };
}

/**
 * Generate card data for a specific preset with proper period comparison.
 * Uses 70-day historical data array.
 */
function generateCardsForPreset(preset: PresetName): ChartCardData[] {
  // Current day is Friday, Jan 9, 2026
  const currentDayOfWeek = getCurrentDayOfWeek(); // 0=Mon, 4=Fri
  const daysInCurrentWeek = currentDayOfWeek + 1; // 5 days (Mon-Fri)
  const currentDayOfMonth = getCurrentDayOfMonth(); // 9

  return CARD_CONFIGS.map((config) => {
    let data: ChartDataPoint[];
    let currentSum: number;
    let previousSum: number;

    switch (preset) {
      case "thisWeek": {
        // This week: Mon-Fri (5 days so far)
        const current = getDataSlice(
          config.historicalData,
          0,
          daysInCurrentWeek,
        );
        // Previous week same days: Mon-Fri of last week
        const previous = getDataSlice(
          config.historicalData,
          7,
          daysInCurrentWeek,
        );

        // Add projections for remaining days
        const actualData = current.data;
        const actualValues = actualData.map((d) => d.value);
        const regression = linearRegression(actualValues);

        for (let i = daysInCurrentWeek; i < 7; i++) {
          const seasonalFactor = DEFAULT_SEASONAL_FACTORS[i];
          const projectedValue = projectValue(regression, i, seasonalFactor);
          actualData.push({
            label: WEEK_LABELS[i],
            value: projectedValue,
            isProjected: true,
          });
        }

        data = actualData;
        currentSum = current.sum;
        previousSum = previous.sum;
        break;
      }

      case "lastWeek": {
        // Last week: Full 7 days (index 4-10 adjusted for current week position)
        // Since we're at day 4 of this week, last week ended 3 days ago
        const lastWeekStart = daysInCurrentWeek; // Start after this week's days
        const current = getDataSlice(config.historicalData, lastWeekStart, 7);
        // Week before last week: 7 days before that
        const previous = getDataSlice(
          config.historicalData,
          lastWeekStart + 7,
          7,
        );
        data = current.data;
        currentSum = current.sum;
        previousSum = previous.sum;
        break;
      }

      case "thisMonth": {
        // This month: first 9 days (Jan 1-9)
        const current = getDataSlice(
          config.historicalData,
          0,
          currentDayOfMonth,
        );
        // Add projections for rest of month
        const actualValues = current.data.map((d) => d.value);
        const regression = linearRegression(actualValues);
        const daysInMonth = getDaysInCurrentMonth();

        for (let i = currentDayOfMonth; i < daysInMonth; i++) {
          const dayOfWeek = i % 7;
          const seasonalFactor = DEFAULT_SEASONAL_FACTORS[dayOfWeek];
          const projectedValue = projectValue(regression, i, seasonalFactor);
          current.data.push({
            label: i % 7 === 0 ? `Week ${Math.ceil((i + 1) / 7)}` : "",
            value: projectedValue,
            isProjected: true,
          });
        }

        // Previous month SAME PERIOD: first 9 days of December (same number of days)
        // Assuming December started ~40 days ago from today (Jan 9)
        const daysAgoDecemberStarted =
          currentDayOfMonth + getDaysInCurrentMonth() - currentDayOfMonth; // ~31 days ago
        const previous = getDataSlice(
          config.historicalData,
          daysAgoDecemberStarted,
          currentDayOfMonth,
        );

        data = current.data;
        currentSum = current.sum;
        previousSum = previous.sum;
        break;
      }

      case "lastMonth": {
        // Last month (December): Assuming 31 days, starting from day 9 (currentDayOfMonth)
        const daysInLastMonth = 31; // December 2025
        const lastMonthStartIndex = currentDayOfMonth; // Days ago December started

        const current = getDataSlice(
          config.historicalData,
          lastMonthStartIndex,
          daysInLastMonth,
        );

        // Month before (November): Same 31 days, starting 31 days before December
        const previous = getDataSlice(
          config.historicalData,
          lastMonthStartIndex + daysInLastMonth,
          Math.min(daysInLastMonth, 56 - lastMonthStartIndex - daysInLastMonth), // Don't exceed data
        );

        data = current.data;
        currentSum = current.sum;
        previousSum = previous.sum;
        break;
      }

      case "last7": {
        // Last 7 days: index 0 to 6
        const current = getDataSlice(config.historicalData, 0, 7);
        // 7 days before that: index 7 to 13
        const previous = getDataSlice(config.historicalData, 7, 7);
        data = current.data;
        currentSum = current.sum;
        previousSum = previous.sum;
        break;
      }

      case "last14": {
        // Last 14 days: index 0 to 13
        const current = getDataSlice(config.historicalData, 0, 14);
        // 14 days before that: index 14 to 27
        const previous = getDataSlice(config.historicalData, 14, 14);
        data = current.data;
        currentSum = current.sum;
        previousSum = previous.sum;
        break;
      }

      case "last30": {
        // Last 30 days: index 0 to 29
        const current = getDataSlice(config.historicalData, 0, 30);
        // 30 days before that: index 30 to 59 (need to ensure we have enough data)
        // If we only have 56 days, we can only get 26 days for comparison
        const availablePreviousDays = Math.min(
          30,
          config.historicalData.length - 30,
        );
        const previous = getDataSlice(
          config.historicalData,
          30,
          availablePreviousDays,
        );

        data = current.data;
        currentSum = current.sum;
        // Normalize previous sum to 30 days if we have less data
        previousSum =
          availablePreviousDays < 30
            ? Math.round((previous.sum / availablePreviousDays) * 30)
            : previous.sum;
        break;
      }

      default: {
        const current = getDataSlice(config.historicalData, 0, 30);
        const previous = getDataSlice(config.historicalData, 30, 26);
        data = current.data;
        currentSum = current.sum;
        previousSum = previous.sum;
        break;
      }
    }

    const changePercent = calculateChangePercent(currentSum, previousSum);
    // For negative metrics (Canceled, Partial Orders), decrease is good (positive indicator)
    // For positive metrics, increase is good (positive indicator)
    const isNegativeMetric =
      config.title === "Canceled" || config.title === "Partial Orders";
    const isPositive = isNegativeMetric ? changePercent < 0 : changePercent > 0;

    return {
      title: config.title,
      value: currentSum,
      changePercent, // Keep the sign! Don't use Math.abs
      isPositive, // This controls color (green/red), not direction
      color: config.color,
      data,
    };
  });
}

// Dashboard cards data by preset
export const dashboardCardsData: Record<PresetName, ChartCardData[]> = {
  last7: generateCardsForPreset("last7"),
  last14: generateCardsForPreset("last14"),
  last30: generateCardsForPreset("last30"),
  thisWeek: generateCardsForPreset("thisWeek"),
  lastWeek: generateCardsForPreset("lastWeek"),
  thisMonth: generateCardsForPreset("thisMonth"),
  lastMonth: generateCardsForPreset("lastMonth"),
};

// Default data for custom range (uses last30 as fallback)
export const defaultChartData = dashboardCardsData.last30;
