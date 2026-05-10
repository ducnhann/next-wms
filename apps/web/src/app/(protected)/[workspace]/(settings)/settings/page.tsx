import { redirect } from "next/navigation";

export default async function SettingsRootPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  redirect(`/${workspace}/settings/preferences`);
}
