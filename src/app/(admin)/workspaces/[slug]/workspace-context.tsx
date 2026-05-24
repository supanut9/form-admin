"use client";

/**
 * WorkspaceContext — thin provider that makes the current workspace slug
 * available to all client components under /workspaces/[slug]/.
 *
 * Lane L21 will likely replace this with a richer global workspace switcher.
 * Until then, this reads the slug from the URL params passed by the layout.
 */
import { createContext, useContext } from "react";

interface WorkspaceContextValue {
  slug: string;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceContext.Provider value={{ slug }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspaceContext must be used inside WorkspaceProvider");
  }
  return ctx;
}
