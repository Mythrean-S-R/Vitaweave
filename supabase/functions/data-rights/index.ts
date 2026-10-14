import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const requestType = body.requestType as 'export' | 'erasure';
    const requestId = body.requestId as string | undefined;

    if (requestType === 'export') {
      const { data: patients } = await supabase.from('patients').select('*').eq('profile_id', user.id);
      const payload = { exportedAt: new Date().toISOString(), patients: patients ?? [] };
      await supabase.from('data_rights_requests').insert({
        id: requestId,
        actor_id: user.id,
        request_type: 'export',
        status: 'processed',
        payload,
        processed_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ status: 'processed', payload }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (requestType === 'erasure') {
      await supabase
        .from('patients')
        .update({
          name: 'REDACTED',
          phone: null,
          abha_id: null,
          abha_verified: false,
        })
        .eq('profile_id', user.id);
      await supabase.from('data_rights_requests').insert({
        id: requestId,
        actor_id: user.id,
        request_type: 'erasure',
        status: 'processed',
        processed_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ status: 'processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid requestType' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
