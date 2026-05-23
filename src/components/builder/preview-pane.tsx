"use client"

import { Paper, Text, Box } from "@mantine/core"
import { Form } from "form-renderer"
import type { FormSpec, FormSubmissionPayload } from "form-renderer"
import { useBuilderStore } from "@/lib/store"
import { notifications } from "@mantine/notifications"

export function PreviewPane() {
  const formSpec = useBuilderStore((s) => s.formSpec)
  const pageCount = formSpec.pages.length
  const fieldCount = formSpec.pages.reduce((acc, p) => acc + p.fields.length, 0)

  if (fieldCount === 0) {
    return (
      <Paper withBorder p="md" h="100%">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="sm">
          Preview
        </Text>
        <Box
          p="lg"
          style={{
            border: "2px dashed var(--mantine-color-gray-3)",
            borderRadius: "var(--mantine-radius-md)",
            textAlign: "center",
          }}
        >
          <Text size="sm" c="dimmed">
            Drag fields onto the canvas to see a live preview here.
          </Text>
        </Box>
      </Paper>
    )
  }

  function handlePreviewSubmit(payload: FormSubmissionPayload): void {
    // Preview submit just toasts the payload — it never reaches form-api.
    notifications.show({
      title: "Preview submit",
      message: `Got ${Object.keys(payload).length} field(s). Not sent.`,
      color: "blue",
    })
  }

  return (
    <Paper
      withBorder
      p="md"
      h="100%"
      style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "auto" }}
    >
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        Preview · {pageCount} page{pageCount === 1 ? "" : "s"} · {fieldCount} field
        {fieldCount === 1 ? "" : "s"}
      </Text>
      <Box style={{ flex: 1 }}>
        <Form spec={formSpec as unknown as FormSpec} onSubmit={handlePreviewSubmit} />
      </Box>
    </Paper>
  )
}
