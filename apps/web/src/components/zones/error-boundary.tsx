import React from "react";
import type { EditorError } from "@/lib/types/layout-editor";

export class ErrorBoundary extends React.Component<
  { onError?: (e: EditorError) => void; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: {
    onError?: (e: EditorError) => void;
    children: React.ReactNode;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (this.props.onError) {
      this.props.onError({
        type: "rendering",
        message: (error as Error)?.message ?? "Unknown render error",
        details: error,
        timestamp: Date.now(),
        severity: "error",
      });
    }
  }

  override render() {
    if (this.state.hasError) return null;
    return this.props.children as React.ReactElement;
  }
}
