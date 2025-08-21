import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { checklistId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '');

    const { data: checklist, error } = await supabase
      .from('boat_checklists')
      .select(`
        *,
        boats(name, model, year),
        profiles(name),
        boat_checklist_items(*, checklist_items(name, category))
      `)
      .eq('id', checklistId)
      .single();

    if (error) throw error;

    // Simple PDF content
    const encoder = new TextEncoder();
    const pdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj
4 0 obj<</Length 50>>stream
BT/F1 12 Tf 50 750 Td(Rapport Checklist)Tj ET
endstream endobj
xref 0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000100 00000 n 
0000000180 00000 n 
trailer<</Size 5/Root 1 0 R>>startxref 250 %%EOF`;

    const pdfBuffer = encoder.encode(pdfContent);
    const base64PDF = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    return new Response(JSON.stringify({ success: true, pdf: base64PDF }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);