/**
 * EditorConsole - Professional console-style logging panel
 * Displays filtered log entries with debug levels and categories
 */

import {
  AlertCircle,
  AlertTriangle,
  Bug,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Trash2,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type LogEntry,
  type LogLevel,
  useEditorConsole,
} from "@/store/editor-console-store";

// ============================================================================
// Log Level Icons & Colors
// ============================================================================

const LOG_LEVEL_CONFIG: Record<
  LogLevel,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  debug: {
    icon: <Bug className="h-3.5 w-3.5" />,
    color: "text-gray-400",
    bgColor: "bg-gray-900/50",
  },
  info: {
    icon: <Info className="h-3.5 w-3.5" />,
    color: "text-blue-400",
    bgColor: "bg-blue-950/30",
  },
  warn: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    color: "text-yellow-400",
    bgColor: "bg-yellow-950/30",
  },
  error: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: "text-red-400",
    bgColor: "bg-red-950/30",
  },
  success: {
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: "text-green-400",
    bgColor: "bg-green-950/30",
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  entity: "text-purple-400",
  sync: "text-cyan-400",
  collision: "text-orange-400",
  validation: "text-pink-400",
};

// ============================================================================
// Log Entry Row
// ============================================================================

interface LogEntryRowProps {
  entry: LogEntry;
}

function LogEntryRow({ entry }: LogEntryRowProps) {
  const config = LOG_LEVEL_CONFIG[entry.level];
  const categoryColor = entry.category
    ? (CATEGORY_COLORS[entry.category] ?? "text-gray-400")
    : "";

  const timestamp = new Date(entry.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      className={`flex items-start gap-2 border-gray-800/50 border-b px-2 py-1.5 font-mono text-xs ${config.bgColor} hover:bg-gray-800/50`}
    >
      {/* Timestamp */}
      <span className="shrink-0 text-gray-500">{timestamp}</span>

      {/* Level icon */}
      <span className={`shrink-0 ${config.color}`}>{config.icon}</span>

      {/* Category badge */}
      {entry.category && (
        <span
          className={`shrink-0 rounded px-1 py-0.5 font-medium text-[10px] uppercase ${categoryColor} bg-gray-800/50`}
        >
          {entry.category}
        </span>
      )}

      {/* Message */}
      <span className="flex-1 text-gray-200">{entry.message}</span>
    </div>
  );
}

// ============================================================================
// Filter Checkbox
// ============================================================================

interface FilterCheckboxProps {
  level: LogLevel;
  checked: boolean;
  onToggle: () => void;
}

function FilterCheckbox({ level, checked, onToggle }: FilterCheckboxProps) {
  const config = LOG_LEVEL_CONFIG[level];
  return (
    <div className="flex items-center gap-1.5">
      <Checkbox
        id={`filter-${level}`}
        checked={checked}
        onCheckedChange={onToggle}
        className="h-3.5 w-3.5"
      />
      <Label
        htmlFor={`filter-${level}`}
        className={`cursor-pointer text-xs capitalize ${config.color}`}
      >
        {level}
      </Label>
    </div>
  );
}

// ============================================================================
// Main Console Component
// ============================================================================

export function EditorConsole() {
  const logs = useEditorConsole((s) => s.logs);
  const filters = useEditorConsole((s) => s.filters);
  const isExpanded = useEditorConsole((s) => s.isExpanded);
  const toggleFilter = useEditorConsole((s) => s.toggleFilter);
  const toggleExpanded = useEditorConsole((s) => s.toggleExpanded);
  const clearLogs = useEditorConsole((s) => s.clearLogs);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter logs based on current filters
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => filters[log.level]);
  }, [logs, filters]);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  return (
    <div className="flex h-full flex-col bg-gray-950 text-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between border-gray-800 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Console</h3>
          <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">
            {filteredLogs.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
            onClick={clearLogs}
            title="Clear logs"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
            onClick={toggleExpanded}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 border-gray-800 border-b px-3 py-1.5">
        <span className="font-medium text-[10px] text-gray-500 uppercase">
          Filter:
        </span>
        {(Object.keys(filters) as LogLevel[]).map((level) => (
          <FilterCheckbox
            key={level}
            level={level}
            checked={filters[level]}
            onToggle={() => toggleFilter(level)}
          />
        ))}
      </div>

      {/* Log entries */}
      {isExpanded && (
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="min-h-0">
            {filteredLogs.length === 0 ? (
              <div className="flex h-20 items-center justify-center text-gray-500 text-xs">
                No logs to display
              </div>
            ) : (
              filteredLogs.map((entry) => (
                <LogEntryRow key={entry.id} entry={entry} />
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

export default EditorConsole;
