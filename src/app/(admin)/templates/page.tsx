'use client'

import { Stack, Title, Text } from '@mantine/core'
import { TemplateGallery } from '@/components/templates/template-gallery'

export default function TemplatesPage() {
  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Title order={2}>Templates</Title>
        <Text c="dimmed" size="sm">
          Pick a template to get started, or start from scratch.
        </Text>
      </Stack>
      <TemplateGallery />
    </Stack>
  )
}
