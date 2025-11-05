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

    const { rat_id } = await req.json();

    // Fetch all ratings for this rat
    const { data: ratings, error: ratingsError } = await supabase
      .from('ratings')
      .select('score')
      .eq('rat_id', rat_id);

    if (ratingsError) throw ratingsError;

    const ratingsCount = ratings?.length || 0;
    const ratingsSum = ratings?.reduce((sum, r) => sum + r.score, 0) || 0;

    // Calculate Bayesian weighted score
    // Prior: mean = 2.0, weight = 5 votes
    const priorMean = 2.0;
    const priorWeight = 5;
    const bayesScore = (priorWeight * priorMean + ratingsSum) / (priorWeight + ratingsCount);

    // Update rat with new aggregates
    const { error: updateError } = await supabase
      .from('rats')
      .update({
        ratings_count: ratingsCount,
        ratings_sum: ratingsSum,
        bayes_score: bayesScore,
      })
      .eq('id', rat_id);

    if (updateError) throw updateError;

    // Get rat owner for notification
    const { data: rat } = await supabase
      .from('rats')
      .select('owner_id')
      .eq('id', rat_id)
      .single();

    if (rat) {
      // Create notification for rat owner
      await supabase.from('notifications').insert({
        profile_id: rat.owner_id,
        type: 'rating_received',
        data: { rat_id, new_rating_count: ratingsCount },
      });
    }

    return new Response(
      JSON.stringify({ success: true, ratings_count: ratingsCount, bayes_score: bayesScore }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});