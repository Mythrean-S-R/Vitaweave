/**
 * Scheduled daily ASHA task generation (invoke via pg_cron + pg_net or Supabase cron).
 * Creates dashboard_tasks from high priority scores, overdue follow-ups, and due vaccinations.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TaskInsert = {
  title: string;
  subtitle: string;
  priority: 'urgent' | 'today' | 'routine';
  icon: string;
  assigned_to: string | null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const cronSecret = Deno.env.get('CRON_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    if (!serviceKey) {
      return new Response(JSON.stringify({ error: 'Service role not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Require cron secret or service-role JWT - never allow unauthenticated invokes.
    const authHeader = req.headers.get('Authorization') ?? '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const authorized =
      (cronSecret && bearer.length > 0 && bearer === cronSecret) ||
      (bearer.length > 0 && bearer === serviceKey);
    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const today = new Date().toISOString().slice(0, 10);
    const tasks: TaskInsert[] = [];

    const { data: highRiskPatients } = await supabase
      .from('patients')
      .select('id, name, urgency_score, assigned_asha_id, follow_up_due')
      .gte('urgency_score', 50)
      .not('assigned_asha_id', 'is', null)
      .limit(100);

    for (const p of highRiskPatients ?? []) {
      const priority = (p.urgency_score ?? 0) >= 80 ? 'urgent' : 'today';
      tasks.push({
        title: `Review: ${p.name}`,
        subtitle: `Priority score ${p.urgency_score ?? '-'} - check vitals and follow-up`,
        priority,
        icon: 'activity',
        assigned_to: p.assigned_asha_id,
      });
    }

    const { data: overdueFollowUps } = await supabase
      .from('patients')
      .select('id, name, assigned_asha_id, follow_up_due')
      .eq('follow_up_urgent', true)
      .not('assigned_asha_id', 'is', null)
      .limit(50);

    for (const p of overdueFollowUps ?? []) {
      tasks.push({
        title: `Follow-up visit: ${p.name}`,
        subtitle: p.follow_up_due ? `Due: ${p.follow_up_due}` : 'Overdue follow-up flagged',
        priority: 'urgent',
        icon: 'clock',
        assigned_to: p.assigned_asha_id,
      });
    }

    const { data: dueVaccinations } = await supabase
      .from('vaccinations')
      .select('id, child_name, vaccine_name, due_date, assigned_asha_id')
      .eq('status', 'due')
      .lte('due_date', today)
      .not('assigned_asha_id', 'is', null)
      .limit(50);

    for (const v of dueVaccinations ?? []) {
      tasks.push({
        title: `Vaccination: ${v.child_name}`,
        subtitle: `${v.vaccine_name} due ${v.due_date}`,
        priority: 'today',
        icon: 'syringe',
        assigned_to: v.assigned_asha_id,
      });
    }

    const deduped = tasks.slice(0, 80);
    if (deduped.length) {
      const { error } = await supabase.from('dashboard_tasks').insert(deduped);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ created: deduped.length, date: today }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
