import { redirect } from "next/navigation";

export default async function AdminRootPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  redirect(`/${workspace}/settings/admin/workspace`);
}
