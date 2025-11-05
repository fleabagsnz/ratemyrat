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

    const { profile_id, event_type } = await req.json();
    const newBadges: string[] = [];

    // Get profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('streak_current, streak_best, stats')
      .eq('id', profile_id)
      .single();

    if (!profile) throw new Error('Profile not found');

    // Check streak badges
    const streakBadges = [
      { key: 'streak_3', threshold: 3 },
      { key: 'streak_7', threshold: 7 },
      { key: 'streak_14', threshold: 14 },
      { key: 'streak_30', threshold: 30 },
      { key: 'streak_50', threshold: 50 },
      { key: 'streak_100', threshold: 100 },
    ];

    for (const badge of streakBadges) {
      if (profile.streak_current >= badge.threshold) {
        const { data: existing } = await supabase
          .from('profile_badges')
          .select('badge_key')
          .eq('profile_id', profile_id)
          .eq('badge_key', badge.key)
          .maybeSingle();

        if (!existing) {
          await supabase.from('profile_badges').insert({
            profile_id,
            badge_key: badge.key,
          });
          newBadges.push(badge.key);
        }
      }
    }

    // Check rater badges
    const ratingsGiven = profile.stats?.ratings_given || 0;
    const raterBadges = [
      { key: 'rater_10', threshold: 10 },
      { key: 'rater_50', threshold: 50 },
      { key: 'rater_100', threshold: 100 },
      { key: 'rater_250', threshold: 250 },
      { key: 'rater_500', threshold: 500 },
    ];

    for (const badge of raterBadges) {
      if (ratingsGiven >= badge.threshold) {
        const { data: existing } = await supabase
          .from('profile_badges')
          .select('badge_key')
          .eq('profile_id', profile_id)
          .eq('badge_key', badge.key)
          .maybeSingle();

        if (!existing) {
          await supabase.from('profile_badges').insert({
            profile_id,
            badge_key: badge.key,
          });
          newBadges.push(badge.key);
        }
      }
    }

    // Check top rat badges (when a rat gets highly rated)
    if (event_type === 'rat_rated') {
      const { data: rats } = await supabase
        .from('rats')
        .select('id, ratings_count, ratings_sum')
        .eq('owner_id', profile_id);

      const topRatBadges = [
        { key: 'top_rat_20', threshold: 20 },
        { key: 'top_rat_50', threshold: 50 },
        { key: 'top_rat_100', threshold: 100 },
      ];

      for (const rat of rats || []) {
        const avg = rat.ratings_count > 0 ? rat.ratings_sum / rat.ratings_count : 0;
        if (avg >= 2.6) {
          for (const badge of topRatBadges) {
            if (rat.ratings_count >= badge.threshold) {
              const { data: existing } = await supabase
                .from('profile_badges')
                .select('badge_key')
                .eq('profile_id', profile_id)
                .eq('badge_key', badge.key)
                .maybeSingle();

              if (!existing) {
                await supabase.from('profile_badges').insert({
                  profile_id,
                  badge_key: badge.key,
                });
                newBadges.push(badge.key);
              }
            }
          }
        }
      }
    }

    // Create badge notifications
    for (const badgeKey of newBadges) {
      await supabase.from('notifications').insert({
        profile_id,
        type: 'badge_earned',
        data: { badge_key: badgeKey },
      });
    }

    return new Response(
      JSON.stringify({ success: true, new_badges: newBadges }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});