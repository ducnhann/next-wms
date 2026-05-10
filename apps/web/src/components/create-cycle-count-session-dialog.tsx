"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { springTransition } from "@/components/easing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

interface CreateCycleCountSessionDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type DialogView = "type-selection" | "form";
type CycleCountType = "daily" | "weekly";

interface ZoneAssignment {
  id: string;
  zoneId: string;
  workerId: string;
}

// Generate session code like CC-2026-001
function generateSessionCode(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `CC-${year}-${random}`;
}

export const CreateCycleCountSessionDialog = React.memo(
  function CreateCycleCountSessionDialog({
    open,
    onOpenChange,
  }: CreateCycleCountSessionDialogProps) {
    const { organizationId, userId } = useCurrentUser();
    const { currentBranch } = useBranches({
      organizationId: organizationId as Id<"organizations"> | undefined,
      includeDeleted: false,
    });

    const [view, setView] = React.useState<DialogView>("type-selection");
    const [cycleCountType, setCycleCountType] =
      React.useState<CycleCountType | null>(null);
    const [isControlled] = React.useState(open !== undefined);
    const [internalOpen, setInternalOpen] = React.useState(false);

    const dialogOpen = isControlled ? open : internalOpen;

    // Fetch storage zones for the current branch (only rack-type zones)
    const { data: storageZones } = useQuery({
      ...convexQuery(
        api.storageZones.getRackByBranch,
        currentBranch?._id
          ? { branchId: currentBranch._id as Id<"branches"> }
          : "skip",
      ),
      enabled: !!currentBranch?._id,
    });

    // Fetch organization users (workers)
    const { data: workers } = useQuery({
      ...convexQuery(api.cycleCount.getOrganizationUsers, {
        organizationId: organizationId as Id<"organizations">,
      }),
      enabled: !!organizationId && organizationId !== "",
    });

    // Fetch cycle count lookups
    const { data: lookups } = useQuery({
      ...convexQuery(api.cycleCount.getCycleCountLookups, {}),
      enabled: true,
    });

    // Create session mutation
    const { mutate: createSession, isPending: isCreating } = useMutation({
      mutationFn: useConvexMutation(api.cycleCount.createCycleCountSession),
      onSuccess: () => {
        // Convex queries are reactive and will auto-update
        // Close the dialog on success
        handleClose();
      },
    });

    // Form states
    const [sessionName, setSessionName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [zoneAssignments, setZoneAssignments] = React.useState<
      ZoneAssignment[]
    >([{ id: "1", zoneId: "", workerId: "" }]);

    const handleClose = React.useCallback(() => {
      // Reset state when dialog closes
      setView("type-selection");
      setCycleCountType(null);
      setSessionName("");
      setDescription("");
      setZoneAssignments([{ id: "1", zoneId: "", workerId: "" }]);
      if (isControlled) {
        onOpenChange?.(false);
      } else {
        setInternalOpen(false);
      }
    }, [onOpenChange, isControlled]);

    const handleOpenChange = React.useCallback(
      (newOpen: boolean) => {
        if (!newOpen) {
          handleClose();
        } else if (isControlled) {
          onOpenChange?.(true);
        } else {
          setInternalOpen(true);
        }
      },
      [handleClose, onOpenChange, isControlled],
    );

    const handleSelectType = React.useCallback(
      (type: CycleCountType) => {
        setCycleCountType(type);

        // For daily, auto-select first 2 zones; for weekly, show first 5 zones
        const zones = storageZones ?? [];
        if (type === "daily") {
          const selectedZones = zones.slice(0, 2);
          setZoneAssignments(
            selectedZones.length > 0
              ? selectedZones.map((zone, idx) => ({
                  id: String(idx + 1),
                  zoneId: zone._id,
                  workerId: "",
                }))
              : [{ id: "1", zoneId: "", workerId: "" }],
          );
        } else {
          const selectedZones = zones.slice(0, 5);
          setZoneAssignments(
            selectedZones.length > 0
              ? selectedZones.map((zone, idx) => ({
                  id: String(idx + 1),
                  zoneId: zone._id,
                  workerId: "",
                }))
              : [{ id: "1", zoneId: "", workerId: "" }],
          );
        }

        setView("form");
      },
      [storageZones],
    );

    const handleChangeType = React.useCallback(() => {
      setView("type-selection");
    }, []);

    const handleAddZone = React.useCallback(() => {
      const newId = String(Date.now());
      setZoneAssignments((prev) => [
        ...prev,
        { id: newId, zoneId: "", workerId: "" },
      ]);
    }, []);

    const handleRemoveZone = React.useCallback((id: string) => {
      setZoneAssignments((prev) => {
        if (prev.length > 1) {
          return prev.filter((z) => z.id !== id);
        }
        return prev;
      });
    }, []);

    const handleZoneChange = React.useCallback((id: string, zoneId: string) => {
      setZoneAssignments((prev) =>
        prev.map((z) => (z.id === id ? { ...z, zoneId } : z)),
      );
    }, []);

    const handleWorkerChange = React.useCallback(
      (id: string, workerId: string) => {
        setZoneAssignments((prev) =>
          prev.map((z) => (z.id === id ? { ...z, workerId } : z)),
        );
      },
      [],
    );

    const handleCreateSession = React.useCallback(() => {
      if (
        !organizationId ||
        !currentBranch?._id ||
        !userId ||
        !lookups?.sessionTypeId ||
        !lookups?.defaultStatusId ||
        !cycleCountType
      ) {
        console.error("Missing required data for creating session");
        return;
      }

      // Find the cycle count type ID
      const cycleCountTypeId = lookups.cycleCountTypes.find(
        (t) => t.lookupCode === cycleCountType.toUpperCase(),
      )?._id;

      if (!cycleCountTypeId) {
        console.error("Cycle count type not found");
        return;
      }

      createSession({
        organizationId: organizationId as Id<"organizations">,
        branchId: currentBranch._id,
        sessionTypeId: lookups.sessionTypeId,
        sessionCode: generateSessionCode(),
        name: sessionName,
        description: description || undefined,
        cycleCountTypeId: cycleCountTypeId as Id<"system_lookups">,
        assignedUserId: userId,
        sessionStatusTypeId: lookups.defaultStatusId,
        zoneAssignments: zoneAssignments
          .filter((z) => z.zoneId !== "")
          .map((z) => ({
            zoneId: z.zoneId as Id<"storage_zones">,
            assignedUserId: z.workerId
              ? (z.workerId as Id<"users">)
              : undefined,
          })),
      });
    }, [
      organizationId,
      currentBranch?._id,
      userId,
      lookups,
      cycleCountType,
      sessionName,
      description,
      zoneAssignments,
      createSession,
    ]);

    const isFormValid =
      sessionName.trim() !== "" &&
      zoneAssignments.every((z) => z.zoneId !== "") &&
      !isCreating;

    return (
      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Session
          </Button>
        </DialogTrigger>
        <DialogContent
          showCloseButton={false}
          className="overflow-hidden sm:max-w-lg"
        >
          <AnimatePresence mode={"popLayout"} initial={false}>
            {view === "type-selection" ? (
              <motion.div
                key="type-selection"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springTransition}
              >
                <DialogHeader className="relative">
                  <DialogTitle>Create Cycle Count Session</DialogTitle>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="absolute top-0 right-0 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </button>
                </DialogHeader>

                <div className="mt-6 space-y-4">
                  <p className="font-medium text-sm">Select Cycle Count Type</p>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleSelectType("daily")}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors hover:bg-accent",
                      )}
                    >
                      <span className="font-semibold">Daily</span>
                      <span className="text-muted-foreground text-xs">
                        Auto-select 2 longest unchecked zones
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectType("weekly")}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors hover:bg-accent",
                      )}
                    >
                      <span className="font-semibold">Weekly</span>
                      <span className="text-muted-foreground text-xs">
                        Customize all zones and counts
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={springTransition}
              >
                <DialogHeader className="relative">
                  <DialogTitle>Create Cycle Count Session</DialogTitle>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="absolute top-0 right-0 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </button>
                </DialogHeader>

                <div className="mt-4 space-y-5">
                  {/* Change Type Link */}
                  <button
                    type="button"
                    onClick={handleChangeType}
                    className="flex items-center gap-1 text-primary text-sm hover:underline"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Change Type
                  </button>

                  {/* Session Name */}
                  <Field>
                    <FieldLabel>Session Name</FieldLabel>
                    <Input
                      placeholder={
                        cycleCountType === "daily"
                          ? "e.g., Daily Cycle Count"
                          : "e.g., Weekly Cycle Count"
                      }
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                    />
                  </Field>

                  {/* Description */}
                  <Field>
                    <FieldLabel>Description (Optional)</FieldLabel>
                    <Textarea
                      placeholder="Add any notes..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-20 resize-none"
                    />
                  </Field>

                  {/* Storage Zones */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FieldLabel>Storage Zones</FieldLabel>
                      <button
                        type="button"
                        onClick={handleAddZone}
                        className="flex items-center gap-1 text-primary text-sm hover:underline"
                      >
                        <Plus className="h-3 w-3" />
                        Add Zone
                      </button>
                    </div>

                    <div className="max-h-50 space-y-2 overflow-y-auto pr-1">
                      {zoneAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center gap-2"
                        >
                          {/* Zone Select */}
                          <Select
                            value={assignment.zoneId}
                            onValueChange={(value) =>
                              handleZoneChange(assignment.id, value)
                            }
                          >
                            <SelectTrigger className="h-9 flex-1">
                              <SelectValue placeholder="Select zone..." />
                            </SelectTrigger>
                            <SelectContent>
                              {(storageZones ?? []).map((zone) => (
                                <SelectItem key={zone._id} value={zone._id}>
                                  {zone.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Worker Select */}
                          <Select
                            value={assignment.workerId}
                            onValueChange={(value) =>
                              handleWorkerChange(assignment.id, value)
                            }
                          >
                            <SelectTrigger className="h-9 flex-1">
                              <SelectValue placeholder="Assign worker..." />
                            </SelectTrigger>
                            <SelectContent>
                              {(workers ?? []).map((worker) => (
                                <SelectItem key={worker._id} value={worker._id}>
                                  {worker.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Remove Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleRemoveZone(assignment.id)}
                            disabled={zoneAssignments.length <= 1}
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSession} disabled={!isFormValid}>
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Session"
                    )}
                  </Button>
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    );
  },
);
