"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "./ui/button";

export function Notification() {
  const params = useParams();
  const workspace = params.workspace as string;

  return (
    <Link href={`/${workspace}/notifications`}>
      <Button
        variant={"outline"}
        size="icon"
        className="group/toggle extend-touch-target relative size-8 overflow-hidden"
        title="Notification"
      >
        <Bell />
      </Button>
    </Link>
  );
}
