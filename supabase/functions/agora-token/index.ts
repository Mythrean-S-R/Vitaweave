import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { RtcTokenBuilder, RtcRole } from 'https://esm.sh/agora-access-token@2.0.4';

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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appId = Deno.env.get('AGORA_APP_ID');
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE');
    if (!appId || !appCertificate) {
      return new Response(JSON.stringify({ error: 'Agora credentials not configured on server' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      channelName,
      uid = 0,
      role = 'publisher',
      appointmentId,
      videoCallId,
    } = await req.json();
    if (!channelName || typeof channelName !== 'string') {
      return new Response(JSON.stringify({ error: 'channelName is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // When call/appointment IDs are provided, require the caller to be a participant.
    if (videoCallId || appointmentId) {
      let allowed = false;
      if (videoCallId) {
        const { data: call } = await supabase
          .from('video_calls')
          .select('host_id, participant_id, appointment_id, channel_name')
          .eq('id', videoCallId)
          .maybeSingle();
        if (call && call.channel_name === channelName) {
          allowed =
            call.host_id === user.id ||
            call.participant_id === user.id;
        }
      }
      if (!allowed && appointmentId) {
        const { data: appt } = await supabase
          .from('appointments')
          .select('doctor_id, patient_id')
          .eq('id', appointmentId)
          .maybeSingle();
        if (appt) {
          if (appt.doctor_id === user.id) {
            allowed = true;
          } else {
            const { data: patient } = await supabase
              .from('patients')
              .select('profile_id, assigned_asha_id, assigned_doctor_id')
              .eq('id', appt.patient_id)
              .maybeSingle();
            allowed = Boolean(
              patient &&
                (patient.profile_id === user.id ||
                  patient.assigned_asha_id === user.id ||
                  patient.assigned_doctor_id === user.id)
            );
          }
        }
      }
      if (!allowed) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.role !== 'admin') {
          return new Response(JSON.stringify({ error: 'Forbidden: not a call participant' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    const expireSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpire = currentTimestamp + expireSeconds;
    const agoraRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      Number(uid),
      agoraRole,
      privilegeExpire
    );

    return new Response(
      JSON.stringify({
        token,
        appId,
        channelName,
        uid: Number(uid),
        expiresAt: privilegeExpire,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
