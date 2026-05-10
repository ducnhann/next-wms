"use client";

import {
  Setting,
  SettingHeader,
  SettingSection,
} from "@/components/settings/setting";
import { MembersTable } from "@/components/table/members-table";

export default function MembersPage() {
  return (
    <Setting>
      <SettingHeader
        title="Members Management"
        description="View and manage workspace members."
      />

      <SettingSection title="Members">
        <MembersTable />
      </SettingSection>
    </Setting>
  );
}
