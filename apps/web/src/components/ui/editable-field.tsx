"use client";

import { Check, Pencil } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  inputClassName?: string;
  disabled?: boolean;
  isPending?: boolean;
  placeholder?: string;
  type?: string;
}

export function EditableField({
  value,
  onChange,
  onSave,
  inputClassName,
  disabled = false,
  isPending = false,
  placeholder,
  type = "text",
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);

  React.useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleEdit = () => {
    setEditValue(value);
    setIsEditing(true);
  };

  const handleSave = () => {
    onChange(editValue);
    if (onSave) {
      onSave();
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isEditing) {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <Input
        type={type}
        value={isEditing ? editValue : value}
        onChange={(e) => setEditValue(e.target.value)}
        disabled={!isEditing}
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
        className={inputClassName}
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={isEditing ? handleSave : handleEdit}
        disabled={disabled || isPending}
      >
        {isPending && isEditing ? (
          <Spinner />
        ) : isEditing ? (
          <Check />
        ) : (
          <Pencil />
        )}
      </Button>
    </div>
  );
}
