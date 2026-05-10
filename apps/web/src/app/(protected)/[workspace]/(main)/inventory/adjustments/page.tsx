"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";
import { LocationTransferDialog } from "@/components/location-transfer-dialog";
import { MultiQuantityAdjustmentDialog } from "@/components/multi-quantity-adjustment-dialog";
import { NewAdjustmentRequestDialog } from "@/components/new-adjustment-request-dialog";
import { LocationAdjustmentsTable } from "@/components/table/location-adjustments-table";
import { QuantityAdjustmentsTable } from "@/components/table/quantity-adjustments-table";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";

interface StatCardProps {
  title: string;
  value: string | number;
  textColor: string;
}

function StatCard({ title, value, textColor }: StatCardProps) {
  return (
    <div className={"flex flex-col gap-2 rounded-lg border bg-card p-4"}>
      <span className="text-muted-foreground text-sm">{title}</span>
      <div className={`font-bold text-3xl ${textColor}`}>{value}</div>
    </div>
  );
}

export default function Page() {
  const { organizationId, userId } = useCurrentUser();
  const { currentBranch } = useBranches({ organizationId });
  const queryClient = useQueryClient();

  // Fetch real stats data from Convex
  const { data: stats } = useQuery({
    ...convexQuery(
      api.cycleCount.getAdjustmentStats,
      organizationId && currentBranch?._id
        ? {
            organizationId: organizationId as Id<"organizations">,
            branchId: currentBranch._id as Id<"branches">,
          }
        : "skip",
    ),
    enabled: !!organizationId && !!currentBranch?._id,
  });

  // Default stats when loading
  const displayStats = stats ?? {
    totalQuantityRequests: 0,
    pendingApproval: 0,
    approved: 0,
    rejected: 0,
  };

  // Dialog states
  const [isNewRequestDialogOpen, setIsNewRequestDialogOpen] = useState(false);
  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: useConvexMutation(api.cycleCount.approveAdjustmentRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["cycleCount.getQuantityAdjustmentsForTable"],
      });
      queryClient.invalidateQueries({
        queryKey: ["cycleCount.getLocationAdjustmentsForTable"],
      });
      queryClient.invalidateQueries({
        queryKey: ["cycleCount.getAdjustmentStats"],
      });
      toast.success("Adjustment request approved successfully");
    },
    onError: (error) => {
      console.error("Failed to approve adjustment:", error);
      toast.error("Failed to approve adjustment request");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: useConvexMutation(api.cycleCount.rejectAdjustmentRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["cycleCount.getQuantityAdjustmentsForTable"],
      });
      queryClient.invalidateQueries({
        queryKey: ["cycleCount.getLocationAdjustmentsForTable"],
      });
      queryClient.invalidateQueries({
        queryKey: ["cycleCount.getAdjustmentStats"],
      });
      toast.success("Adjustment request rejected");
    },
    onError: (error) => {
      console.error("Failed to reject adjustment:", error);
      toast.error("Failed to reject adjustment request");
    },
  });

  const handleSelectAdjustmentType = (type: "quantity" | "location") => {
    if (type === "quantity") {
      setIsQuantityDialogOpen(true);
    } else {
      setIsLocationDialogOpen(true);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync({
        adjustmentRequestId: id as Id<"adjustment_requests">,
        approvedByUserId: userId,
      });
    } catch (_error) {
      // Error already handled in mutation
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectMutation.mutateAsync({
        adjustmentRequestId: id as Id<"adjustment_requests">,
        approvedByUserId: userId,
        resolutionNotes: "Rejected by user",
      });
    } catch (_error) {
      // Error already handled in mutation
    }
  };

  return (
    <PageWrapper>
      {/* Dialogs - Rendered conditionally to avoid unnecessary data fetching */}
      {isNewRequestDialogOpen && (
        <NewAdjustmentRequestDialog
          open={isNewRequestDialogOpen}
          onOpenChange={setIsNewRequestDialogOpen}
          onSelectType={handleSelectAdjustmentType}
        />
      )}
      {isQuantityDialogOpen && (
        <MultiQuantityAdjustmentDialog
          open={isQuantityDialogOpen}
          onOpenChange={setIsQuantityDialogOpen}
        />
      )}
      {isLocationDialogOpen && (
        <LocationTransferDialog
          open={isLocationDialogOpen}
          onOpenChange={setIsLocationDialogOpen}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Quantity Requests"
          value={displayStats.totalQuantityRequests}
          textColor="text-foreground"
        />
        <StatCard
          title="Pending Approval"
          value={displayStats.pendingApproval}
          textColor="text-yellow-600"
        />
        <StatCard
          title="Approved"
          value={displayStats.approved}
          textColor="text-green-600"
        />
        <StatCard
          title="Rejected"
          value={displayStats.rejected}
          textColor="text-red-600"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="quantity" className="w-full gap-0">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="quantity">Quantity Adjustments</TabsTrigger>
          <TabsTrigger value="location">Location Adjustments</TabsTrigger>
        </TabsList>

        <TabsContent value="quantity" className="mt-4">
          {/* Quantity Adjustments Table */}
          <QuantityAdjustmentsTable
            onApprove={handleApprove}
            onReject={handleReject}
            onNewRequest={() => setIsNewRequestDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="location" className="mt-4">
          {/* Location Adjustments Table */}
          <LocationAdjustmentsTable
            onApprove={handleApprove}
            onReject={handleReject}
            onNewRequest={() => setIsNewRequestDialogOpen(true)}
          />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
