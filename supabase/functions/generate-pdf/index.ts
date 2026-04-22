import { createClient } from 'jsr:@supabase/supabase-js@2'
import { buildCarboneData } from './builder.ts'
import { fetchQuoteRecord } from './fetcher.ts'
import { encode as base64Encode } from 'https://deno.land/std@0.224.0/encoding/base64.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const carboneApiKey = Deno.env.get('CARBONE_API_KEY')

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Supabase env vars not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (!carboneApiKey) {
    return new Response(JSON.stringify({ error: 'CARBONE_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let quote_id: string
    try {
      const body = await req.json() as { quote_id?: string }
      quote_id = body.quote_id ?? ''
    }
    catch {
      return new Response(JSON.stringify({ error: 'Body JSON inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!quote_id) {
      return new Response(JSON.stringify({ error: 'quote_id es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(quote_id)) {
      return new Response(JSON.stringify({ error: 'quote_id inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Fetch quote con todos los joins.
    // El cliente con auth respeta RLS: si el SELECT devuelve la fila, el usuario
    // tiene permiso (owner+quotes.read o quotes.read_all). No hace falta re-validar
    // ownership acá — sería redundante y rompería a admins con read_all.
    console.log(`[generate-pdf] Fetching quote ${quote_id}`)
    const record = await fetchQuoteRecord(supabase, quote_id)

    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Fetch template .docx desde Storage
    console.log(`[generate-pdf] Downloading template from storage...`)
    const { data: templateBlob, error: storageError } = await serviceSupabase.storage
      .from('templates')
      .download('cotizacion.docx')

    if (storageError || !templateBlob) {
      throw new Error(`Error descargando template: ${storageError?.message ?? 'no encontrado'}`)
    }

    const templateBytes = new Uint8Array(await templateBlob.arrayBuffer())
    console.log(`[generate-pdf] Template downloaded: ${templateBytes.byteLength} bytes`)

    if (templateBytes.byteLength === 0) {
      throw new Error('Template descargado está vacío (0 bytes)')
    }

    // 3. Construir objeto de datos para Carbone
    const carboneData = buildCarboneData(record)
    console.log(`[generate-pdf] Carbone data built, keys: ${Object.keys(carboneData).join(', ')}`)

    // 4a. Subir template a Carbone Cloud via multipart/form-data
    //     (JSON con base64 falla en v4 con "template field is empty" — usar FormData)
    console.log(`[generate-pdf] Uploading template to Carbone...`)
    const formData = new FormData()
    formData.append('template', new Blob([templateBytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'cotizacion.docx')

    const uploadRes = await fetch('https://api.carbone.io/template', {
      method: 'POST',
      headers: {
        'carbone-version': '4',
        Authorization: `Bearer ${carboneApiKey}`,
      },
      body: formData,
    })

    const uploadText = await uploadRes.text()
    console.log(`[generate-pdf] Carbone upload response ${uploadRes.status}: ${uploadText.slice(0, 500)}`)

    if (!uploadRes.ok) {
      throw new Error(`Carbone upload error ${uploadRes.status}: ${uploadText}`)
    }

    let uploadJson: { success: boolean; data?: { templateId?: string }; error?: string }
    try {
      uploadJson = JSON.parse(uploadText)
    }
    catch {
      throw new Error(`Carbone upload returned invalid JSON: ${uploadText.slice(0, 300)}`)
    }

    if (!uploadJson.success || !uploadJson.data?.templateId) {
      throw new Error(`Carbone upload failed: ${uploadJson.error ?? 'no templateId returned'}`)
    }

    const templateId = uploadJson.data.templateId
    console.log(`[generate-pdf] Template uploaded, templateId: ${templateId}`)

    // 4b. Generar PDF con POST /render/{templateId}
    console.log(`[generate-pdf] Rendering PDF...`)
    const renderRes = await fetch(`https://api.carbone.io/render/${templateId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'carbone-version': '4',
        Authorization: `Bearer ${carboneApiKey}`,
      },
      body: JSON.stringify({
        data: carboneData,
        convertTo: 'pdf',
      }),
    })

    const renderContentType = renderRes.headers.get('content-type') ?? ''
    console.log(`[generate-pdf] Render response ${renderRes.status}, content-type: ${renderContentType}`)

    if (!renderRes.ok) {
      const errText = await renderRes.text()
      throw new Error(`Carbone render error ${renderRes.status}: ${errText}`)
    }

    // Render devuelve JSON con renderId (sin ?download=true)
    const renderJson = await renderRes.json() as { success: boolean; data?: { renderId?: string }; error?: string }
    if (!renderJson.success || !renderJson.data?.renderId) {
      throw new Error(`Carbone render failed: ${renderJson.error ?? 'no renderId returned'}`)
    }

    const renderId = renderJson.data.renderId
    console.log(`[generate-pdf] Render complete, renderId: ${renderId}`)

    // 4c. Descargar PDF con GET /render/{renderId}
    const downloadRes = await fetch(`https://api.carbone.io/render/${renderId}`, {
      method: 'GET',
    })

    if (!downloadRes.ok) {
      const errText = await downloadRes.text()
      throw new Error(`Carbone download error ${downloadRes.status}: ${errText}`)
    }

    const dlContentType = downloadRes.headers.get('content-type') ?? ''
    console.log(`[generate-pdf] Download response ${downloadRes.status}, content-type: ${dlContentType}`)

    if (!dlContentType.includes('application/pdf') && !dlContentType.includes('application/octet-stream')) {
      const errText = await downloadRes.text()
      throw new Error(`Carbone no devolvió un PDF (content-type: ${dlContentType}): ${errText.slice(0, 200)}`)
    }

    const pdfBytes = await downloadRes.arrayBuffer()
    console.log(`[generate-pdf] PDF downloaded: ${pdfBytes.byteLength} bytes`)

    // 5. Subir PDF a Storage (bucket: quotes)
    const pdfPath = `${quote_id}.pdf`

    const { error: uploadError } = await serviceSupabase.storage
      .from('quotes')
      .upload(pdfPath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Error subiendo PDF: ${uploadError.message}`)
    }
    console.log(`[generate-pdf] PDF uploaded to storage: ${pdfPath}`)

    // 6. Actualizar pdf_path en quotes.
    // El acceso ya se validó vía RLS en el SELECT inicial; acá solo persistimos
    // el path. No filtramos por created_by porque admins generan PDFs de cotizaciones
    // ajenas y el filtro dejaría el path sin actualizar (regenera cada vez).
    const { error: updateError } = await serviceSupabase
      .from('quotes')
      .update({ pdf_path: pdfPath })
      .eq('id', quote_id)
    if (updateError)
      throw updateError

    // 7. Crear URL firmada (válida 1 hora)
    const { data: signedData, error: signError } = await serviceSupabase.storage
      .from('quotes')
      .createSignedUrl(pdfPath, 3600)

    if (signError || !signedData) {
      throw new Error(`Error creando URL firmada: ${signError?.message}`)
    }

    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()
    console.log(`[generate-pdf] Success! Signed URL created.`)

    return new Response(
      JSON.stringify({ url: signedData.signedUrl, pdf_path: pdfPath, expires_at: expiresAt }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    const stack = err instanceof Error ? err.stack : undefined
    console.error(`[generate-pdf] 500 Error:`, message, stack)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
