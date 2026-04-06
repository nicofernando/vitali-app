import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string
  full_name?: string | null
  phone?: string | null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar que el solicitante está autenticado
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

    const body: CreateUserRequest = await req.json()
    const { email, full_name, phone } = body

    if (!email) {
      return new Response(JSON.stringify({ error: 'El email es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cliente admin con service role (bypasa RLS)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Invitar usuario — el trigger handle_new_user crea el perfil automáticamente
    // con full_name desde raw_user_meta_data
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      { data: { full_name: full_name ?? null } },
    )

    if (inviteError) throw inviteError

    // Si viene phone, actualizar el perfil que creó el trigger
    if (phone && inviteData.user?.id) {
      await adminClient
        .from('user_profiles')
        .update({ phone })
        .eq('user_id', inviteData.user.id)
    }

    return new Response(
      JSON.stringify({ id: inviteData.user?.id, email }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
  catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
