"use client";

import {
  Setting,
  SettingHeader,
  SettingSection,
} from "@/components/settings/setting";
import { BranchesTable } from "@/components/table/branches-table";

export default function BranchesPage() {
  return (
    <Setting>
      <SettingHeader
        title="Branches Management"
        description="View and manage branches for your organization."
      />

      <SettingSection title="Branches">
        <BranchesTable />
      </SettingSection>
    </Setting>
  );
}
