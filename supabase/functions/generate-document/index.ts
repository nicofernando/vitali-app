import { createClient } from 'jsr:@supabase/supabase-js@2'
import { buildDocumentData } from './builder.ts'
import { fetchClientRecord, fetchQuoteRecord, fetchUnitRecord } from './fetcher.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const UUID_RE = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i

// Bloques que requieren datos de cotización / unidad / cliente
const QUOTE_BLOCKS = ['cotizacion', 'credito_frances', 'credito_inteligente']
const UNIT_BLOCKS = ['unidad', 'torre', 'proyecto']

function err(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const carboneApiKey = Deno.env.get('CARBONE_API_KEY')

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey)
    return err(500, 'Supabase env vars not configured')
  if (!carboneApiKey)
    return err(500, 'CARBONE_API_KEY not configured')

  try {
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verificar autenticación
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user)
      return err(401, 'Unauthorized')

    // 2. Parsear body
    let template_id: string
    let context: { quote_id?: string, unit_id?: string, client_id?: string }
    try {
      const body = await req.json() as { template_id?: string, context?: typeof context }
      template_id = body.template_id ?? ''
      context = body.context ?? {}
    }
    catch {
      return err(400, 'Body JSON inválido')
    }

    if (!template_id)
      return err(400, 'template_id es requerido')
    if (!UUID_RE.test(template_id))
      return err(400, 'template_id inválido')

    // 3. Obtener el template (auth client respeta RLS — solo settings.read puede acceder)
    const { data: templateData, error: templateError } = await authClient
      .from('document_templates')
      .select('id, name, storage_path, context_needs, is_active')
      .eq('id', template_id)
      .single()

    if (templateError || !templateData)
      return err(404, 'Template no encontrado')
    if (!templateData.is_active)
      return err(400, 'El template está desactivado')

    const contextNeeds: string[] = templateData.context_needs ?? []
    const needsQuote = QUOTE_BLOCKS.some(b => contextNeeds.includes(b))
    const needsUnit = !needsQuote && UNIT_BLOCKS.some(b => contextNeeds.includes(b))
    const needsClient = !needsQuote && contextNeeds.includes('cliente')

    // 4. Validar IDs requeridos
    if (needsQuote) {
      if (!context.quote_id)
        return err(400, 'quote_id es requerido para este template')
      if (!UUID_RE.test(context.quote_id))
        return err(400, 'quote_id inválido')
    }
    if (needsUnit) {
      if (!context.unit_id)
        return err(400, 'unit_id es requerido para este template')
      if (!UUID_RE.test(context.unit_id))
        return err(400, 'unit_id inválido')
    }
    if (needsClient && !needsQuote) {
      if (!context.client_id)
        return err(400, 'client_id es requerido para este template')
      if (!UUID_RE.test(context.client_id))
        return err(400, 'client_id inválido')
    }

    // 5. Fetch datos según context_needs
    console.log(`[generate-document] template=${template_id}, contextNeeds=${contextNeeds.join(',')}`)
    const [quote, unit, client] = await Promise.all([
      needsQuote && context.quote_id ? fetchQuoteRecord(authClient, context.quote_id) : null,
      needsUnit && context.unit_id ? fetchUnitRecord(serviceClient, context.unit_id) : null,
      needsClient && context.client_id ? fetchClientRecord(authClient, context.client_id) : null,
    ])

    // 6. Construir data object para Carbone
    const carboneData = buildDocumentData({ quote, unit, client })

    // 7. Descargar template .docx desde Storage
    console.log(`[generate-document] Downloading template: ${templateData.storage_path}`)
    const { data: templateBlob, error: storageError } = await serviceClient.storage
      .from('templates')
      .download(templateData.storage_path)

    if (storageError || !templateBlob)
      throw new Error(`Error descargando template: ${storageError?.message ?? 'no encontrado'}`)

    const templateBytes = new Uint8Array(await templateBlob.arrayBuffer())
    if (templateBytes.byteLength === 0)
      throw new Error('Template descargado está vacío (0 bytes)')

    // 8. Subir template a Carbone Cloud
    const formData = new FormData()
    formData.append(
      'template',
      new Blob([templateBytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      'template.docx',
    )

    const uploadRes = await fetch('https://api.carbone.io/template', {
      method: 'POST',
      headers: { 'carbone-version': '4', Authorization: `Bearer ${carboneApiKey}` },
      body: formData,
    })

    const uploadText = await uploadRes.text()
    if (!uploadRes.ok)
      throw new Error(`Carbone upload error ${uploadRes.status}: ${uploadText}`)

    let uploadJson: { success: boolean, data?: { templateId?: string }, error?: string }
    try {
      uploadJson = JSON.parse(uploadText)
    }
    catch {
      throw new Error(`Carbone upload returned invalid JSON: ${uploadText.slice(0, 300)}`)
    }
    if (!uploadJson.success || !uploadJson.data?.templateId)
      throw new Error(`Carbone upload failed: ${uploadJson.error ?? 'no templateId'}`)

    const carboneTemplateId = uploadJson.data.templateId

    // 9. Renderizar PDF
    const renderRes = await fetch(`https://api.carbone.io/render/${carboneTemplateId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'carbone-version': '4',
        Authorization: `Bearer ${carboneApiKey}`,
      },
      body: JSON.stringify({ data: carboneData, convertTo: 'pdf' }),
    })

    if (!renderRes.ok) {
      const errText = await renderRes.text()
      throw new Error(`Carbone render error ${renderRes.status}: ${errText}`)
    }

    const renderJson = await renderRes.json() as { success: boolean, data?: { renderId?: string }, error?: string }
    if (!renderJson.success || !renderJson.data?.renderId)
      throw new Error(`Carbone render failed: ${renderJson.error ?? 'no renderId'}`)

    const renderId = renderJson.data.renderId

    // 10. Descargar PDF renderizado
    const downloadRes = await fetch(`https://api.carbone.io/render/${renderId}`, {
      method: 'GET',
      headers: { 'carbone-version': '4', Authorization: `Bearer ${carboneApiKey}` },
    })

    if (!downloadRes.ok) {
      const errText = await downloadRes.text()
      throw new Error(`Carbone download error ${downloadRes.status}: ${errText}`)
    }

    const dlContentType = downloadRes.headers.get('content-type') ?? ''
    if (!dlContentType.includes('application/pdf') && !dlContentType.includes('application/octet-stream')) {
      const errText = await downloadRes.text()
      throw new Error(`Carbone no devolvió PDF (content-type: ${dlContentType}): ${errText.slice(0, 200)}`)
    }

    const pdfBytes = await downloadRes.arrayBuffer()
    if (pdfBytes.byteLength === 0)
      throw new Error('Carbone devolvió un PDF vacío (0 bytes)')

    // 11. Subir PDF a Storage (bucket: templates, carpeta: previews/)
    const pdfPath = `previews/${template_id}/${Date.now()}.pdf`
    const { error: uploadError } = await serviceClient.storage
      .from('templates')
      .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (uploadError)
      throw new Error(`Error subiendo PDF de prueba: ${uploadError.message}`)

    // 12. URL firmada (válida 10 min — es solo para vista previa)
    const { data: signedData, error: signError } = await serviceClient.storage
      .from('templates')
      .createSignedUrl(pdfPath, 600)

    if (signError || !signedData)
      throw new Error(`Error creando URL firmada: ${signError?.message}`)

    const expiresAt = new Date(Date.now() + 600 * 1000).toISOString()
    console.log(`[generate-document] Success! PDF preview ready.`)

    return new Response(
      JSON.stringify({ url: signedData.signedUrl, expires_at: expiresAt }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    const stack = err instanceof Error ? err.stack : undefined
    console.error(`[generate-document] 500:`, message, stack)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

Deno.serve(handler)
