import { createClient } from 'jsr:@supabase/supabase-js@2'
import { buildCarboneData } from './builder.ts'
import { fetchQuoteRecord } from './fetcher.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
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

    // 1. Fetch quote con todos los joins
    const record = await fetchQuoteRecord(supabase, quote_id)

    // Verificar ownership antes de proceder
    if (record.created_by !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Fetch template .docx desde Storage
    const { data: templateBlob, error: storageError } = await serviceSupabase.storage
      .from('templates')
      .download('cotizacion.docx')

    if (storageError || !templateBlob) {
      throw new Error(`Error descargando template: ${storageError?.message ?? 'no encontrado'}`)
    }

    const templateBytes = await templateBlob.arrayBuffer()
    const templateBase64 = arrayBufferToBase64(templateBytes)

    // 3. Construir objeto de datos para Carbone
    const carboneData = buildCarboneData(record)

    // 4a. Subir template a Carbone Cloud → obtener templateId
    const uploadRes = await fetch('https://api.carbone.io/template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'carbone-version': '4',
        Authorization: `Bearer ${carboneApiKey}`,
      },
      body: JSON.stringify({ template: templateBase64 }),
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      throw new Error(`Carbone upload error ${uploadRes.status}: ${errText}`)
    }

    const uploadJson = await uploadRes.json() as { success: boolean; data?: { templateId?: string }; error?: string }
    if (!uploadJson.success || !uploadJson.data?.templateId) {
      throw new Error(`Carbone upload failed: ${uploadJson.error ?? 'no templateId returned'}`)
    }

    const templateId = uploadJson.data.templateId

    // 4b. Generar PDF con POST /render/{templateId}?download=true
    const renderRes = await fetch(`https://api.carbone.io/render/${templateId}?download=true`, {
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

    if (!renderRes.ok) {
      const errText = await renderRes.text()
      throw new Error(`Carbone render error ${renderRes.status}: ${errText}`)
    }

    const contentType = renderRes.headers.get('content-type') ?? ''
    // Con ?download=true, Carbone devuelve el PDF directamente (application/pdf)
    if (!contentType.includes('application/pdf')) {
      const errText = await renderRes.text()
      throw new Error(`Carbone no devolvió un PDF (content-type: ${contentType}): ${errText.slice(0, 200)}`)
    }

    const pdfBytes = await renderRes.arrayBuffer()

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

    // 6. Actualizar pdf_path en quotes
    const { error: updateError } = await serviceSupabase
      .from('quotes')
      .update({ pdf_path: pdfPath })
      .eq('id', quote_id)
      .eq('created_by', user.id)
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

    return new Response(
      JSON.stringify({ url: signedData.signedUrl, pdf_path: pdfPath, expires_at: expiresAt }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    const stack = err instanceof Error ? err.stack : undefined
    console.error(`[generate-pdf] 500 Error:`, err)
    return new Response(JSON.stringify({ error: message, stack }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
