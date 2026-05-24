/**
 * workspaces.ts — typed client for workspace, billing, and member endpoints.
 *
 * All calls route through formClient (which uses the same-origin /api/proxy on
 * the browser side and hits form-api directly on the server side), so the
 * X-Workspace-Id header must be injected by callers that have the slug in scope.
 * Helper `withWorkspace(slug, options)` is exported for convenience.
 */
import { formClient } from '@/lib/form-client'

// ── Types ─────────────────────────────────────────────────────────────────────

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer'
export type PlanSlug = 'free' | 'starter' | 'pro' | 'business'

export interface Workspace {
  id: string
  slug: string
  name: string
  plan: PlanSlug
  stripeCustomerId?: string
  createdAt: string
}

export interface WorkspaceUsage {
  plan: PlanSlug
  usage: {
    forms: { current: number; limit: number }
    submissions: { current: number; limit: number; reset_at: string }
  }
}

export interface Plan {
  id: string
  slug: PlanSlug
  name: string
  description?: string
  stripePriceId?: string
  /** Monthly price in USD cents — may be absent if not returned by API */
  priceUsdCents?: number
  maxForms: number
  monthlySubmissionQuota: number
  paymentsEnabled: boolean
  experimentsEnabled: boolean
}

export interface WorkspaceMember {
  accountId: string
  email: string
  role: WorkspaceRole
  joinedAt: string
}

export interface WorkspaceInvitation {
  id: string
  email: string
  role: WorkspaceRole
  expiresAt: string
  inviteUrl?: string
  token?: string
}

export interface BillingEvent {
  id: string
  createdAt: string
  type: string
  stripeEventId?: string
  stripeDashboardUrl?: string
  meta?: Record<string, unknown>
}

export interface PaginatedBillingEvents {
  items: BillingEvent[]
  total: number
}

// ── Header helper ─────────────────────────────────────────────────────────────

/**
 * Returns a RequestInit headers fragment with X-Workspace-Id set.
 * Merge this into the `headers` field of any formClient call that needs it.
 */
export function wsHeaders(workspaceSlug: string): { headers: Record<string, string> } {
  return { headers: { 'X-Workspace-Id': workspaceSlug } }
}

// ── Workspace ─────────────────────────────────────────────────────────────────

export function getMyWorkspace(slug: string): Promise<Workspace> {
  return formClient.get<Workspace>('/v1/admin/workspaces/me', wsHeaders(slug))
}

export function getMyWorkspaceUsage(slug: string): Promise<WorkspaceUsage> {
  return formClient.get<WorkspaceUsage>('/v1/admin/workspaces/me/usage', wsHeaders(slug))
}

// ── Plans ─────────────────────────────────────────────────────────────────────

export function listPlans(): Promise<Plan[]> {
  return formClient.get<Plan[]>('/v1/admin/plans')
}

// ── Members ───────────────────────────────────────────────────────────────────

export function listMembers(slug: string): Promise<WorkspaceMember[]> {
  return formClient.get<WorkspaceMember[]>('/v1/admin/workspaces/me/members', wsHeaders(slug))
}

export function addMember(
  slug: string,
  payload: { email: string; role: WorkspaceRole },
): Promise<WorkspaceMember> {
  return formClient.post<WorkspaceMember>('/v1/admin/workspaces/me/members', {
    ...wsHeaders(slug),
    body: payload,
  })
}

export function removeMember(slug: string, accountId: string): Promise<void> {
  return formClient.del<void>(`/v1/admin/workspaces/me/members/${accountId}`, wsHeaders(slug))
}

export function changeMemberRole(
  slug: string,
  accountId: string,
  role: WorkspaceRole,
): Promise<WorkspaceMember> {
  return formClient.patch<WorkspaceMember>(
    `/v1/admin/workspaces/me/members/${accountId}`,
    { ...wsHeaders(slug), body: { role } },
  )
}

// ── Invitations ───────────────────────────────────────────────────────────────

export function listInvitations(slug: string): Promise<WorkspaceInvitation[]> {
  return formClient.get<WorkspaceInvitation[]>(
    '/v1/admin/workspaces/me/invitations',
    wsHeaders(slug),
  )
}

export function createInvitation(
  slug: string,
  payload: { email: string; role: WorkspaceRole },
): Promise<WorkspaceInvitation> {
  return formClient.post<WorkspaceInvitation>('/v1/admin/workspaces/me/invitations', {
    ...wsHeaders(slug),
    body: payload,
  })
}

export function revokeInvitation(slug: string, id: string): Promise<void> {
  return formClient.del<void>(`/v1/admin/workspaces/me/invitations/${id}`, wsHeaders(slug))
}

// ── Billing ───────────────────────────────────────────────────────────────────

export async function createCheckoutSession(
  slug: string,
  planSlug: PlanSlug,
): Promise<{ url: string }> {
  return formClient.post<{ url: string }>('/v1/admin/workspaces/me/billing/checkout', {
    ...wsHeaders(slug),
    body: {
      plan_slug: planSlug,
      success_url: `${window.location.origin}/workspaces/${slug}/plan?ok=1`,
      cancel_url: `${window.location.origin}/workspaces/${slug}/plan`,
    },
  })
}

export async function createPortalSession(
  slug: string,
): Promise<{ url: string }> {
  return formClient.post<{ url: string }>('/v1/admin/workspaces/me/billing/portal', {
    ...wsHeaders(slug),
    body: {
      return_url: `${window.location.origin}/workspaces/${slug}/billing`,
    },
  })
}

export function listBillingEvents(
  slug: string,
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedBillingEvents> {
  const qs = new URLSearchParams()
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))
  const query = qs.toString()
  return formClient.get<PaginatedBillingEvents>(
    `/v1/admin/workspaces/me/billing/events${query ? `?${query}` : ''}`,
    wsHeaders(slug),
  )
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const PLAN_DISPLAY: Record<
  PlanSlug,
  { label: string; color: string; description: string; priceLabel: string }
> = {
  free: {
    label: 'Free',
    color: 'gray',
    description: 'For individuals and small experiments.',
    priceLabel: '$0 / month',
  },
  starter: {
    label: 'Starter',
    color: 'blue',
    description: 'Growing teams that need more forms and submissions.',
    priceLabel: '$19 / month',
  },
  pro: {
    label: 'Pro',
    color: 'violet',
    description: 'Advanced logic, payments, and A/B testing.',
    priceLabel: '$49 / month',
  },
  business: {
    label: 'Business',
    color: 'orange',
    description: 'Unlimited scale with priority support.',
    priceLabel: 'Contact sales',
  },
}

const BILLING_EVENT_LABELS: Record<string, string> = {
  'customer.subscription.created': 'Subscription started',
  'customer.subscription.updated': 'Subscription updated',
  'customer.subscription.deleted': 'Subscription cancelled',
  'invoice.payment_succeeded': 'Payment succeeded',
  'invoice.payment_failed': 'Payment failed',
  'invoice.upcoming': 'Upcoming invoice',
  'charge.refunded': 'Charge refunded',
  'checkout.session.completed': 'Checkout completed',
}

export function humanizeBillingEvent(type: string): string {
  return BILLING_EVENT_LABELS[type] ?? type.replace(/[._]/g, ' ')
}
