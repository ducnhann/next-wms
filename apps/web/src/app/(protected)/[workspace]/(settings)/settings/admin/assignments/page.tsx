"use client";

import {
  Setting,
  SettingHeader,
  SettingSection,
} from "@/components/settings/setting";

export default function RoleAssignmentsPage() {
  return (
    <Setting>
      <SettingHeader
        title="Role Assignments"
        description="Assign roles to workspace members. Each member can have one role."
      />

      <SettingSection title="Manage Role Assignments">
        <div className="rounded-lg border p-4">
          <p className="text-sm">
            Role assignments functionality will be implemented here
          </p>
        </div>
      </SettingSection>
    </Setting>
  );
}
