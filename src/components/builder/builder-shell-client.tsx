"use client";

import dynamic from "next/dynamic";
import type { FormSpec } from "@/lib/form-spec.types";

// dnd-kit increments a global counter per useDraggable() call, which produces
// different aria-describedby IDs on the server vs client and triggers a
// hydration mismatch. Mount the builder shell client-only to avoid it.
const BuilderShell = dynamic(
  () => import("./builder-shell").then((m) => m.BuilderShell),
  {
    ssr: false,
    loading: () => null,
  },
);

export function BuilderShellClient(props: { formId: string; initialSpec: FormSpec }) {
  return <BuilderShell {...props} />;
}
