import { formClient } from '@/lib/form-client'

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'

export interface PaymentRow {
  id: string
  createdAt: string
  updatedAt: string
  submissionId: string
  stripePaymentIntentId: string
  amountMinor: number
  currency: string
  status: PaymentStatus
  capturedAt: string | null
  stripeEventId: string | null
  stripeAccountId: string | null
  submission: {
    submittedAt: string
    formId?: string
  }
}

export interface PaymentDetail extends PaymentRow {
  stripe_dashboard_url: string
}

export interface ListPaymentsParams {
  status?: PaymentStatus
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export interface ListPaymentsResponse {
  items: PaymentRow[]
  total: number
}

export function listPayments(
  formIdOrSlug: string,
  params: ListPaymentsParams = {},
): Promise<ListPaymentsResponse> {
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.from) qs.set('from', params.from)
  if (params.to) qs.set('to', params.to)
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))
  const query = qs.toString()
  return formClient.get<ListPaymentsResponse>(
    `/v1/admin/forms/${formIdOrSlug}/payments${query ? `?${query}` : ''}`,
  )
}

export function getPayment(id: string): Promise<PaymentDetail> {
  return formClient.get<PaymentDetail>(`/v1/admin/payments/${id}`)
}

// ── Display helpers ───────────────────────────────────────────────────────────

export function formatAmount(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amountMinor / 100)
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}
