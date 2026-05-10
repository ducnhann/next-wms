"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import NotificationsItem from "@/components/notification-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function NotificationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const workspace = params.workspace as string;
  const notiId = params.notiId as string;

  const { userId, organizationId } = useCurrentUser();

  const { data: notifications } = useQuery({
    ...convexQuery(api.notifications.listDetailed, {
      userId: userId as Id<"users">,
      organizationId: organizationId as Id<"organizations">,
    }),
    enabled: !!userId,
  });

  const selectedNotification = notifications?.find((n) => n._id === notiId);

  const handleBack = () => {
    router.push(`/${workspace}/notifications`);
  };

  return (
    <>
      {/* Notification List - Hidden on mobile when notification is selected */}
      <div
        className={`flex w-full flex-col border-r md:w-100 ${
          selectedNotification ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="flex h-10 items-center px-4">
          <span className="font-semibold">Notifications</span>
        </div>
        <Separator />
        <ScrollArea className="flex-1 py-1">
          {notifications?.map((notification) => (
            <NotificationsItem
              key={notification._id}
              notification={notification}
              href={`/${workspace}/notifications/${notification._id}` as Route}
            />
          ))}
        </ScrollArea>
      </div>

      {/* Details Panel */}
      <div
        className={`flex flex-1 flex-col ${
          selectedNotification ? "flex" : "hidden md:flex"
        }`}
      >
        <div className="flex h-10 items-center gap-2 px-4">
          {selectedNotification && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <span className="flex flex-1 gap-1 font-semibold">
            <Badge variant={"outline"} className="rounded-sm">
              {selectedNotification?.priority?.lookupValue}
            </Badge>
            <Badge variant={"outline"} className="rounded-sm">
              {selectedNotification?.notificationType}
            </Badge>
            <Badge variant={"outline"} className="rounded-sm">
              {selectedNotification?.category?.lookupValue}
            </Badge>
          </span>
        </div>
        <Separator />
        <div className="flex-1 p-4">
          {selectedNotification ? (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">
                {selectedNotification.title}
              </h2>
              <p className="text-muted-foreground text-sm">
                {selectedNotification.message}
              </p>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Oops! Details for notification {JSON.stringify(notiId)} not found.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
