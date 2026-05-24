/**
 * Workspace settings layout — server component.
 *
 * Fetches the workspace (GET /v1/admin/workspaces/me with X-Workspace-Id header)
 * and renders a WorkspaceShell that provides the sub-nav tabs and workspace context.
 */
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import WorkspaceShell from "./workspace-shell";
import type { Workspace } from "@/lib/workspaces";
import type { PlanSlug } from "@/lib/workspaces";

const FORM_API_URL =
  process.env["NEXT_PUBLIC_FORM_API_URL"] ?? "http://localhost:4200";
const SESSION_COOKIE = "forms_session";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function WorkspaceLayout({ children, params }: LayoutProps) {
  const { slug } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  let workspace: Workspace | null = null;
  try {
    const res = await fetch(`${FORM_API_URL}/v1/admin/workspaces/me`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "X-Workspace-Id": slug,
      },
      cache: "no-store",
    });

    if (res.status === 404) {
      notFound();
    }

    if (res.ok) {
      workspace = (await res.json()) as Workspace;
    }
  } catch {
    // API not yet available — use a graceful fallback so the shell still renders
  }

  // Graceful fallback when API is not yet available (L19 in-flight)
  const workspaceName = workspace?.name ?? slug;
  const plan: PlanSlug = workspace?.plan ?? "free";

  return (
    <WorkspaceShell slug={slug} workspaceName={workspaceName} plan={plan}>
      {children}
    </WorkspaceShell>
  );
}
