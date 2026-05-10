import {
  Setting,
  SettingHeader,
  SettingSection,
} from "@/components/settings/setting";
import { ThemeSelector } from "@/components/theme-selector";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";

export default function PreferencesPage() {
  return (
    <Setting>
      <SettingHeader
        title="Preferences"
        description="Manage your personal preferences and settings"
      />

      <SettingSection title="Theme">
        <Item className="border border-border">
          <ItemContent>
            <ItemTitle>Interface theme</ItemTitle>
            <ItemDescription>
              Select your interface color scheme
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <ThemeSelector />
          </ItemActions>
        </Item>
      </SettingSection>
    </Setting>
  );
}
