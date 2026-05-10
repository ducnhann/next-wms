"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { WarehouseEditor } from "@/components/zones/layout-editor";
import { useBranches } from "@/hooks/use-branches";
import { useConvexLayoutSync } from "@/hooks/use-convex-layout-sync";
import { useCurrentUser } from "@/hooks/use-current-user";

export function EditorPage() {
  const { organizationId } = useCurrentUser();
  const { currentBranch } = useBranches({ organizationId });

  const { data: zones } = useQuery({
    ...convexQuery(
      api.storageZones.getByBranch,
      currentBranch?._id
        ? { branchId: currentBranch._id, includeDeleted: false }
        : "skip",
    ),
    enabled: !!currentBranch,
  });
  const createZone = useMutation(api.storageZones.create);
  const updateZone = useMutation(api.storageZones.update);
  const deleteZone = useMutation(api.storageZones.softDelete);

  const currentBranchId = currentBranch?._id ?? null;

  const { isLoading } = useConvexLayoutSync(currentBranchId, zones, {
    onMutateCreate: async (entity) => {
      if (!currentBranchId) {
        throw new Error("No current branch selected");
      }
      const id = await createZone({
        branchId: currentBranchId,
        name: entity.name,
        path: entity.path,
        storageBlockType: entity.storageBlockType,
        zoneAttributes: entity.zoneAttributes,
        ...(entity.parentId !== null && { parentId: entity.parentId }),
      });
      return id;
    },
    onMutateUpdate: async (id, attributes) => {
      await updateZone({
        id: id as Id<"storage_zones">,
        zoneAttributes: attributes,
      });
    },
    onMutateDelete: async (id) => {
      await deleteZone({ id: id as Id<"storage_zones"> });
    },
  });

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      const timer1 = setTimeout(() => setProgress(25), 300);
      const timer2 = setTimeout(() => setProgress(50), 1200);
      const timer3 = setTimeout(() => setProgress(80), 1800);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
    if (isLoading) return;
    setProgress(100);
    const hideTimer = setTimeout(() => setProgress(0), 200);
    return () => clearTimeout(hideTimer);
  }, [isLoading]);

  return (
    <div className="flex min-h-0 w-full grow flex-col overflow-hidden">
      <Progress
        value={progress}
        className={`h-1 transition-all duration-300 ${progress === 0 ? "opacity-0" : "opacity-100"}`}
      />
      <WarehouseEditor showDebugPanel={false} />
    </div>
  );
}
