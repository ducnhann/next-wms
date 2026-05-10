import { format } from "date-fns";

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInWeeks = Math.floor(diffInDays / 7);

  // Less than 1 hour
  if (diffInMinutes < 60) {
    return diffInMinutes <= 1 ? "now" : `${diffInMinutes}m`;
  }

  // Less than 24 hours
  if (diffInHours < 24) {
    return `${diffInHours}hr`;
  }

  // Less than 7 days
  if (diffInDays < 7) {
    return `${diffInDays}d`;
  }

  // Less than 4 weeks (28 days)
  if (diffInDays < 28) {
    return `${diffInWeeks}w`;
  }

  // Older than 4 weeks - show exact date
  return format(date, "M/d/yy");
}
