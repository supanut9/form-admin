import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { FormDetailTabs } from "@/components/forms/form-detail-tabs";

const FORM_API_URL =
  process.env["NEXT_PUBLIC_FORM_API_URL"] ?? "http://localhost:4200";
const SESSION_COOKIE = "forms_session";

interface FormSummary {
  id: string;
  slug: string | null;
  title: string;
  current_version: number | null;
  archived_at: string | null;
}

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function FormDetailLayout({
  children,
  params,
}: LayoutProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  const res = await fetch(`${FORM_API_URL}/admin/forms/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });

  if (res.status === 404) notFound();
  if (!res.ok) {
    // Surface other errors with a tab-only header so the inner page can render
    // its own message; treating this as a soft failure is better than throwing.
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <FormDetailTabs formId={id} title={null} />
        <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
      </div>
    );
  }

  const form = (await res.json()) as FormSummary;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <FormDetailTabs
        formId={id}
        title={form.title}
        slug={form.slug}
        archived={!!form.archived_at}
      />
      <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
    </div>
  );
}
