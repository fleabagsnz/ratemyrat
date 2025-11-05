import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { image_url, rat_id } = await req.json();

    // TODO: Integrate with Google Cloud Vision SafeSearch API
    // For now, mock the moderation check
    const bypassModeration = Deno.env.get('BYPASS_MODERATION') === 'true';

    if (bypassModeration) {
      // Development mode - approve everything
      return new Response(
        JSON.stringify({ safe: true, rat_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Production: Call Google Cloud Vision API
    // Example implementation (requires API key setup):
    /*
    const apiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { source: { imageUri: image_url } },
            features: [{ type: 'SAFE_SEARCH_DETECTION' }]
          }]
        })
      }
    );

    const visionData = await visionResponse.json();
    const safeSearch = visionData.responses[0].safeSearchAnnotation;

    const isFlagged = 
      safeSearch.adult === 'LIKELY' || safeSearch.adult === 'VERY_LIKELY' ||
      safeSearch.violence === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY' ||
      safeSearch.racy === 'LIKELY' || safeSearch.racy === 'VERY_LIKELY';

    if (isFlagged) {
      await supabase
        .from('rats')
        .update({ moderation_state: 'pending_review' })
        .eq('id', rat_id);

      return new Response(
        JSON.stringify({ safe: false, rat_id, flagged: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    */

    return new Response(
      JSON.stringify({ safe: true, rat_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});