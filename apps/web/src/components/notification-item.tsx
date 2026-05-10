import type { Route } from "next";
import Link from "next/link";
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
  return (
    <Item asChild className="mx-2 my-1 px-2 py-1">
      <Link href={href}>
        <ItemContent
          className={`${notification.dismissedAt ? "text-muted-foreground/70" : ""}`}
        >
          <ItemTitle className="w-full">
            {!notification.readAt && (
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
