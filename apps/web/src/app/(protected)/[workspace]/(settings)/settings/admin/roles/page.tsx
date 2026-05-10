"use client";

import {
  DEFAULT_ROLES,
  getPermissionDisplayKeys,
  permissionDisplayConfig,
  type RoleStatements,
} from "@wms/backend/lib/permissions";
import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MembersAction } from "@/app/(protected)/[workspace]/(settings)/settings/admin/roles/components/members-action";
import {
  Setting,
  SettingHeader,
  SettingSection,
} from "@/components/settings/setting";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedInput } from "@/hooks/use-debounced-input";
import { useMembers } from "@/hooks/use-members";
import { useRoles, useUpdateRole } from "@/hooks/use-roles";
import { useActiveOrganization } from "@/lib/auth/client";
import { fuzzyMatch } from "@/lib/utils";
import { AddMemberDialog } from "./components/add-member-dialog";
import { CreateRoleDialog } from "./components/create-role-dialog";
import { RolesAction } from "./components/roles-action";

const SearchInput = ({
  value,
  onChange,
  placeholder,
  count,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  count: number;
}) => (
  <InputGroup>
    <InputGroupInput
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
    <InputGroupAddon>
      <Search />
    </InputGroupAddon>
    {value && (
      <InputGroupAddon align="inline-end">{count} results</InputGroupAddon>
    )}
  </InputGroup>
);

export default function RolesSettingsPage() {
  const { data: activeOrganization } = useActiveOrganization();
  const { data } = useRoles(activeOrganization?.id);
  const { data: membersData } = useMembers({
    organizationId: activeOrganization?.id,
  });

  const [setRoleSearchQuery, roleSearchQuery, roleSearchQueryDebounced] =
    useDebouncedInput("");
  const [
    setPermissionSearchQuery,
    permissionSearchQuery,
    permissionSearchQueryDebounced,
  ] = useDebouncedInput("");
  const [setMemberSearchQuery, memberSearchQuery, memberSearchQueryDebounced] =
    useDebouncedInput("");
  const [tabsValue, setTabsValue] = useState("permissions");
  const [isSaving, setIsSaving] = useState(false);
  const updateRoleMutation = useUpdateRole();

  const roles = data?.data;

  // Map fetched custom roles to match DEFAULT_ROLES structure
  const customRoles = useMemo(() => {
    if (!roles) return [];
    return roles.map((role) => ({
      id: role.id,
      name: role.role,
      role: {
        // Map permission from API to statements format
        statements: (role.permission || {}) as RoleStatements,
      },
      isDefault: false,
    }));
  }, [roles]);

  const allRoles = useMemo(
    () => [...DEFAULT_ROLES, ...customRoles],
    [customRoles],
  );

  const [selectedRole, setSelectedRole] = useState<(typeof allRoles)[number]>(
    allRoles[0],
  );

  const filteredMembers = useMemo(() => {
    const roleSlug = selectedRole?.isDefault
      ? selectedRole.id
      : selectedRole?.name;

    const m =
      selectedRole && roleSlug
        ? membersData?.members?.filter((mem) => mem.role === roleSlug)
        : membersData?.members || [];
    if (!memberSearchQueryDebounced.trim()) return m;
    return (m ?? []).filter(
      (mem) =>
        fuzzyMatch(memberSearchQueryDebounced, mem.user.name) ||
        fuzzyMatch(memberSearchQueryDebounced, mem.user.email),
    );
  }, [memberSearchQueryDebounced, selectedRole, membersData?.members]);

  const selectedRolePermissions = useMemo<RoleStatements>(
    () => selectedRole?.role.statements || {},
    [selectedRole],
  );

  // Build the initial permission switch state map from the selected role
  const initialSwitchState = useMemo(() => {
    const stateMap: Record<string, Record<string, boolean>> = {};
    for (const resource of getPermissionDisplayKeys()) {
      const section = permissionDisplayConfig[resource];
      stateMap[resource] = {};
      for (const key of Object.keys(section.permissions)) {
        stateMap[resource][key] =
          selectedRolePermissions[resource]?.includes(key) ?? false;
      }
    }
    return stateMap;
  }, [selectedRolePermissions]);

  // Local state for permission switches (only used for custom roles)
  const [permissionSwitchState, setPermissionSwitchState] =
    useState<Record<string, Record<string, boolean>>>(initialSwitchState);

  // Sync local state when selected role changes
  useEffect(() => {
    setPermissionSwitchState(initialSwitchState);
  }, [initialSwitchState]);

  // Check if there are any modifications from the initial state
  const isModified = useMemo(() => {
    if (selectedRole?.isDefault) return false;
    for (const resource of Object.keys(permissionSwitchState)) {
      for (const key of Object.keys(permissionSwitchState[resource] || {})) {
        if (
          permissionSwitchState[resource]?.[key] !==
          initialSwitchState[resource]?.[key]
        ) {
          return true;
        }
      }
    }
    return false;
  }, [permissionSwitchState, initialSwitchState, selectedRole?.isDefault]);

  // Handler for toggling a permission switch
  const handlePermissionToggle = useCallback(
    (resource: string, permissionKey: string) => {
      if (selectedRole?.isDefault) {
        toast.warning("Default role permissions cannot be modified");
        return;
      }
      setPermissionSwitchState((prev) => ({
        ...prev,
        [resource]: {
          ...prev[resource],
          [permissionKey]: !prev[resource]?.[permissionKey],
        },
      }));
    },
    [selectedRole?.isDefault],
  );

  // Handler for saving changes
  const handleSaveChanges = useCallback(async () => {
    if (!selectedRole || selectedRole.isDefault || !activeOrganization?.id) {
      return;
    }

    setIsSaving(true);
    try {
      // Convert permission switch state to the API format
      const permission: Record<string, string[]> = {};
      for (const [resource, permissions] of Object.entries(
        permissionSwitchState,
      )) {
        const enabledPermissions = Object.entries(permissions || {})
          .filter(([, enabled]) => enabled)
          .map(([key]) => key);
        if (enabledPermissions.length > 0) {
          permission[resource] = enabledPermissions;
        }
      }

      await updateRoleMutation.mutateAsync({
        data: {
          roleId: selectedRole.id,
          organizationId: activeOrganization.id,
          data: {
            permission,
          },
        },
      });

      toast.success("Changes saved successfully");
    } catch (error) {
      toast.error("Failed to save changes");
      console.error("Error saving role permissions:", error);
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedRole,
    activeOrganization?.id,
    permissionSwitchState,
    updateRoleMutation,
  ]);

  // Handler for canceling changes
  const handleCancelChanges = useCallback(() => {
    setPermissionSwitchState(initialSwitchState);
    toast.info("Changes discarded");
  }, [initialSwitchState]);

  const filteredRoles = useMemo(() => {
    if (!roleSearchQueryDebounced.trim()) return allRoles;

    return allRoles.filter((role) =>
      fuzzyMatch(roleSearchQueryDebounced, role.name),
    );
  }, [roleSearchQueryDebounced, allRoles]);

  const filteredPermissions = useMemo(() => {
    if (!permissionSearchQueryDebounced.trim())
      return Object.values(permissionDisplayConfig);

    return Object.values(permissionDisplayConfig)
      .map((section) => {
        if (fuzzyMatch(permissionSearchQueryDebounced, section.label))
          return section;

        const filteredPerms = Object.entries(section.permissions).filter(
          ([, p]) =>
            fuzzyMatch(permissionSearchQueryDebounced, p.label) ||
            fuzzyMatch(permissionSearchQueryDebounced, p.description),
        );

        return filteredPerms.length > 0
          ? { ...section, permissions: Object.fromEntries(filteredPerms) }
          : null;
      })
      .filter(
        (section): section is NonNullable<typeof section> => section !== null,
      );
  }, [permissionSearchQueryDebounced]);

  const filteredPermissionCount = useMemo(
    () =>
      filteredPermissions.reduce(
        (count, section) =>
          count + Object.keys(section?.permissions || {}).length,
        0,
      ),
    [filteredPermissions],
  );

  return (
    <Setting>
      <SettingHeader
        title="Roles Management"
        description="Manage roles and permissions for your organization."
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
        <SettingSection title="Roles" className="flex min-h-0 flex-col">
          <div className="flex min-h-0 flex-1 flex-col space-y-4">
            <div className="flex w-full items-center gap-2">
              <SearchInput
                value={roleSearchQuery}
                onChange={(e) => setRoleSearchQuery(e.target.value)}
                placeholder="Search..."
                count={filteredRoles.length}
              />
              <CreateRoleDialog customRoles={customRoles} />
            </div>
            <ScrollArea className="h-75 lg:h-[calc(100vh-20rem)]">
              <div className="space-y-2">
                {filteredRoles.map((role) => (
                  <Item
                    key={role.id}
                    className="cursor-pointer py-2"
                    variant={selectedRole?.id === role.id ? "muted" : "default"}
                    onClick={() => setSelectedRole(role)}
                  >
                    <ItemContent>
                      <ItemTitle>{role.name}</ItemTitle>
                      <ItemDescription>
                        {role.isDefault ? "Default role" : "Custom role"}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <RolesAction roleId={role.id} roleName={role.name} />
                    </ItemActions>
                  </Item>
                ))}
                {!filteredRoles.length && (
                  <p className="p-4 text-center text-muted-foreground text-sm">
                    {roleSearchQuery
                      ? `No roles found matching "${roleSearchQuery}"`
                      : "No roles found"}
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </SettingSection>

        <SettingSection title="Details" className="flex min-h-0 flex-col">
          <Tabs
            defaultValue="permissions"
            onValueChange={setTabsValue}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="mb-2 w-full">
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
            </TabsList>
            <div className="flex w-full items-center gap-2">
              <SearchInput
                value={
                  tabsValue === "permissions"
                    ? permissionSearchQuery
                    : memberSearchQuery
                }
                onChange={(e) =>
                  (tabsValue === "permissions"
                    ? setPermissionSearchQuery
                    : setMemberSearchQuery)(e.target.value)
                }
                placeholder={
                  tabsValue === "permissions"
                    ? "Search permissions..."
                    : "Search members..."
                }
                count={
                  tabsValue === "permissions"
                    ? filteredPermissionCount
                    : filteredMembers?.length || 0
                }
              />
              {tabsValue === "members" && (
                <AddMemberDialog
                  selectedRoleId={
                    selectedRole?.isDefault
                      ? selectedRole.id
                      : selectedRole?.name
                  }
                  selectedRoleName={selectedRole?.name}
                />
              )}
            </div>

            <TabsContent
              value="permissions"
              className="flex flex-1 flex-col overflow-hidden data-[state=active]:flex"
            >
              <ScrollArea className="h-[calc(100vh-18rem)]">
                <div className="py-4">
                  {filteredPermissions.map((section) => {
                    // Use label comparison instead of reference comparison
                    // because filtered sections are new objects with filtered permissions
                    const resource = getPermissionDisplayKeys().find(
                      (r) => permissionDisplayConfig[r].label === section.label,
                    );
                    return (
                      <div key={section.label} className="mb-6">
                        <h3 className="mb-2 font-semibold">{section.label}</h3>
                        <div className="space-y-1">
                          {Object.entries(section.permissions).map(
                            ([key, permission]) => {
                              // Get switch state from controlled state map
                              const isEnabled = resource
                                ? (permissionSwitchState[resource]?.[key] ??
                                  false)
                                : false;

                              return (
                                <Item className="py-2" key={key}>
                                  <ItemContent>
                                    <ItemTitle>{permission.label}</ItemTitle>
                                    <ItemDescription>
                                      {permission.description}
                                    </ItemDescription>
                                  </ItemContent>
                                  <ItemActions>
                                    <Switch
                                      checked={isEnabled}
                                      onCheckedChange={() =>
                                        resource &&
                                        handlePermissionToggle(resource, key)
                                      }
                                    />
                                  </ItemActions>
                                </Item>
                              );
                            },
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {!filteredPermissions.length && (
                    <p className="p-4 text-center text-muted-foreground text-sm">
                      {permissionSearchQuery
                        ? `No permissions found matching "${permissionSearchQuery}"`
                        : "No permissions found"}
                    </p>
                  )}
                </div>
              </ScrollArea>
              {/* Save/Cancel buttons for custom roles with modifications */}
              {isModified && (
                <div className="mt-4 flex justify-end gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={handleCancelChanges}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="members"
              className="flex flex-1 flex-col overflow-hidden data-[state=active]:flex"
            >
              <ScrollArea className="h-[calc(100vh-18rem)]">
                <div className="space-y-2 py-4">
                  {filteredMembers?.map((member) => {
                    const initials = member.user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase();
                    return (
                      <Item key={member.user.id} className="py-2">
                        <ItemContent>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-sm">
                              {initials}
                            </div>
                            <div className="flex flex-col">
                              <ItemTitle>{member.user.name}</ItemTitle>
                              <ItemDescription>
                                {member.user.email}
                              </ItemDescription>
                            </div>
                          </div>
                        </ItemContent>
                        <ItemActions>
                          <MembersAction
                            memberId={member.id}
                            memberName={member.user.name}
                            roleId={
                              selectedRole?.isDefault
                                ? selectedRole.id
                                : selectedRole?.name || "N/A"
                            }
                            roleName={selectedRole?.name || "N/A"}
                          />
                        </ItemActions>
                      </Item>
                    );
                  })}
                  {!filteredMembers?.length && (
                    <p className="p-4 text-center text-muted-foreground text-sm">
                      {memberSearchQuery
                        ? `No members found matching "${memberSearchQuery}"`
                        : "No members found"}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SettingSection>
      </div>
    </Setting>
  );
}
