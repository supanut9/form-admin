"use client";

import { use } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  Stack,
  Title,
  Text,
  Group,
  Badge,
  Progress,
  Alert,
  Skeleton,
  SimpleGrid,
  Card,
  Button,
  Divider,
  Anchor,
  ThemeIcon,
  List,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconInfoCircle,
  IconCheck,
  IconCircleCheck,
  IconSparkles,
  IconBuildingStore,
  IconRocket,
  IconStar,
  IconExternalLink,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import {
  getMyWorkspaceUsage,
  listPlans,
  createCheckoutSession,
  PLAN_DISPLAY,
  type PlanSlug,
  type Plan,
} from "@/lib/workspaces";

// ── Plan card icons ───────────────────────────────────────────────────────────

const PLAN_ICONS: Record<PlanSlug, React.ReactNode> = {
  free: <IconStar size={22} />,
  starter: <IconRocket size={22} />,
  pro: <IconSparkles size={22} />,
  business: <IconBuildingStore size={22} />,
};

// ── Usage bar ─────────────────────────────────────────────────────────────────

function UsageBar({
  label,
  current,
  limit,
  color,
}: {
  label: string;
  current: number;
  limit: number;
  color?: string;
}) {
  const unlimited = limit <= 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((current / limit) * 100));
  const overLimit = !unlimited && current >= limit;

  return (
    <Stack gap={4}>
      <Group justify="space-between">
        <Text size="sm" fw={500}>
          {label}
        </Text>
        <Text size="sm" c={overLimit ? "red" : "dimmed"}>
          {unlimited ? `${current} / unlimited` : `${current} / ${limit}`}
        </Text>
      </Group>
      <Progress
        value={unlimited ? 0 : pct}
        color={overLimit ? "red" : color ?? "blue"}
        size="sm"
        radius="xl"
      />
    </Stack>
  );
}

// ── Plan picker card ──────────────────────────────────────────────────────────

function PlanCard({
  plan,
  isActive,
  onSwitch,
  switching,
}: {
  plan: Plan;
  isActive: boolean;
  onSwitch: () => void;
  switching: boolean;
}) {
  const slug = plan.slug as PlanSlug;
  const meta = PLAN_DISPLAY[slug] ?? PLAN_DISPLAY.free;
  const isContactSales = slug === "business";

  return (
    <Card
      withBorder
      radius="md"
      padding="lg"
      style={{
        border: isActive
          ? `2px solid var(--mantine-color-${meta.color}-6)`
          : undefined,
        position: "relative",
      }}
    >
      {isActive && (
        <Badge
          color={meta.color}
          variant="filled"
          size="xs"
          style={{ position: "absolute", top: 10, right: 10 }}
          leftSection={<IconCheck size={10} />}
        >
          Current
        </Badge>
      )}

      <Stack gap="sm">
        <Group gap="xs">
          <ThemeIcon color={meta.color} variant="light" size="md" radius="sm">
            {PLAN_ICONS[slug]}
          </ThemeIcon>
          <Text fw={700} size="md">
            {meta.label}
          </Text>
        </Group>

        <Text size="xl" fw={800} c={meta.color}>
          {meta.priceLabel}
        </Text>

        <Text size="sm" c="dimmed" style={{ minHeight: 40 }}>
          {meta.description}
        </Text>

        <Divider />

        <List size="xs" spacing="xs" icon={<IconCircleCheck size={14} color="var(--mantine-color-green-6)" />}>
          <List.Item>
            {plan.maxForms > 0 ? `${plan.maxForms} forms` : "Unlimited forms"}
          </List.Item>
          <List.Item>
            {plan.monthlySubmissionQuota > 0
              ? `${plan.monthlySubmissionQuota.toLocaleString()} submissions / month`
              : "Unlimited submissions"}
          </List.Item>
          {plan.paymentsEnabled && <List.Item>Payment fields</List.Item>}
          {plan.experimentsEnabled && <List.Item>A/B testing</List.Item>}
        </List>

        {!isActive && (
          <>
            {isContactSales ? (
              <Anchor
                href="mailto:sales@example.com?subject=Business+plan+inquiry"
                target="_blank"
                size="sm"
                mt="xs"
              >
                <Group gap={4}>
                  Contact sales
                  <IconExternalLink size={12} />
                </Group>
              </Anchor>
            ) : (
              <Button
                variant="light"
                color={meta.color}
                size="sm"
                mt="xs"
                loading={switching}
                onClick={onSwitch}
                fullWidth
              >
                Switch to {meta.label}
              </Button>
            )}
          </>
        )}
      </Stack>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function PlanPage({ params }: PageProps) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const justUpgraded = searchParams.get("ok") === "1";

  const {
    data: usage,
    isLoading: usageLoading,
    error: usageError,
  } = useQuery({
    queryKey: ["workspace-usage", slug],
    queryFn: () => getMyWorkspaceUsage(slug),
    staleTime: 30_000,
  });

  const {
    data: plans,
    isLoading: plansLoading,
    error: plansError,
  } = useQuery({
    queryKey: ["plans"],
    queryFn: () => listPlans(),
    staleTime: 5 * 60_000,
  });

  const checkoutM = useMutation({
    mutationFn: (planSlug: PlanSlug) => createCheckoutSession(slug, planSlug),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: () => {
      notifications.show({
        title: "Checkout failed",
        message: "Could not start the checkout session. Please try again.",
        color: "red",
      });
    },
  });

  const currentPlan: PlanSlug = usage?.plan ?? "free";
  const currentMeta = PLAN_DISPLAY[currentPlan];

  // Ordered plan slugs for display
  const planOrder: PlanSlug[] = ["free", "starter", "pro", "business"];

  // Sort fetched plans by our canonical order; fall back to synthetic plan cards
  const orderedPlans: Plan[] = planOrder.map((s) => {
    const found = plans?.find((p) => p.slug === s);
    if (found) return found;
    // Synthetic fallback so cards render even before L19 plans endpoint is live
    return {
      id: s,
      slug: s,
      name: PLAN_DISPLAY[s].label,
      maxForms: s === "free" ? 3 : s === "starter" ? 25 : s === "pro" ? 100 : 0,
      monthlySubmissionQuota:
        s === "free" ? 500 : s === "starter" ? 5000 : s === "pro" ? 50000 : 0,
      paymentsEnabled: s === "pro" || s === "business",
      experimentsEnabled: s === "pro" || s === "business",
    } satisfies Plan;
  });

  return (
    <Stack gap="lg">
      {/* Success notification after Stripe redirect */}
      {justUpgraded && (
        <Alert
          icon={<IconCircleCheck size={16} />}
          color="green"
          title="Plan updated"
          withCloseButton
        >
          Your plan has been updated successfully.
        </Alert>
      )}

      {/* Usage section */}
      <Stack gap="md">
        <Group gap="sm" align="center">
          <Title order={2}>Usage</Title>
          <Badge color={currentMeta.color} variant="light">
            {currentMeta.label} plan
          </Badge>
        </Group>

        {usageError && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Could not load usage">
            The usage API may not be available yet.
          </Alert>
        )}

        {usageLoading ? (
          <Stack gap="sm">
            <Skeleton height={40} radius="sm" />
            <Skeleton height={40} radius="sm" />
            <Skeleton height={24} radius="sm" w={200} />
          </Stack>
        ) : usage ? (
          <Stack gap="md">
            <UsageBar
              label="Forms"
              current={usage.usage.forms.current}
              limit={usage.usage.forms.limit}
              color="blue"
            />
            <UsageBar
              label="Submissions this month"
              current={usage.usage.submissions.current}
              limit={usage.usage.submissions.limit}
              color="violet"
            />
            <Text size="xs" c="dimmed">
              Submission count resets on{" "}
              {new Date(usage.usage.submissions.reset_at).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </Stack>
        ) : null}
      </Stack>

      <Divider />

      {/* Plan picker */}
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={3}>Choose a plan</Title>
          <Anchor href={`/workspaces/${slug}/billing`} size="sm">
            View change history
          </Anchor>
        </Group>

        {plansError && (
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="orange"
            title="Using cached plan info"
          >
            Could not fetch live plan data. Showing defaults.
          </Alert>
        )}

        {plansLoading ? (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={260} radius="md" />
            ))}
          </SimpleGrid>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
            {orderedPlans.map((plan) => (
              <PlanCard
                key={plan.slug}
                plan={plan}
                isActive={plan.slug === currentPlan}
                switching={checkoutM.isPending && checkoutM.variables === plan.slug}
                onSwitch={() => checkoutM.mutate(plan.slug as PlanSlug)}
              />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Stack>
  );
}
