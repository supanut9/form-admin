'use client'

import {
  SimpleGrid,
  Card,
  Text,
  Badge,
  Button,
  Group,
  Stack,
  Pill,
  PillGroup,
  Modal,
  TextInput,
  Center,
  Anchor,
  Loader,
  Alert,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  IconChartBar,
  IconTargetArrow,
  IconMoodSmile,
  IconMessage,
  IconCalendarEvent,
  IconMail,
  IconUserPlus,
  IconClipboardList,
  IconTemplate,
  IconAlertCircle,
} from '@tabler/icons-react'
import { listTemplates, cloneTemplate, type Template } from '@/lib/templates'

// ---------------------------------------------------------------------------
// Category configuration
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  survey: IconChartBar,
  lead: IconTargetArrow,
  nps: IconMoodSmile,
  feedback: IconMessage,
  rsvp: IconCalendarEvent,
  contact: IconMail,
  signup: IconUserPlus,
  registration: IconClipboardList,
}

const CATEGORY_COLORS: Record<string, string> = {
  survey: 'indigo',
  lead: 'violet',
  nps: 'teal',
  feedback: 'cyan',
  rsvp: 'orange',
  contact: 'blue',
  signup: 'green',
  registration: 'grape',
}

function CategoryIcon({ category, size = 28 }: { category: string; size?: number }) {
  const Icon = CATEGORY_ICONS[category] ?? IconTemplate
  const color = `var(--mantine-color-${CATEGORY_COLORS[category] ?? 'gray'}-6)`
  return <Icon size={size} color={color} />
}

function categoryLabel(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1)
}

// ---------------------------------------------------------------------------
// Stub data used when L5a hasn't landed yet (safe fallback for typechecking)
// ---------------------------------------------------------------------------

export const MOCK_TEMPLATES: Template[] = [
  {
    id: 'tmpl_01',
    slug: 'nps-survey',
    title: 'NPS Survey',
    description: 'Measure customer loyalty with a standard Net Promoter Score survey.',
    category: 'nps',
    featuredOrder: 1,
    specJson: {},
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'tmpl_02',
    slug: 'contact-form',
    title: 'Contact Form',
    description: 'Simple contact form with name, email and message fields.',
    category: 'contact',
    featuredOrder: 2,
    specJson: {},
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'tmpl_03',
    slug: 'event-rsvp',
    title: 'Event RSVP',
    description: 'Collect RSVPs for your next event including dietary and plus-one fields.',
    category: 'rsvp',
    featuredOrder: 3,
    specJson: {},
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'tmpl_04',
    slug: 'lead-capture',
    title: 'Lead Capture',
    description: 'Capture leads with company, role and interest qualification fields.',
    category: 'lead',
    featuredOrder: null,
    specJson: {},
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'tmpl_05',
    slug: 'feedback-form',
    title: 'Product Feedback',
    description: 'Gather structured product feedback with ratings and open comments.',
    category: 'feedback',
    featuredOrder: null,
    specJson: {},
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'tmpl_06',
    slug: 'signup-form',
    title: 'Newsletter Signup',
    description: 'Grow your mailing list with a clean, minimal signup form.',
    category: 'signup',
    featuredOrder: null,
    specJson: {},
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'tmpl_07',
    slug: 'general-survey',
    title: 'General Survey',
    description: 'Multi-page survey template with a mix of question types.',
    category: 'survey',
    featuredOrder: null,
    specJson: {},
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'tmpl_08',
    slug: 'registration-form',
    title: 'Event Registration',
    description: 'Full registration form for conferences and workshops.',
    category: 'registration',
    featuredOrder: null,
    specJson: {},
    createdAt: '2026-05-01T00:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// Clone modal
// ---------------------------------------------------------------------------

interface CloneModalProps {
  template: Template
  onClose: () => void
}

function CloneModal({ template, onClose }: CloneModalProps) {
  const router = useRouter()

  const form = useForm({
    initialValues: {
      newTitle: template.title,
      newSlug: template.slug,
    },
    validate: {
      newTitle: (v) => (v.trim().length === 0 ? 'Title is required' : null),
      newSlug: (v) =>
        /^[a-z0-9-]+$/.test(v.trim())
          ? null
          : 'Slug must be lowercase letters, numbers and hyphens',
    },
  })

  const cloneMutation = useMutation({
    mutationFn: (values: { newTitle: string; newSlug: string }) =>
      cloneTemplate(template.id, { newSlug: values.newSlug, newTitle: values.newTitle }),
    onSuccess: (result) => {
      onClose()
      notifications.show({
        title: 'Template applied',
        message: 'Opening the new form in the builder…',
        color: 'green',
      })
      router.push(`/forms/${result.id}/builder`)
    },
    onError: (err) =>
      notifications.show({
        title: 'Failed to create from template',
        message: err instanceof Error ? err.message : 'Unknown error',
        color: 'red',
      }),
  })

  return (
    <form onSubmit={form.onSubmit((v) => cloneMutation.mutate(v))}>
      <Stack gap="sm">
        <TextInput
          label="Form title"
          placeholder={template.title}
          required
          {...form.getInputProps('newTitle')}
        />
        <TextInput
          label="Slug"
          placeholder={template.slug}
          required
          description="URL-safe identifier. Lowercase, hyphens only."
          {...form.getInputProps('newSlug')}
        />
        <Group justify="flex-end" mt="xs">
          <Button variant="light" onClick={onClose} disabled={cloneMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={cloneMutation.isPending}>
            Create form
          </Button>
        </Group>
      </Stack>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Main gallery component
// ---------------------------------------------------------------------------

export interface TemplateGalleryProps {
  compact?: boolean
  /** Callback called when the user clicks "Start blank" (used in 2-step modal) */
  onStartBlank?: () => void
}

const ALL_CATEGORIES = Object.keys(CATEGORY_ICONS)

export function TemplateGallery({ compact = false, onStartBlank }: TemplateGalleryProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [cloneTarget, setCloneTarget] = useState<Template | null>(null)
  const [cloneModalOpen, { open: openClone, close: closeClone }] = useDisclosure(false)

  const { data: templates, isLoading, isError } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: () => listTemplates({ includePublic: true }),
    // Fall back to mock data if API is unavailable (L5a not yet deployed)
    placeholderData: MOCK_TEMPLATES,
  })

  const displayed = useMemo(() => {
    let list = templates ?? []
    if (selectedCategories.length > 0) {
      list = list.filter((t) => selectedCategories.includes(t.category))
    }
    if (featuredOnly) {
      list = [...list].sort((a, b) => {
        const aOrder = a.featuredOrder ?? Number.MAX_SAFE_INTEGER
        const bOrder = b.featuredOrder ?? Number.MAX_SAFE_INTEGER
        return aOrder - bOrder
      })
    }
    return list
  }, [templates, selectedCategories, featuredOnly])

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    )
  }

  function handleUseTemplate(template: Template) {
    setCloneTarget(template)
    openClone()
  }

  function handleCloneClose() {
    closeClone()
    setCloneTarget(null)
  }

  const cardPadding = compact ? 'sm' : 'md'
  const gridCols = compact
    ? { base: 1, sm: 2 }
    : { base: 1, sm: 2, lg: 3 }

  return (
    <>
      {/* Filter row */}
      <Stack gap={compact ? 'xs' : 'sm'}>
        <Group gap="xs" wrap="wrap">
          <Pill
            style={{ cursor: 'pointer' }}
            bg={featuredOnly ? 'indigo' : undefined}
            c={featuredOnly ? 'white' : undefined}
            onClick={() => setFeaturedOnly((v) => !v)}
          >
            Featured
          </Pill>
          <PillGroup>
            {ALL_CATEGORIES.map((cat) => {
              const active = selectedCategories.includes(cat)
              return (
                <Pill
                  key={cat}
                  style={{ cursor: 'pointer' }}
                  bg={active ? 'indigo' : undefined}
                  c={active ? 'white' : undefined}
                  onClick={() => toggleCategory(cat)}
                >
                  {categoryLabel(cat)}
                </Pill>
              )
            })}
          </PillGroup>
        </Group>

        {/* States */}
        {isLoading && (
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        )}

        {isError && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Could not load templates">
            Failed to fetch templates. Please try again later.
          </Alert>
        )}

        {!isLoading && !isError && displayed.length === 0 && (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconTemplate size={40} color="var(--mantine-color-gray-5)" />
              <Text c="dimmed">No templates match your filters.</Text>
              {onStartBlank && (
                <Anchor component="button" onClick={onStartBlank}>
                  Start from a blank form instead
                </Anchor>
              )}
              {!onStartBlank && (
                <Anchor component={Link} href="/forms">
                  Start from a blank form instead
                </Anchor>
              )}
            </Stack>
          </Center>
        )}

        {!isLoading && displayed.length > 0 && (
          <SimpleGrid cols={gridCols} spacing={compact ? 'sm' : 'md'}>
            {displayed.map((template) => (
              <Card
                key={template.id}
                withBorder
                padding={cardPadding}
                radius="md"
                style={{ display: 'flex', flexDirection: 'column' }}
              >
                <Group gap="sm" mb="xs" wrap="nowrap">
                  <CategoryIcon category={template.category} size={compact ? 22 : 28} />
                  <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600} size={compact ? 'sm' : 'md'} lineClamp={1}>
                      {template.title}
                    </Text>
                    <Badge
                      size="xs"
                      variant="light"
                      color={CATEGORY_COLORS[template.category] ?? 'gray'}
                    >
                      {categoryLabel(template.category)}
                    </Badge>
                  </Stack>
                </Group>

                <Text
                  size="sm"
                  c="dimmed"
                  lineClamp={compact ? 2 : 3}
                  style={{ flex: 1 }}
                  mb="md"
                >
                  {template.description}
                </Text>

                <Button
                  size={compact ? 'xs' : 'sm'}
                  variant="light"
                  fullWidth
                  onClick={() => handleUseTemplate(template)}
                >
                  Use this template
                </Button>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>

      {/* Clone modal */}
      <Modal
        opened={cloneModalOpen}
        onClose={handleCloneClose}
        title={cloneTarget ? `Start from "${cloneTarget.title}"` : 'Start from template'}
        size="sm"
      >
        {cloneTarget && <CloneModal template={cloneTarget} onClose={handleCloneClose} />}
      </Modal>
    </>
  )
}
