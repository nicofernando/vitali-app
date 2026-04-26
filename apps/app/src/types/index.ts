// ============================================================
// vitali-app — Tipos de dominio S1
// ============================================================

export interface Currency {
  id: string
  code: string
  name: string
  symbol: string
  decimal_places: number
}

export type CurrencyInsert = Omit<Currency, 'id'>
export type CurrencyUpdate = Partial<CurrencyInsert>

export interface Project {
  id: string
  name: string
  description: string | null
  location: string | null
  currency_id: string
  currency?: Currency
  annual_interest_rate: number
  french_credit_enabled: boolean
  smart_credit_enabled: boolean
  created_at: string
}

export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'currency'>
export type ProjectUpdate = Partial<ProjectInsert>

export interface Tower {
  id: string
  project_id: string
  name: string
  description: string | null
  delivery_date: string | null
  max_financing_years: number
  min_pie_percentage: number
  created_at: string
}

export type TowerInsert = Omit<Tower, 'id' | 'created_at'>
export type TowerUpdate = Partial<TowerInsert>

export interface Typology {
  id: string
  name: string
  surface_m2: number
  description: string | null
  created_at: string
}

export type TypologyInsert = Omit<Typology, 'id' | 'created_at'>
export type TypologyUpdate = Partial<TypologyInsert>

export interface Unit {
  id: string
  tower_id: string
  typology_id: string
  typology?: Pick<Typology, 'id' | 'name' | 'surface_m2'>
  unit_number: string
  floor: number | null
  list_price: number
  created_at: string
}

export type UnitInsert = Omit<Unit, 'id' | 'created_at' | 'typology'>
export type UnitUpdate = Partial<UnitInsert>

export interface UnitWithContext extends Unit {
  tower: {
    id: string
    name: string
    min_pie_percentage: number | null
    max_financing_years: number | null
    delivery_date: string | null
    project: Pick<Project, 'id' | 'name'> & {
      currency: Pick<Currency, 'id' | 'code' | 'symbol' | 'decimal_places'>
    }
  }
}

export interface Role {
  id: string
  name: string
  description: string | null
  is_system: boolean
  created_at: string
}

export interface Permission {
  id: string
  module: string
  action: string
  description: string | null
}

export interface UserProfile {
  id: string
  user_id: string
  full_name: string | null
  phone: string | null
  created_at: string
}

export interface UserWithRoles {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  is_active: boolean
  roles: Role[]
}

// ============================================================
// S2 — Clientes
// ============================================================

export interface Client {
  id: string
  full_name: string
  rut: string | null
  address: string | null
  commune: string | null
  phone_country_code: string
  phone: string | null
  email: string | null
  created_by: string | null
  created_at: string
}

export type ClientInsert = Omit<Client, 'id' | 'created_by' | 'created_at'>
export type ClientUpdate = Partial<ClientInsert>

// ============================================================
// S2 — Cotizaciones
// ============================================================

export type QuoteStatus = 'draft' | 'sent' | 'expired'

export interface QuoteSummary {
  id: string
  status: QuoteStatus
  credit_type: 'french' | 'smart' | 'both'
  pie_percentage: number
  pie_amount: number
  financing_amount: number
  term_years: number
  monthly_payment: number | null
  balloon_payment: number | null
  smart_cuotas_percentage: number | null
  pdf_path: string | null
  created_at: string
  created_by: string | null
  client_id: string
  client_name: string
  client_rut: string | null
  unit_id: string
  unit_number: string
  floor: number | null
  list_price: number
  tower_id: string
  tower_name: string
  project_id: string
  project_name: string
  currency_symbol: string
}

export interface QuoteInsert {
  client_id: string
  unit_id: string
  pie_percentage: number
  pie_amount: number
  financing_amount: number
  credit_type: 'french' | 'smart' | 'both'
  term_years: number
  monthly_rate: number
  monthly_payment?: number | null
  balloon_payment?: number | null
  smart_cuotas_percentage?: number | null
  quote_data_snapshot: Record<string, unknown>
  status?: QuoteStatus
}

// ============================================================
// S2 — Edge Function: generate-pdf
// ============================================================

// ============================================================
// Motor de Documentos
// ============================================================

export type DocumentContext
  = | 'cliente'
    | 'proyecto'
    | 'torre'
    | 'unidad'
    | 'cotizacion'
    | 'credito_frances'
    | 'credito_inteligente'

export interface DocumentTemplate {
  id: string
  name: string
  description: string | null
  storage_path: string
  context_needs: DocumentContext[]
  is_active: boolean
  version: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type DocumentTemplateInsert = Pick<DocumentTemplate, 'name' | 'description' | 'storage_path' | 'context_needs' | 'is_active' | 'version'>
export type DocumentTemplateUpdate = Partial<Pick<DocumentTemplate, 'name' | 'description' | 'context_needs' | 'is_active'>>

export interface GenerateDocumentRequest {
  template_id: string
  context: {
    quote_id?: string
    unit_id?: string
    client_id?: string
  }
}

export interface GenerateDocumentResponse {
  url: string
  expires_at: string
}

// ============================================================
// S2 — Edge Function: generate-pdf
// ============================================================

export interface GeneratePdfRequest {
  quote_id: string
}

export interface GeneratePdfResponse {
  url: string
  pdf_path: string
  expires_at: string
}

// ============================================================
// Edge Function: calculate-quote
// ============================================================

export interface CalculateQuoteRequest {
  unit_id: string
  pie_percentage: number
  term_years: number
  credit_type: 'french' | 'smart' | 'both'
  /** Requerido si credit_type es 'smart' o 'both' */
  smart_cuotas_percentage?: number
}

export interface FrenchCreditResult {
  monthly_payment: number
  monthly_rate: number
  term_months: number
  total_paid: number
  financing_amount: number
}

export interface SmartCreditResult {
  cuotas_payment: number
  balloon_payment: number
  term_months: number
  cuotas_percentage: number
  balloon_percentage: number
  total_paid: number
  financing_amount: number
}

export interface CalculateQuoteResponse {
  unit: {
    id: string
    unit_number: string
    floor: number | null
    list_price: number
    typology: Pick<Typology, 'name' | 'surface_m2'>
  }
  tower: Pick<Tower, 'id' | 'name' | 'delivery_date' | 'max_financing_years' | 'min_pie_percentage'>
  project: Pick<Project, 'id' | 'name' | 'annual_interest_rate' | 'french_credit_enabled' | 'smart_credit_enabled'> & {
    currency: Currency
  }
  pie_amount: number
  financing_amount: number
  french?: FrenchCreditResult
  smart?: SmartCreditResult
}

// ============================================================
// RBAC — Roles con permisos
// ============================================================

export interface RoleWithPermissions extends Role {
  is_system: boolean
  permission_ids: string[]
  active_user_count: number
  inactive_user_count: number
}

// ============================================================
// Audit Log
// ============================================================

export type AuditAction
  = | 'create' | 'update' | 'delete'
    | 'role_assigned' | 'role_removed'
    | 'permission_added' | 'permission_removed'
    | 'assignment_added' | 'assignment_removed'

export interface AuditLogEntry {
  id: string
  entity_type: string
  entity_id: string
  action: AuditAction
  actor_id: string | null
  actor_name?: string | null
  payload: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
    changed_fields?: string[]
    // Relational enrichment (post-migration triggers)
    role_id?: string
    role_name?: string
    permission_id?: string
    module?: string
    permission_action?: string
    user_id?: string
    user_name?: string
    assignment_type?: string
    [key: string]: unknown
  }
  created_at: string
}
