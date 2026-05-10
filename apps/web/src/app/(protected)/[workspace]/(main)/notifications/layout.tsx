"use client";

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[calc(100vh-4rem)] pb-4">
      <div className="flex h-full gap-0 rounded-sm border">{children}</div>
    </div>
  );
}
