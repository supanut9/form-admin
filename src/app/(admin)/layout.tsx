/**
 * Admin route group layout — server component wrapper.
 *
 * Calls getSession() → /v1/auth/me to validate the session JWT server-side.
 * If the session is invalid or expired, redirects to /auth/login so the user
 * can re-authenticate (covers the gap between cookie presence and JWT validity).
 *
 * Passes session info to the client AppShell so the header can show the
 * user's email and a "Sign out" link.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { WorkspaceContextProvider } from "@/lib/workspace-context";
import AdminShell from "./shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <WorkspaceContextProvider>
      <AdminShell session={session}>{children}</AdminShell>
    </WorkspaceContextProvider>
  );
}
