"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { Bell } from "lucide-react";
import type { Route } from "next";
import { useParams } from "next/navigation";
import NotificationsItem from "@/components/notification-item";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function NotificationsPage() {
  const { userId, organizationId } = useCurrentUser();
  const params = useParams();
  const workspace = params.workspace as string;

  const { data: notifications } = useQuery({
    ...convexQuery(api.notifications.listDetailed, {
      userId: userId as Id<"users">,
      organizationId: organizationId as Id<"organizations">,
    }),
    enabled: !!userId && !!organizationId,
  });

  return (
    <>
      {/* Notification List */}
      <div className="flex w-full flex-col border-r md:w-100">
        <div className="flex h-10 items-center px-4">
          <span className="font-semibold">Notifications</span>
        </div>
        <Separator />
        {notifications && notifications.length > 0 ? (
          <ScrollArea className="flex-1 py-1">
            {notifications.map((notification) => (
              <NotificationsItem
                key={notification._id}
                notification={notification}
                href={
                  `/${workspace}/notifications/${notification._id}` as Route
                }
              />
            ))}
          </ScrollArea>
        ) : (
          <div className="flex flex-1 items-center justify-center p-4">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Bell />
                </EmptyMedia>
                <EmptyTitle>No notifications</EmptyTitle>
                <EmptyDescription>
                  You don't have any notifications yet
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </div>

      {/* Details Panel - Empty state on desktop */}
      <div className="hidden flex-1 flex-col md:flex">
        <div className="flex h-10 items-center gap-2 px-4" />
        <Separator />
        <div className="flex flex-1 items-center justify-center p-4">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bell />
              </EmptyMedia>
              <EmptyTitle>No notification selected</EmptyTitle>
              <EmptyDescription>
                Select a notification from the list to view its details
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </div>
    </>
  );
}
