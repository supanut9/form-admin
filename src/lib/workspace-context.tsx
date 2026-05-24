"use client";

/**
 * WorkspaceContext — provides the active workspace slug/id and allWorkspaces list.
 *
 * Priority order for the active workspace:
 *  1. URL path segment: /workspaces/[slug]/...
 *  2. Query param:      ?ws=<slug>
 *  3. Cookie:           current_workspace_slug
 *  4. First workspace in the list (fallback)
 *
 * Flash caveat: the initial render uses the URL/cookie heuristic. If the cookie's
 * slug doesn't match the URL on the first paint there may be a brief mismatch until
 * the provider reconciles and calls router.replace(). This is acceptable because the
 * component is client-side only; a proper RSC-based solution would require passing
 * the cookie value down from the server layout, which is a larger refactor.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  Suspense,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { formClient } from "@/lib/form-client";
import { setWorkspaceSlug } from "@/lib/form-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  plan: {
    slug: "free" | "starter" | "pro" | "business";
    name: string;
  };
}

interface WorkspaceContextValue {
  currentSlug: string | null;
  currentId: string | null;
  allWorkspaces: Workspace[];
  isLoading: boolean;
  switchTo: (slug: string) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

// ---------------------------------------------------------------------------
// Cookie helpers (client-side only)
// ---------------------------------------------------------------------------

const COOKIE_KEY = "current_workspace_slug";

function readCookieSlug(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_KEY}=`));
  return match ? decodeURIComponent(match.split("=")[1]!) : null;
}

function writeCookieSlug(slug: string): void {
  if (typeof document === "undefined") return;
  // 30 days
  const maxAge = 60 * 60 * 24 * 30;
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(slug)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/** Extract workspace slug from path `/workspaces/[slug]/...` */
function slugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/workspaces\/([^/]+)/);
  return m ? (m[1] ?? null) : null;
}

/** Replace the workspace slug segment in a `/workspaces/[slug]/...` path. */
function replaceSlugInPath(pathname: string, newSlug: string): string {
  return pathname.replace(/^(\/workspaces\/)([^/]+)/, `$1${newSlug}`);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Inner provider — uses useSearchParams() which requires a Suspense boundary.
 * Rendered by WorkspaceContextProvider which wraps it in <Suspense>.
 */
function WorkspaceContextProviderInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Fetch all workspaces the current user belongs to.
  const { data: allWorkspaces = [], isLoading } = useQuery<Workspace[]>({
    queryKey: ["workspaces", "me"],
    queryFn: () =>
      formClient.get<Workspace[]>("/v1/admin/workspaces"),
    staleTime: 60_000,
  });

  // Derive the initial slug from URL → cookie → first workspace.
  const derivedSlug = useMemo<string | null>(() => {
    const fromPath = slugFromPath(pathname);
    if (fromPath) return fromPath;
    const fromQs = searchParams.get("ws");
    if (fromQs) return fromQs;
    const fromCookie = readCookieSlug();
    if (fromCookie) return fromCookie;
    return allWorkspaces[0]?.slug ?? null;
  }, [pathname, searchParams, allWorkspaces]);

  const [activeSlug, setActiveSlug] = useState<string | null>(derivedSlug);

  // Sync active slug when derivedSlug changes (e.g. after workspaces load).
  useEffect(() => {
    if (derivedSlug && derivedSlug !== activeSlug) {
      setActiveSlug(derivedSlug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedSlug]);

  // Keep the module-level header variable in sync.
  useEffect(() => {
    if (activeSlug) {
      setWorkspaceSlug(activeSlug);
    }
  }, [activeSlug]);

  const currentWorkspace = useMemo(
    () => allWorkspaces.find((w) => w.slug === activeSlug) ?? null,
    [allWorkspaces, activeSlug],
  );

  const switchTo = useCallback(
    (slug: string) => {
      writeCookieSlug(slug);
      setActiveSlug(slug);
      setWorkspaceSlug(slug);

      // If we're on a workspace-scoped path, replace just the slug segment.
      // Otherwise navigate to /forms (the default workspace-scoped landing).
      if (/^\/workspaces\/[^/]+/.test(pathname)) {
        router.replace(replaceSlugInPath(pathname, slug));
      } else {
        router.replace("/forms");
      }
    },
    [pathname, router],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      currentSlug: activeSlug,
      currentId: currentWorkspace?.id ?? null,
      allWorkspaces,
      isLoading,
      switchTo,
    }),
    [activeSlug, currentWorkspace, allWorkspaces, isLoading, switchTo],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * Public provider — wraps the inner component in a Suspense boundary so that
 * useSearchParams() doesn't suspend the entire layout tree on navigation.
 */
export function WorkspaceContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <WorkspaceContextProviderInner>{children}</WorkspaceContextProviderInner>
    </Suspense>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error(
      "useWorkspaceContext must be used inside <WorkspaceContextProvider>",
    );
  }
  return ctx;
}
