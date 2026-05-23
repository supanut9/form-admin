import { Card, Center, Stack, Text, Title } from "@mantine/core";

interface LoginPageProps {
  searchParams: Promise<{ return_to?: string }>;
}

/**
 * /auth/login
 *
 * Server component. Reads ?return_to from searchParams and passes it to the
 * /auth/login/start GET handler which initiates the OIDC PKCE flow.
 *
 * Uses a plain <a> tag for the Sign in button to avoid passing a function
 * (Link) across the Server→Client component boundary (React 19 restriction).
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { return_to } = await searchParams;

  const startHref = return_to
    ? `/auth/login/start?return_to=${encodeURIComponent(return_to)}`
    : "/auth/login/start";

  return (
    <Center h="100vh">
      <Card shadow="sm" padding="xl" radius="md" withBorder w={360}>
        <Stack align="center" gap="lg">
          <Title order={3}>Form Admin</Title>
          <Text c="dimmed" size="sm" ta="center">
            Sign in with your organisation account to continue.
          </Text>
          {/*
            Plain <a> avoids passing the Next.js Link function across the
            Server→Client boundary. prefetch is not needed — this is a
            full-page navigation to auth-server.
          */}
          <a
            href={startHref}
            style={{
              display: "block",
              width: "100%",
              padding: "0.5rem 1rem",
              background: "var(--mantine-color-indigo-6)",
              color: "#fff",
              borderRadius: "var(--mantine-radius-sm)",
              textAlign: "center",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            Sign in
          </a>
        </Stack>
      </Card>
    </Center>
  );
}
