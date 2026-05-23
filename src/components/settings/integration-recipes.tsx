"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  Code,
  CopyButton,
  Group,
  Select,
  Stack,
  Tabs,
  Text,
  Title,
  Anchor,
  Badge,
  Alert,
  Skeleton,
} from "@mantine/core";
import {
  IconClipboardCopy,
  IconArrowRight,
  IconWebhook,
  IconLink,
  IconReportSearch,
  IconCode,
  IconAlertCircle,
} from "@tabler/icons-react";
import { formClient } from "@/lib/form-client";

interface FormSummary {
  id: string;
  slug: string | null;
  title: string;
  current_version: number | null;
  archived_at: string | null;
}

interface EventRow {
  id: string;
  event_key: string;
  form_id: string;
  optional: boolean;
  description: string;
}

const FORM_API_URL =
  (typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_FORM_API_URL
    : process.env.NEXT_PUBLIC_FORM_API_URL) ?? "http://localhost:4200";
const FORM_WEB_URL =
  (typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_FORM_WEB_URL
    : process.env.NEXT_PUBLIC_FORM_WEB_URL) ?? "http://localhost:4202";

function Snippet({ code, lang }: { code: string; lang: string }) {
  return (
    <Stack gap={4}>
      <Group justify="space-between">
        <Badge size="xs" variant="light" color="gray">
          {lang}
        </Badge>
        <CopyButton value={code}>
          {({ copied, copy }) => (
            <Anchor
              component="button"
              size="xs"
              onClick={copy}
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <IconClipboardCopy size={12} />
              {copied ? "Copied" : "Copy"}
            </Anchor>
          )}
        </CopyButton>
      </Group>
      <Code block style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>
        {code}
      </Code>
    </Stack>
  );
}

export function IntegrationRecipes() {
  const formsQ = useQuery({
    queryKey: ["forms-for-integration"],
    queryFn: () => formClient.get<FormSummary[]>("/admin/forms"),
  });
  const eventsQ = useQuery({
    queryKey: ["events-for-integration"],
    queryFn: () => formClient.get<EventRow[]>("/admin/events"),
  });

  const [formId, setFormId] = useState<string | null>(null);
  const [eventKey, setEventKey] = useState<string | null>(null);

  const forms = formsQ.data ?? [];
  const events = eventsQ.data ?? [];

  // Default selection
  if (formId === null && forms.length > 0) setFormId(forms[0]!.id);
  if (eventKey === null && events.length > 0) setEventKey(events[0]!.event_key);

  const selectedForm = forms.find((f) => f.id === formId) ?? null;
  const selectedEvent = events.find((e) => e.event_key === eventKey) ?? null;
  const slug = selectedForm?.slug ?? "<form-slug>";
  const evKey = selectedEvent?.event_key ?? "<event_key>";

  const formWebUrlFor = (path: string) => `${FORM_WEB_URL}${path}`;
  const apiUrlFor = (path: string) => `${FORM_API_URL}${path}`;

  // ── Snippets ──────────────────────────────────────────────────────────────

  const redirectSnippet = useMemo(
    () =>
      `// Redirect users to your form, then return them when done.
const returnUrl = 'https://your-app.example.com/done'
const url =
  '${formWebUrlFor(`/e/${evKey}`)}' +
  '?return_url=' + encodeURIComponent(returnUrl)
window.location.assign(url)`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [evKey],
  );

  const statusCurlSnippet = useMemo(
    () =>
      `# Check whether <accountId> has filled "${evKey}".
# Use an API token with scope events.read (Settings → API Tokens).
curl -sS \\
  -H "Authorization: Bearer $FORM_API_TOKEN" \\
  '${apiUrlFor(`/internal/events/${evKey}/status?account_id=<accountId>`)}'

# Response:
# {
#   "event_key": "${evKey}",
#   "optional": false,
#   "form_url": "${formWebUrlFor(`/f/${slug}?event_key=${evKey}`)}",
#   "filled": true | false,
#   "filled_at": "2026-05-17T...",
#   "submission_id": "..."
# }`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [evKey, slug],
  );

  const statusTsSnippet = useMemo(
    () =>
      `// Server-side: ask form-api whether a user filled the event.
// Use a service token issued under Settings → API Tokens (scope: events.read).
const FORM_API_TOKEN = process.env.FORM_API_TOKEN!

async function isEventFilled(eventKey: string, accountId: string): Promise<boolean> {
  const url = new URL(
    \`${apiUrlFor("/internal/events/")}\${eventKey}/status\`,
  )
  url.searchParams.set('account_id', accountId)
  const res = await fetch(url, {
    headers: { Authorization: \`Bearer \${FORM_API_TOKEN}\` },
  })
  if (!res.ok) throw new Error(\`form-api \${res.status}\`)
  const json = (await res.json()) as { filled: boolean }
  return json.filled
}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const statusGoSnippet = useMemo(
    () =>
      `// Server-side: ask form-api whether a user filled the event.
// Use a service token issued under Settings → API Tokens (scope: events.read).
package forms

import (
\t"encoding/json"
\t"fmt"
\t"net/http"
\t"os"
)

type EventStatus struct {
\tFilled       bool   \`json:"filled"\`
\tSubmissionID string \`json:"submission_id"\`
}

func IsFilled(eventKey, accountID string) (bool, error) {
\turl := fmt.Sprintf(
\t\t"${apiUrlFor("/internal/events/")}%s/status?account_id=%s",
\t\teventKey, accountID,
\t)
\treq, _ := http.NewRequest("GET", url, nil)
\treq.Header.Set("Authorization", "Bearer "+os.Getenv("FORM_API_TOKEN"))
\tres, err := http.DefaultClient.Do(req)
\tif err != nil { return false, err }
\tdefer res.Body.Close()
\tvar out EventStatus
\tif err := json.NewDecoder(res.Body).Decode(&out); err != nil { return false, err }
\treturn out.Filled, nil
}`,
    [],
  );

  const sdkSnippet = useMemo(
    () =>
      `// Install: pnpm add @supanut9/form-sdk
import { FormEmbed, checkEventStatus } from '@supanut9/form-sdk'

export function ProfileForm({ accountToken }: { accountToken: string }) {
  return (
    <FormEmbed
      formId="${slug}"
      eventKey="${evKey}"
      mode="iframe"
      authToken={accountToken}
      formApiUrl="${FORM_API_URL}"
      formWebUrl="${FORM_WEB_URL}"
      theme={{ primaryColor: '#4f46e5' }}
      onSubmit={(payload) => console.log('submitted', payload)}
      onResize={(h) => console.log('iframe height', h)}
    />
  )
}

// Server-side gate:
//   const status = await checkEventStatus({
//     eventKey: '${evKey}',
//     formApiUrl: '${FORM_API_URL}',
//     authToken: process.env.FORM_API_TOKEN!,
//   })
//   if (status.filled) redirect('/dashboard')`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [evKey, slug],
  );

  const webhookPayloadSnippet = `{
  "event": "submitted",
  "form_id": "${selectedForm?.id ?? "<form_id>"}",
  "form_slug": "${slug}",
  "version": ${selectedForm?.current_version ?? 1},
  "submission_id": "<uuid>",
  "event_key": "${evKey}",
  "account_id": null,
  "anonymous_token": "<uuid>",
  "submitted_at": "2026-05-17T07:36:09.748Z",
  "payload": { /* sanitized field values */ },
  "delivery_id": "<uuid>"
}`;

  const webhookVerifyTsSnippet = `// Verify the X-Form-Signature HMAC and replay-resist with the timestamp.
import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyWebhook(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300,
): boolean {
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const eq = p.indexOf('=')
      return [p.slice(0, eq).trim(), p.slice(eq + 1).trim()] as [string, string]
    }),
  )
  const t = Number(parts.t)
  if (!t) return false
  if (Math.abs(Math.floor(Date.now() / 1000) - t) > toleranceSeconds) return false
  // The signed string is \`\${t}.\${canonicalJson(payload)}\`. form-api sends the
  // request body AS the canonical JSON, so for verification we can just sign
  // the raw bytes directly.
  const expected = createHmac('sha256', secret)
    .update(\`\${t}.\${rawBody}\`)
    .digest('hex')
  const got = parts.v1 ?? ''
  if (expected.length !== got.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(got))
}`;

  const webhookVerifyGoSnippet = `// Verify the X-Form-Signature HMAC and replay-resist with the timestamp.
func verifyWebhook(rawBody []byte, sigHeader, secret string, toleranceSec int64) bool {
\tparts := map[string]string{}
\tfor _, p := range strings.Split(sigHeader, ",") {
\t\teq := strings.Index(p, "=")
\t\tif eq <= 0 { continue }
\t\tparts[strings.TrimSpace(p[:eq])] = strings.TrimSpace(p[eq+1:])
\t}
\tt, _ := strconv.ParseInt(parts["t"], 10, 64)
\tif t == 0 { return false }
\tif diff := time.Now().Unix() - t; diff > toleranceSec || diff < -toleranceSec {
\t\treturn false
\t}
\tmac := hmac.New(sha256.New, []byte(secret))
\tfmt.Fprintf(mac, "%d.%s", t, rawBody)
\texpected := hex.EncodeToString(mac.Sum(nil))
\treturn hmac.Equal([]byte(expected), []byte(parts["v1"]))
}`;

  // ── Render ────────────────────────────────────────────────────────────────

  if (formsQ.isLoading || eventsQ.isLoading) {
    return (
      <Stack gap={8}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={80} radius="sm" />
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Card withBorder padding="sm">
        <Stack gap="sm">
          <Group gap="md" wrap="wrap" align="end">
            <Select
              label="Form"
              placeholder="Pick a form"
              data={forms.map((f) => ({
                value: f.id,
                label: f.slug ? `${f.title} (/${f.slug})` : f.title,
              }))}
              value={formId}
              onChange={setFormId}
              w={280}
              searchable
            />
            <Select
              label="Event key"
              placeholder="Pick an event"
              data={events.map((e) => ({ value: e.event_key, label: e.event_key }))}
              value={eventKey}
              onChange={setEventKey}
              w={280}
              searchable
              clearable
            />
            {selectedEvent && (
              <Badge variant="light" size="md" color={selectedEvent.optional ? "gray" : "indigo"}>
                {selectedEvent.optional ? "optional" : "required"}
              </Badge>
            )}
          </Group>
          {forms.length === 0 && (
            <Alert color="yellow" icon={<IconAlertCircle size={14} />}>
              No forms yet — create one under <Anchor href="/forms">Forms</Anchor>.
            </Alert>
          )}
          {events.length === 0 && (
            <Alert color="yellow" icon={<IconAlertCircle size={14} />}>
              No events yet — create one under <Anchor href="/events">Events</Anchor> so other services can reference this form by a stable key.
            </Alert>
          )}
        </Stack>
      </Card>

      <Tabs defaultValue="redirect">
        <Tabs.List>
          <Tabs.Tab value="redirect" leftSection={<IconLink size={14} />}>
            Redirect flow
          </Tabs.Tab>
          <Tabs.Tab value="status" leftSection={<IconReportSearch size={14} />}>
            Status API
          </Tabs.Tab>
          <Tabs.Tab value="sdk" leftSection={<IconCode size={14} />}>
            Embedded SDK
          </Tabs.Tab>
          <Tabs.Tab value="webhooks" leftSection={<IconWebhook size={14} />}>
            Webhooks
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="redirect" pt="md">
          <Stack gap="md">
            <Text size="sm">
              Bounce users to the form, let them complete it, then redirect them
              back. form-web reads <Code>return_url</Code> and{" "}
              <Code>event_key</Code> from the query string and applies them on
              submit.
            </Text>
            <Snippet code={redirectSnippet} lang="ts" />
            <Group gap={6}>
              <Text size="xs" c="dimmed">
                Preview:
              </Text>
              <Anchor
                href={formWebUrlFor(`/e/${evKey}?return_url=${encodeURIComponent("https://your-app.example.com/done")}`)}
                target="_blank"
                size="xs"
              >
                {formWebUrlFor(`/e/${evKey}`)}
                <IconArrowRight size={10} style={{ marginLeft: 4 }} />
              </Anchor>
            </Group>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="status" pt="md">
          <Stack gap="md">
            <Text size="sm">
              Ask form-api whether a user completed the event. Uses a service
              token; mint one under{" "}
              <Anchor href="/settings/api-tokens">API Tokens</Anchor> with the{" "}
              <Code>events.read</Code> scope.
            </Text>
            <Snippet code={statusCurlSnippet} lang="curl" />
            <Snippet code={statusTsSnippet} lang="typescript" />
            <Snippet code={statusGoSnippet} lang="go" />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="sdk" pt="md">
          <Stack gap="md">
            <Text size="sm">
              Embed the form inside your own React app with the official SDK.
              The iframe mode is self-contained — no Mantine dependency on your
              side — and posts back submit / resize / error events.
            </Text>
            <Snippet code={sdkSnippet} lang="tsx" />
            <Text size="xs" c="dimmed">
              The SDK validates the iframe&apos;s origin against{" "}
              <Code>formWebUrl</Code>, so cross-origin embeds are safe by
              default.
            </Text>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="webhooks" pt="md">
          <Stack gap="md">
            <Text size="sm">
              Register a webhook under{" "}
              <Anchor href="/settings/webhooks">Webhooks</Anchor>. On each
              submission form-api signs the payload with HMAC-SHA256 and POSTs
              it to your URL.
            </Text>
            <Title order={6}>Payload shape</Title>
            <Snippet code={webhookPayloadSnippet} lang="json" />
            <Title order={6}>Verify the signature</Title>
            <Text size="sm" c="dimmed">
              Reject anything that doesn&apos;t match — and anything older than
              5 minutes to prevent replays.
            </Text>
            <Snippet code={webhookVerifyTsSnippet} lang="typescript" />
            <Snippet code={webhookVerifyGoSnippet} lang="go" />
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
