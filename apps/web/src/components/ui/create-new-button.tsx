"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CreateNewButtonProps {
  label: string;
  onClick?: () => void;
}

/**
 * Animated button that expands on hover to show the label.
 * Used as a trigger for dialogs like CreateRoleDialog, AddMemberDialog, CreateBrandDialog.
 */
export function CreateNewButton({ label, onClick }: CreateNewButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Button
      variant={"outline"}
      className="overflow-hidden px-2.5 py-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <motion.div className="flex items-center">
        <Plus />
        <motion.span
          initial={false}
          animate={isHovered ? "hover" : "initial"}
          variants={{
            initial: { width: 0, opacity: 0, marginLeft: 0 },
            hover: { width: "auto", opacity: 1, marginLeft: 8 },
          }}
          className="overflow-hidden whitespace-nowrap"
        >
          {label}
        </motion.span>
      </motion.div>
    </Button>
  );
}
