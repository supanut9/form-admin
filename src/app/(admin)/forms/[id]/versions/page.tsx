import { cookies } from 'next/headers'
import { Stack, Title, Table, Badge, Text } from '@mantine/core'
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

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VersionsPage({ params }: PageProps) {
  const { id: formId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? ''

  const res = await fetch(`${FORM_API_URL}/admin/forms/${formId}/versions`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (res.status === 404) notFound()

  const versions: VersionRow[] = res.ok ? ((await res.json()) as VersionRow[]) : []

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
                  {v.is_current ? (
                    <Badge size="xs" color="blue">
                      Current
                    </Badge>
                  ) : (
                    <Badge size="xs" color="gray" variant="light">
                      Archived
                    </Badge>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  )
}
