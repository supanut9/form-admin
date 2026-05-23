/**
 * Settings sub-shell layout — server component.
 * Reads the session (already validated by the parent (admin)/layout.tsx)
 * and renders a left sub-nav for the settings sections.
 */
import { getSession } from "@/lib/session";
import SettingsShell from "./shell";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Session is guaranteed non-null here: parent layout already redirected.
  const session = await getSession();

  return <SettingsShell session={session!}>{children}</SettingsShell>;
}
