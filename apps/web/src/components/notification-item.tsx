"use client";

import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { formatRelativeTime } from "@/lib/format-date";
import type { NotificationItem } from "@/lib/types";

export default function NotificationsItem({
  notification,
  href,
}: {
  notification: NotificationItem;
  href: Route;
}) {
  const [isRead, setIsRead] = useState(!!notification.readAt);
  const { mutate: markAsRead } = useMutation({
    mutationFn: useConvexMutation(api.notifications.markAsRead),
  });

  useEffect(() => {
    setIsRead(!!notification.readAt);
  }, [notification.readAt]);

  const handleClick = () => {
    if (isRead) {
      return;
    }

    setIsRead(true);
    markAsRead(
      { notificationId: notification._id },
      {
        onError: () => setIsRead(false),
      }
    );
  };

  return (
    <Item asChild className="mx-2 my-1 px-2 py-1">
      <Link href={href} onClick={handleClick}>
        <ItemContent
          className={`${notification.dismissedAt ? "text-muted-foreground/70" : ""}`}
        >
          <ItemTitle className="w-full">
            {!isRead && (
              <span className="h-2 w-2 rounded-full bg-blue-500" />
            )}
            <span className="text-sm">{notification.title}</span>
            <span className="ml-auto text-muted-foreground text-xs">
              {formatRelativeTime(new Date(notification._creationTime))}
            </span>
          </ItemTitle>
          <ItemDescription className="max-w-xs truncate text-sm">
            {notification.message}
          </ItemDescription>
        </ItemContent>
      </Link>
    </Item>
  );
}
