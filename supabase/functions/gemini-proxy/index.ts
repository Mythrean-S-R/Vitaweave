import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MEDGEMMA_SYSTEM_PROMPT = `You are MedGemma, a specialized AI medical assistant for the VitaWeave community health app.
Your users are Community Health Workers (CHWs) and Doctors in rural India.
tone: Professional, empathetic, concise, and clinically accurate.
role: Assist with triage, suggest differential diagnoses, explain medical concepts, and provide public health guidance.
safety: Always include a disclaimer for critical cases: "Please verify with a specialist."`;

type ImagePart = {
  base64: string;
  mimeType: string;
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

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: 'Gemini API key not configured on server' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { prompt, context, language, image } = await req.json() as {
      prompt?: string;
      context?: string;
      language?: string;
      image?: ImagePart;
    };
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let fullPrompt = `${MEDGEMMA_SYSTEM_PROMPT}\n\n`;
    if (language) fullPrompt += `${language}\n\n`;
    if (context) fullPrompt += `CONTEXT:\n${context}\n\n`;
    fullPrompt += `USER QUERY: ${prompt}`;

    const parts: Record<string, unknown>[] = [{ text: fullPrompt }];
    if (image?.base64 && image?.mimeType) {
      parts.push({
        inline_data: {
          mime_type: image.mimeType,
          data: image.base64.replace(/^data:[^;]+;base64,/, ''),
        },
      });
    }

    const envModel = Deno.env.get('GEMINI_MODEL');
    const primaryModel = (envModel && envModel !== 'gemini-1.5-flash') ? envModel : 'gemini-2.5-flash';
    const modelsToTry = [primaryModel, 'gemini-2.5-flash-lite', 'gemini-flash-latest'];

    let geminiData: any = null;
    let lastErrText = '';

    for (const model of modelsToTry) {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
          }),
        }
      );

      if (geminiResponse.ok) {
        geminiData = await geminiResponse.json();
        break;
      } else {
        lastErrText = await geminiResponse.text();
      }
    }

    if (!geminiData) {
      return new Response(JSON.stringify({ error: `Gemini API error: ${lastErrText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const text =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ??
      'No response generated.';

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
