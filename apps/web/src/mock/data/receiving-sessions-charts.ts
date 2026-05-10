import type { ChartDataPoint } from "@/components/chart-data-card";
import type { PresetName } from "@/components/ui/date-range-picker";

/**
 * Chart data for receiving sessions dashboard cards.
 * Cards:
 * 1. In Progress - Count of sessions with status "Receiving"
 * 2. Pending QC - Count of sessions with status "Pending"
 * 3. Completed - Count of sessions changed to "Completed" or "Returned"
 * 4. Total Returned - Count of sessions changed to "Returned"
 */

export type ReceiveSessionCardData = {
  title: string;
  value: number;
  changePercent: number;
  isPositive: boolean;
  color: string;
  data: ChartDataPoint[];
};

// Day labels for weeks (Monday-Sunday)
const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Default seasonal factors
const DEFAULT_SEASONAL_FACTORS = [1.0, 1.05, 1.1, 1.08, 1.15, 0.85, 0.77];

/**
 * Seeded random number generator for consistent mock data
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

const seededRandom = createSeededRandom(20260111);

/**
 * Calculate linear regression
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

function projectValue(
  regression: { slope: number; intercept: number },
  futureIndex: number,
  seasonalFactor: number,
): number {
  const trendValue = regression.intercept + regression.slope * futureIndex;
  return Math.max(0, Math.round(trendValue * seasonalFactor));
}

function getCurrentDayOfWeek(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

function getCurrentDayOfMonth(): number {
  return new Date().getDate();
}

function getDaysInCurrentMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// Generate historical data with patterns
function generateHistoricalData(
  baseValue: number,
  variance: number,
  trend: number,
): number[] {
  const data: number[] = [];
  const seasonalFactors = [1.08, 1.05, 1.1, 1.15, 0.85, 0.77, 1.0];

  for (let i = 0; i < 70; i++) {
    const weekIndex = Math.floor(i / 7);
    const dayOfWeek = i % 7;
    const trendAdjustment = 1 + trend * weekIndex * 0.05;
    const seasonalFactor = seasonalFactors[dayOfWeek];
    const randomFactor = 1 + (seededRandom() - 0.5) * variance;

    const value = Math.max(
      0,
      Math.round(baseValue * trendAdjustment * seasonalFactor * randomFactor),
    );
    data.push(value);
  }

  return data;
}

// Historical data for each card metric
const HISTORICAL_DATA = {
  inProgress: generateHistoricalData(8, 0.4, -0.1), // Current receiving sessions
  pendingQC: generateHistoricalData(5, 0.5, 0.05), // Pending sessions
  completed: generateHistoricalData(12, 0.3, -0.15), // Completed + Returned
  returned: generateHistoricalData(2, 0.6, 0.1), // Returned only
};

// Card configurations for receiving sessions
const RECEIVE_SESSION_CARD_CONFIGS = [
  {
    title: "In Progress",
    color: "var(--chart-1)",
    historicalData: HISTORICAL_DATA.inProgress,
    isNegativeMetric: false,
  },
  {
    title: "Pending QC",
    color: "var(--chart-4)",
    historicalData: HISTORICAL_DATA.pendingQC,
    isNegativeMetric: true, // Lower pending is better
  },
  {
    title: "Completed",
    color: "var(--chart-2)",
    historicalData: HISTORICAL_DATA.completed,
    isNegativeMetric: false,
  },
  {
    title: "Total Returned",
    color: "var(--chart-5)",
    historicalData: HISTORICAL_DATA.returned,
    isNegativeMetric: true, // Lower returns is better
  },
];

/**
 * Get data slice from historical data
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
 * Generate cards for a specific preset
 */
function generateReceiveSessionCardsForPreset(
  preset: PresetName,
): ReceiveSessionCardData[] {
  const currentDayOfWeek = getCurrentDayOfWeek();
  const daysInCurrentWeek = currentDayOfWeek + 1;
  const currentDayOfMonth = getCurrentDayOfMonth();

  return RECEIVE_SESSION_CARD_CONFIGS.map((config) => {
    let data: ChartDataPoint[];
    let currentSum: number;
    let previousSum: number;

    switch (preset) {
      case "thisWeek": {
        const current = getDataSlice(
          config.historicalData,
          0,
          daysInCurrentWeek,
        );
        const previous = getDataSlice(
          config.historicalData,
          7,
          daysInCurrentWeek,
        );

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
        const lastWeekStart = daysInCurrentWeek;
        const current = getDataSlice(config.historicalData, lastWeekStart, 7);
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
        const current = getDataSlice(
          config.historicalData,
          0,
          currentDayOfMonth,
        );
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

        const daysAgoDecemberStarted =
          currentDayOfMonth + getDaysInCurrentMonth() - currentDayOfMonth;
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
        const daysInLastMonth = 31;
        const lastMonthStartIndex = currentDayOfMonth;

        const current = getDataSlice(
          config.historicalData,
          lastMonthStartIndex,
          daysInLastMonth,
        );
        const previous = getDataSlice(
          config.historicalData,
          lastMonthStartIndex + daysInLastMonth,
          Math.min(daysInLastMonth, 56 - lastMonthStartIndex - daysInLastMonth),
        );

        data = current.data;
        currentSum = current.sum;
        previousSum = previous.sum;
        break;
      }

      case "last7": {
        const current = getDataSlice(config.historicalData, 0, 7);
        const previous = getDataSlice(config.historicalData, 7, 7);
        data = current.data;
        currentSum = current.sum;
        previousSum = previous.sum;
        break;
      }

      case "last14": {
        const current = getDataSlice(config.historicalData, 0, 14);
        const previous = getDataSlice(config.historicalData, 14, 14);
        data = current.data;
        currentSum = current.sum;
        previousSum = previous.sum;
        break;
      }

      case "last30": {
        const current = getDataSlice(config.historicalData, 0, 30);
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
    const isPositive = config.isNegativeMetric
      ? changePercent < 0
      : changePercent > 0;

    return {
      title: config.title,
      value: currentSum,
      changePercent,
      isPositive,
      color: config.color,
      data,
    };
  });
}

// Export receiving sessions cards data by preset
export const receiveSessionCardsData: Record<
  PresetName,
  ReceiveSessionCardData[]
> = {
  last7: generateReceiveSessionCardsForPreset("last7"),
  last14: generateReceiveSessionCardsForPreset("last14"),
  last30: generateReceiveSessionCardsForPreset("last30"),
  thisWeek: generateReceiveSessionCardsForPreset("thisWeek"),
  lastWeek: generateReceiveSessionCardsForPreset("lastWeek"),
  thisMonth: generateReceiveSessionCardsForPreset("thisMonth"),
  lastMonth: generateReceiveSessionCardsForPreset("lastMonth"),
};

// Default data for custom range
export const defaultReceiveSessionChartData = receiveSessionCardsData.last30;
