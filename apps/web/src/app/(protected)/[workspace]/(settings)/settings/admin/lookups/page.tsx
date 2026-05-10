"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Setting,
  SettingHeader,
  SettingSection,
} from "@/components/settings/setting";
import { Badge } from "@/components/ui/badge";
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
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDebouncedInput } from "@/hooks/use-debounced-input";
import { fuzzyMatch } from "@/lib/utils";
import { LookupAction } from "./components/lookup-action";
import { CreateLookupDialog } from "./components/lookup-dialogs";

export default function SystemLookupsPage() {
  const { organizationId } = useCurrentUser();

  const { data: lookups, isPending } = useQuery({
    ...convexQuery(
      api.systemLookups.list,
      organizationId && organizationId !== ""
        ? { organizationId: organizationId as Id<"organizations"> }
        : "skip",
    ),
    enabled: !!organizationId && organizationId !== "",
  });

  const [setTypeSearchQuery, typeSearchQuery, typeSearchQueryDebounced] =
    useDebouncedInput("");

  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Extract unique lookup types
  const lookupTypes = useMemo(() => {
    if (!lookups) return [];
    const types = [...new Set(lookups.map((l) => l.lookupType))];
    return types.sort((a, b) => a.localeCompare(b));
  }, [lookups]);

  // Filter lookup types by search query
  const filteredTypes = useMemo(() => {
    if (!typeSearchQueryDebounced.trim()) return lookupTypes;
    return lookupTypes.filter((type) =>
      fuzzyMatch(typeSearchQueryDebounced, type),
    );
  }, [lookupTypes, typeSearchQueryDebounced]);

  // Get lookup values for selected type, sorted by sortOrder
  const selectedTypeLookups = useMemo(() => {
    if (!lookups || !selectedType) return [];
    return lookups
      .filter((l) => l.lookupType === selectedType)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [lookups, selectedType]);

  // Auto-select first type when data loads
  useMemo(() => {
    if (lookupTypes.length > 0 && !selectedType) {
      setSelectedType(lookupTypes[0]);
    }
  }, [lookupTypes, selectedType]);

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

  if (isPending) {
    return (
      <Setting>
        <SettingHeader
          title="System Lookups"
          description="View and manage system lookup types and their values."
        />
        <div className="flex h-40 items-center justify-center">
          <p className="text-muted-foreground">Loading lookups...</p>
        </div>
      </Setting>
    );
  }

  return (
    <Setting>
      <SettingHeader
        title="System Lookups"
        description="View and manage system lookup types and their values."
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column - Lookup Types */}
        <SettingSection title="Lookup Types" className="flex min-h-0 flex-col">
          <div className="flex min-h-0 flex-1 flex-col space-y-4">
            <div className="flex w-full items-center gap-2">
              <SearchInput
                value={typeSearchQuery}
                onChange={(e) => setTypeSearchQuery(e.target.value)}
                placeholder="Search lookup types..."
                count={filteredTypes.length}
              />
              <CreateLookupDialog
                organizationId={organizationId as Id<"organizations">}
              />
            </div>
            <ScrollArea className="h-75 lg:h-[calc(100vh-20rem)]">
              <div className="space-y-2">
                {filteredTypes.map((type) => (
                  <Item
                    key={type}
                    className="cursor-pointer py-2"
                    variant={selectedType === type ? "muted" : "default"}
                    onClick={() => setSelectedType(type)}
                  >
                    <ItemContent>
                      <ItemTitle>{type}</ItemTitle>
                      <ItemDescription>
                        {lookups?.filter((l) => l.lookupType === type).length}{" "}
                        values
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                ))}
                {!filteredTypes.length && (
                  <p className="p-4 text-center text-muted-foreground text-sm">
                    No lookup types found matching "{typeSearchQuery}"
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </SettingSection>

        {/* Right Column - Lookup Values */}
        <SettingSection
          title={selectedType ? `Values: ${selectedType}` : "Select a type"}
          className="flex min-h-0 flex-col"
        >
          <div className="flex min-h-0 flex-1 flex-col space-y-4">
            {selectedType && (
              <div className="flex w-full items-center gap-2">
                <div className="flex-1" />
                <CreateLookupDialog
                  organizationId={organizationId as Id<"organizations">}
                  defaultLookupType={selectedType}
                />
              </div>
            )}
            <ScrollArea className="h-75 lg:h-[calc(100vh-20rem)]">
              <div className="space-y-2">
                {selectedTypeLookups.map((lookup) => (
                  <Item key={lookup._id} className="py-2">
                    <ItemContent>
                      <div className="flex items-center gap-2">
                        <ItemTitle>{lookup.lookupValue}</ItemTitle>
                        <Badge variant="outline" className="text-xs">
                          {lookup.lookupCode}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          #{lookup.sortOrder}
                        </span>
                      </div>
                      <ItemDescription>{lookup.description}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <LookupAction lookup={lookup} />
                    </ItemActions>
                  </Item>
                ))}
                {!selectedType && (
                  <p className="p-4 text-center text-muted-foreground text-sm">
                    Select a lookup type to view its values
                  </p>
                )}
                {selectedType && !selectedTypeLookups.length && (
                  <p className="p-4 text-center text-muted-foreground text-sm">
                    No values found for this lookup type
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </SettingSection>
      </div>
    </Setting>
  );
}
