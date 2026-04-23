import { createClient } from 'jsr:@supabase/supabase-js@2'

const PERMANENT_BAN_DURATION = '876600h' // ~100 years — Supabase has no permanent ban API

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )

    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: canEdit, error: permError } = await authClient.rpc('has_permission', {
      p_module: 'users',
      p_action: 'edit',
    })
    if (permError || !canEdit) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let user_id: string
    let enable: unknown
    try {
      const body = await req.json()
      user_id = body.user_id
      enable = body.enable
    }
    catch {
      return new Response(JSON.stringify({ error: 'Body JSON inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!user_id || typeof enable !== 'boolean') {
      return new Response(JSON.stringify({ error: 'user_id y enable son requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const enableBool = enable as boolean

    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(user_id)) {
      return new Response(JSON.stringify({ error: 'user_id inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (user_id === user.id) {
      return new Response(JSON.stringify({ error: 'No podés modificar tu propio estado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Banear / desbanear en Supabase Auth (bloquea el login)
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(user_id, {
      ban_duration: enableBool ? 'none' : PERMANENT_BAN_DURATION,
    })
    if (authUpdateError) throw authUpdateError

    // Actualizar is_active en user_profiles
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .update({ is_active: enableBool })
      .eq('user_id', user_id)
    if (profileError) throw profileError

    return new Response(JSON.stringify({ ok: true, is_active: enableBool }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
}

Deno.serve(handler)
