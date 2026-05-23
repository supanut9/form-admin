import { formClient } from '@/lib/form-client'

export interface Template {
  id: string
  slug: string
  title: string
  description: string
  category: string
  featuredOrder: number | null
  specJson: unknown
  createdAt: string
}

export interface ListTemplatesParams {
  category?: string
  includePublic?: boolean
}

export interface CloneTemplateParams {
  newSlug?: string
  newTitle?: string
}

export interface CloneTemplateResult {
  id: string
  slug: string
}

export function listTemplates(params: ListTemplatesParams = {}): Promise<Template[]> {
  const qs = new URLSearchParams()
  if (params.category) qs.set('category', params.category)
  if (params.includePublic !== undefined) qs.set('includePublic', String(params.includePublic))
  const query = qs.toString()
  return formClient.get<Template[]>(`/v1/admin/templates${query ? `?${query}` : ''}`)
}

export function getTemplate(idOrSlug: string): Promise<Template> {
  return formClient.get<Template>(`/v1/admin/templates/${idOrSlug}`)
}

export function cloneTemplate(
  idOrSlug: string,
  params: CloneTemplateParams = {},
): Promise<CloneTemplateResult> {
  return formClient.post<CloneTemplateResult>(`/v1/admin/templates/${idOrSlug}/clone`, {
    body: params,
  })
}
