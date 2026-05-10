import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ChartDataItem {
  name: string;
  value: number;
  color?: string;
}

export interface PieChartOptions {
  title: string;
  data: ChartDataItem[];
}

export interface BarChartOptions {
  title: string;
  data: ChartDataItem[];
  valueLabel?: string;
}

export interface ReportPDFOptions {
  title: string;
  subtitle?: string;
  dateRange: string;
  branchName?: string;
  kpis?: { label: string; value: string | number }[];
  pieChart?: PieChartOptions;
  barChart?: BarChartOptions;
  tableHeaders: string[];
  tableData: (string | number)[][];
  fileName: string;
}

// Default chart colors
const DEFAULT_CHART_COLORS = [
  "#2563eb", // Blue
  "#16a34a", // Green
  "#ea580c", // Orange
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f59e0b", // Amber
  "#6366f1", // Indigo
];

// Helper function to convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

// Draw a pie chart on the PDF
function drawPieChart(
  doc: jsPDF,
  options: PieChartOptions,
  x: number,
  y: number,
  size: number,
) {
  const { title, data } = options;
  const radius = size / 2 - 10;
  const centerX = x + size / 2;
  const centerY = y + 20 + radius;

  // Title
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30);
  doc.text(title, x + size / 2, y + 5, { align: "center" });

  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("No data available", centerX, centerY, { align: "center" });
    return;
  }

  // Draw pie slices
  let currentAngle = -Math.PI / 2; // Start from top

  data.forEach((item, index) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const color =
      item.color || DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length];
    const rgb = hexToRgb(color);

    doc.setFillColor(rgb.r, rgb.g, rgb.b);

    // Draw slice using path
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    // Create pie slice path
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);

    // Draw arc segments
    const segments = Math.max(1, Math.ceil(sliceAngle / 0.1));
    const points: [number, number][] = [[centerX, centerY]];

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (sliceAngle * i) / segments;
      points.push([
        centerX + radius * Math.cos(angle),
        centerY + radius * Math.sin(angle),
      ]);
    }

    // Draw filled polygon
    if (points.length > 2) {
      const firstPoint = points[0];
      doc.moveTo(firstPoint[0], firstPoint[1]);
      for (let i = 1; i < points.length; i++) {
        doc.lineTo(points[i][0], points[i][1]);
      }
      doc.lineTo(firstPoint[0], firstPoint[1]);
      doc.fill();
    }

    currentAngle = endAngle;
  });

  // Draw legend below the pie
  const legendY = centerY + radius + 10;
  const legendItemWidth = size / 2;
  const legendColumns = 2;

  data.slice(0, 6).forEach((item, index) => {
    const col = index % legendColumns;
    const row = Math.floor(index / legendColumns);
    const legendX = x + col * legendItemWidth;
    const itemY = legendY + row * 8;

    const color =
      item.color || DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length];
    const rgb = hexToRgb(color);
    const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;

    // Color box
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.rect(legendX, itemY - 3, 4, 4, "F");

    // Label with percentage
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    const label =
      item.name.length > 12 ? `${item.name.substring(0, 12)}...` : item.name;
    doc.text(`${label} (${percentage}%)`, legendX + 6, itemY);
  });
}

// Draw a horizontal bar chart on the PDF
function drawBarChart(
  doc: jsPDF,
  options: BarChartOptions,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const { title, data, valueLabel } = options;
  const barHeight = 8;
  const barSpacing = 4;
  const labelWidth = 50;
  const chartWidth = width - labelWidth - 30;

  // Title
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30);
  doc.text(title, x + width / 2, y + 5, { align: "center" });

  if (data.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("No data available", x + width / 2, y + height / 2, {
      align: "center",
    });
    return;
  }

  // Find max value for scaling
  const maxValue = Math.max(...data.map((d) => d.value));
  const chartX = x + labelWidth;
  const chartY = y + 15;

  // Draw bars
  data.slice(0, 8).forEach((item, index) => {
    const barY = chartY + index * (barHeight + barSpacing);
    const barWidth = maxValue > 0 ? (item.value / maxValue) * chartWidth : 0;
    const color =
      item.color || DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length];
    const rgb = hexToRgb(color);

    // Label
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    const label =
      item.name.length > 15 ? `${item.name.substring(0, 15)}...` : item.name;
    doc.text(label, chartX - 3, barY + barHeight / 2 + 1, { align: "right" });

    // Bar
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.roundedRect(chartX, barY, Math.max(barWidth, 1), barHeight, 1, 1, "F");

    // Value
    doc.setFontSize(7);
    doc.setTextColor(30);
    doc.text(
      item.value.toLocaleString(),
      chartX + barWidth + 3,
      barY + barHeight / 2 + 1,
    );
  });

  // Value label at bottom
  if (valueLabel) {
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(valueLabel, x + width / 2, y + height - 5, { align: "center" });
  }
}

export function exportReportToPDF(options: ReportPDFOptions) {
  const {
    title,
    subtitle,
    dateRange,
    branchName,
    kpis,
    pieChart,
    barChart,
    tableHeaders,
    tableData,
    fileName,
  } = options;

  // Create PDF in landscape for better table display
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, yPos);
  yPos += 8;

  // Subtitle
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(subtitle, margin, yPos);
    yPos += 6;
  }

  // Date Range and Branch
  doc.setFontSize(10);
  doc.setTextColor(120);
  const metaText = branchName ? `${branchName} | ${dateRange}` : dateRange;
  doc.text(metaText, margin, yPos);

  // Generated timestamp on the right
  const timestamp = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Generated: ${timestamp}`, pageWidth - margin, yPos, {
    align: "right",
  });
  yPos += 10;

  // KPI Section
  if (kpis && kpis.length > 0) {
    doc.setDrawColor(220);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 2, 2, "FD");

    const kpiWidth = (pageWidth - margin * 2) / kpis.length;
    kpis.forEach((kpi, index) => {
      const xPos = margin + kpiWidth * index + kpiWidth / 2;

      // KPI Value
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30);
      doc.text(String(kpi.value), xPos, yPos + 9, { align: "center" });

      // KPI Label
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(kpi.label, xPos, yPos + 15, { align: "center" });
    });
    yPos += 28;
  }

  // Charts Section (side by side if both exist)
  const hasCharts = pieChart || barChart;
  if (hasCharts) {
    const chartHeight = 120;
    const chartWidth = (pageWidth - margin * 3) / 2;

    // Background for charts section
    doc.setDrawColor(230);
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(
      margin,
      yPos,
      pageWidth - margin * 2,
      chartHeight,
      2,
      2,
      "FD",
    );

    if (pieChart && barChart) {
      // Draw both charts side by side
      drawPieChart(doc, pieChart, margin + 5, yPos + 5, chartWidth - 10);
      drawBarChart(
        doc,
        barChart,
        margin + chartWidth + 5,
        yPos + 5,
        chartWidth - 10,
        chartHeight - 10,
      );
    } else if (pieChart) {
      // Center the pie chart
      drawPieChart(
        doc,
        pieChart,
        margin + chartWidth / 2,
        yPos + 5,
        chartWidth,
      );
    } else if (barChart) {
      // Center the bar chart
      drawBarChart(
        doc,
        barChart,
        margin + chartWidth / 2,
        yPos + 5,
        chartWidth,
        chartHeight - 10,
      );
    }

    yPos += chartHeight + 12;
  }

  // Table
  doc.setTextColor(0);
  autoTable(doc, {
    startY: yPos,
    head: [tableHeaders],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [37, 99, 235], // Blue
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      overflow: "linebreak",
      cellWidth: "auto",
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      // Footer on each page
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" },
      );
    },
  });

  // Save the PDF
  doc.save(`${fileName}.pdf`);
}

export function formatDateRange(
  from: Date | undefined,
  to: Date | undefined,
): string {
  if (!from && !to) return "All time";

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (from && to) {
    return `${formatDate(from)} - ${formatDate(to)}`;
  }
  if (from) {
    return `From ${formatDate(from)}`;
  }
  if (to) {
    return `Until ${formatDate(to)}`;
  }
  return "All time";
}
