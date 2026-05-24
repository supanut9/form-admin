import { formClient } from '@/lib/form-client'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExperimentStatus = 'draft' | 'running' | 'stopped'
export type PrimaryMetric = 'submit_rate' | 'completion_rate' | 'payment_conversion'

export interface ExperimentVariant {
  id: string
  label: string
  version_id: string
  weight_bps: number
  exposures?: number
  submissions?: number
}

export interface Experiment {
  id: string
  formId: string
  name: string
  hypothesis: string | null
  status: ExperimentStatus
  primaryMetric: PrimaryMetric
  startedAt: string | null
  stoppedAt: string | null
  winnerVariantId: string | null
  variants: ExperimentVariant[]
}

export interface CreateExperimentBody {
  name: string
  hypothesis?: string
  primary_metric: PrimaryMetric
  variants: Array<{
    label: string
    version_id: string
    weight_bps: number
  }>
}

export interface PatchExperimentBody {
  name?: string
  hypothesis?: string
  variants?: Array<{
    id: string
    weight_bps: number
  }>
}

// ── Client functions ──────────────────────────────────────────────────────────

export function listExperiments(formIdOrSlug: string): Promise<Experiment[]> {
  return formClient.get<Experiment[]>(`/v1/admin/forms/${formIdOrSlug}/experiments`)
}

export function getExperiment(id: string): Promise<Experiment> {
  return formClient.get<Experiment>(`/v1/admin/experiments/${id}`)
}

export function createExperiment(
  formIdOrSlug: string,
  body: CreateExperimentBody,
): Promise<Experiment> {
  return formClient.post<Experiment>(`/v1/admin/forms/${formIdOrSlug}/experiments`, { body })
}

export function startExperiment(id: string): Promise<Experiment> {
  return formClient.post<Experiment>(`/v1/admin/experiments/${id}/start`)
}

export function stopExperiment(id: string): Promise<Experiment> {
  return formClient.post<Experiment>(`/v1/admin/experiments/${id}/stop`)
}

export function stopWithWinner(id: string, variantId: string): Promise<Experiment> {
  return formClient.post<Experiment>(`/v1/admin/experiments/${id}/stop-with-winner`, {
    body: { variant_id: variantId },
  })
}

export function patchExperiment(id: string, patch: PatchExperimentBody): Promise<Experiment> {
  return formClient.patch<Experiment>(`/v1/admin/experiments/${id}`, { body: patch })
}

// ── Conversion-rate helper (Wilson-score interval) ────────────────────────────
// Returns null when exposures === 0 (no data).
// Wilson score: https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval#Wilson_score_interval

export interface ConversionResult {
  rate: number
  ci95: [number, number]
}

export function computeConversion(
  exposures: number,
  submissions: number,
): ConversionResult | null {
  if (exposures === 0) return null
  const n = exposures
  const p = submissions / n
  const z = 1.96 // 95 % confidence
  const denom = 1 + (z * z) / n
  const centre = (p + (z * z) / (2 * n)) / denom
  const margin = ((z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom)
  return {
    rate: p,
    ci95: [Math.max(0, centre - margin), Math.min(1, centre + margin)],
  }
}
