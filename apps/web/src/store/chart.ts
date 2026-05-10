import { create } from "zustand";

export type LineType = "linear" | "monotone";
export type ProjectionStyle = "line" | "area";

interface ChartState {
  lineType: LineType;
  projectionStyle: ProjectionStyle;
  setLineType: (type: LineType) => void;
  setProjectionStyle: (style: ProjectionStyle) => void;
}

export const useChartStore = create<ChartState>((set) => ({
  lineType: "monotone",
  projectionStyle: "line",
  setLineType: (type) => set({ lineType: type }),
  setProjectionStyle: (style) => set({ projectionStyle: style }),
}));
