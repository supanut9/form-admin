import { cookies } from 'next/headers'
import { Stack, Title, Table, Badge, Text, Group } from '@mantine/core'
import { notFound } from 'next/navigation'

const FORM_API_URL = process.env['NEXT_PUBLIC_FORM_API_URL'] ?? 'http://localhost:4200'
const SESSION_COOKIE = 'forms_session'

interface VersionRow {
  id: string
  version: number
  published_at: string | null
  published_by: string | null
  is_current: boolean
}

interface ExperimentVariant {
  id: string
  version_id: string
}

interface Experiment {
  id: string
  name: string
  status: 'draft' | 'running' | 'stopped'
  variants: ExperimentVariant[]
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VersionsPage({ params }: PageProps) {
  const { id: formId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? ''

  const authHeader = { Authorization: `Bearer ${token}` }

  const [versionsRes, experimentsRes] = await Promise.all([
    fetch(`${FORM_API_URL}/admin/forms/${formId}/versions`, {
      headers: authHeader,
      cache: 'no-store',
    }),
    fetch(`${FORM_API_URL}/v1/admin/forms/${formId}/experiments`, {
      headers: authHeader,
      cache: 'no-store',
    }),
  ])

  if (versionsRes.status === 404) notFound()

  const versions: VersionRow[] = versionsRes.ok ? ((await versionsRes.json()) as VersionRow[]) : []

  // Build a set of version IDs that are currently used in a running experiment
  let activeVersionIds = new Set<string>()
  if (experimentsRes.ok) {
    const experiments: Experiment[] = (await experimentsRes.json()) as Experiment[]
    for (const exp of experiments) {
      if (exp.status === 'running') {
        for (const variant of exp.variants) {
          activeVersionIds.add(variant.version_id)
        }
      }
    }
  }

  return (
    <Stack p="md">
      <Title order={2}>Versions</Title>

      {versions.length === 0 && (
        <Text c="dimmed">No versions published yet.</Text>
      )}

      {versions.length > 0 && (
        <Table withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Version</Table.Th>
              <Table.Th>Published at</Table.Th>
              <Table.Th>Published by</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {versions.map((v) => (
              <Table.Tr key={v.id}>
                <Table.Td>v{v.version}</Table.Td>
                <Table.Td>
                  {v.published_at ? new Date(v.published_at).toLocaleString() : '—'}
                </Table.Td>
                <Table.Td>{v.published_by ?? '—'}</Table.Td>
                <Table.Td>
                  <Group gap={6}>
                    {v.is_current ? (
                      <Badge size="xs" color="blue">
                        Current
                      </Badge>
                    ) : (
                      <Badge size="xs" color="gray" variant="light">
                        Archived
                      </Badge>
                    )}
                    {activeVersionIds.has(v.id) && (
                      <Badge size="xs" color="green" variant="outline">
                        In experiment
                      </Badge>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  )
}
