// Re-declaration of form-spec TypeScript types from form-api/src/core/forms/form-spec.types.ts
// Kept in sync manually; no Zod schemas — admin posts raw JSON, form-api re-validates.

// ── JsonLogic ─────────────────────────────────────────────────────────────────
export type JsonLogicRule = unknown

// ── Access ────────────────────────────────────────────────────────────────────
export interface FormAccess {
  mode: 'public_anonymous' | 'private_oidc' | 'link_token'
  require_account: boolean
  anonymous_allowed: boolean
}

// ── Theme ─────────────────────────────────────────────────────────────────────
export interface FormTheme {
  primary_color: string
  logo_url?: string
  font?: string
  custom_css?: string
}

// ── Select option ─────────────────────────────────────────────────────────────
export interface SelectOption {
  value: string
  label: string
}

// ── Text validation ───────────────────────────────────────────────────────────
export interface TextValidation {
  min_length?: number
  max_length?: number
  pattern?: string
  pattern_message?: string
}

// ── Number validation ─────────────────────────────────────────────────────────
export interface NumberValidation {
  min?: number
  max?: number
  integer_only?: boolean
}

// ── File validation ───────────────────────────────────────────────────────────
export interface FileValidation {
  max_size_bytes?: number
  allowed_mime_types?: string[]
  max_files?: number
}

// ── Matrix column ─────────────────────────────────────────────────────────────
export interface MatrixColumn {
  value: string
  label: string
}

// ── Matrix row ────────────────────────────────────────────────────────────────
export interface MatrixRow {
  value: string
  label: string
}

// ── Base field (common to all variants) ──────────────────────────────────────
interface BaseField {
  id: string
  label: string
  required: boolean
  help_text?: string
  show_if?: JsonLogicRule | null
  /** When the form's prefill.mode === 'last_submission', `false` opts out. */
  prefill?: boolean
  /** Phase-2-lite auth mapping; auto-fills from the user's OIDC profile. */
  auth_field?: 'email' | 'name' | 'sub'
}

// ── Field discriminated union (12 variants) ───────────────────────────────────
export type FormField =
  | (BaseField & { type: 'text'; placeholder?: string; validation?: TextValidation })
  | (BaseField & { type: 'textarea'; placeholder?: string; rows?: number; validation?: TextValidation })
  | (BaseField & { type: 'number'; placeholder?: string; validation?: NumberValidation })
  | (BaseField & { type: 'email'; placeholder?: string })
  | (BaseField & { type: 'phone'; placeholder?: string; default_country_code?: string })
  | (BaseField & { type: 'select'; options: SelectOption[]; allow_other?: boolean })
  | (BaseField & { type: 'multiselect'; options: SelectOption[]; min_selections?: number; max_selections?: number })
  | (BaseField & { type: 'checkbox'; options?: SelectOption[] })
  | (BaseField & { type: 'radio'; options: SelectOption[]; allow_other?: boolean })
  | (BaseField & { type: 'date'; min_date?: string; max_date?: string; include_time?: boolean })
  | (BaseField & { type: 'file'; validation?: FileValidation })
  | (BaseField & {
      type: 'matrix'
      columns: MatrixColumn[]
      rows_from_field?: string
      rows?: MatrixRow[]
      required_all?: boolean
    })

export type FormFieldType = FormField['type']

// ── Page ──────────────────────────────────────────────────────────────────────
export interface FormPage {
  id: string
  title: string
  fields: FormField[]
  show_if?: JsonLogicRule | null
}

// ── Thank-you page ────────────────────────────────────────────────────────────
export interface FormThankYou {
  title: string
  body_md?: string
  redirect_url_template?: string
}

// ── Submit config ─────────────────────────────────────────────────────────────
export interface FormSubmitConfig {
  webhooks?: Array<{ url: string; secret_ref: string }>
  post_actions?: string[]
}

// ── Prefill config ────────────────────────────────────────────────────────────
export interface FormPrefillConfig {
  mode: 'none' | 'last_submission'
  identity: 'authenticated' | 'both'
  submit_behavior: 'append' | 'replace'
}

// ── FormSpec (root document) ──────────────────────────────────────────────────
export interface FormSpec {
  id: string
  version: number
  title: string
  type: 'main' | 'dynamic'
  access: FormAccess
  event_key?: string
  theme?: FormTheme
  pages: FormPage[]
  thank_you?: FormThankYou
  submit?: FormSubmitConfig
  prefill?: FormPrefillConfig
}
