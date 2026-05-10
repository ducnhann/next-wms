import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { useCallback, useEffect, useState } from "react";
import type { Branch } from "@/lib/types";

export type UseBranchesOptions = {
  organizationId?: Id<"organizations">;
  includeDeleted?: boolean;
};

const STORAGE_KEY = "wms:selected-branch";

export function useBranches(options: UseBranchesOptions = {}) {
  const { organizationId, includeDeleted = false } = options;

  const { data: branches, ...queryResult } = useQuery({
    ...convexQuery(
      api.branches.listAll,
      organizationId
        ? {
            organizationId,
            includeDeleted,
          }
        : "skip",
    ),
  });

  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);

  // Load saved branch from localStorage on mount
  useEffect(() => {
    if (!branches || branches.length === 0) return;

    const savedBranchId = localStorage.getItem(STORAGE_KEY);

    if (savedBranchId) {
      const savedBranch = branches.find(
        (b) => b._id === savedBranchId && b.isActive && !b.isDeleted,
      );
      if (savedBranch) {
        setCurrentBranch(savedBranch);
        return;
      }
      // Saved branch no longer exists or is invalid, clear it
      localStorage.removeItem(STORAGE_KEY);
    }

    // If no saved branch or saved branch not found, select first active branch
    const firstActiveBranch = branches.find((b) => b.isActive && !b.isDeleted);
    if (firstActiveBranch) {
      setCurrentBranch(firstActiveBranch);
      localStorage.setItem(STORAGE_KEY, firstActiveBranch._id);
    }
  }, [branches]);

  // Listen for branch changes from other components
  useEffect(() => {
    const handleBranchChange = (event: CustomEvent<string>) => {
      if (!branches) return;
      const newBranchId = event.detail;
      const newBranch = branches.find((b) => b._id === newBranchId);
      if (newBranch) {
        setCurrentBranch(newBranch);
      }
    };

    window.addEventListener(
      "wms:branch-changed",
      handleBranchChange as EventListener,
    );
    return () => {
      window.removeEventListener(
        "wms:branch-changed",
        handleBranchChange as EventListener,
      );
    };
  }, [branches]);

  const selectBranch = useCallback((branch: Branch | null) => {
    setCurrentBranch(branch);
    if (branch) {
      localStorage.setItem(STORAGE_KEY, branch._id);
      // Dispatch custom event to notify other components
      window.dispatchEvent(
        new CustomEvent("wms:branch-changed", { detail: branch._id }),
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    data: branches,
    branches,
    currentBranch,
    selectBranch,
    ...queryResult,
  };
}
