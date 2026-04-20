import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
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

    const { user_id, enable } = await req.json()
    if (!user_id || enable === undefined) {
      return new Response(JSON.stringify({ error: 'user_id y enable son requeridos' }), {
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
      ban_duration: enable ? 'none' : '876600h',
    })
    if (authUpdateError) throw authUpdateError

    // Actualizar is_active en user_profiles
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .update({ is_active: enable })
      .eq('user_id', user_id)
    if (profileError) throw profileError

    return new Response(JSON.stringify({ ok: true, is_active: enable }), {
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
})
