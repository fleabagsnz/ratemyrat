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

    // RevenueCat webhook payload
    const payload = await req.json();

    // Extract relevant data from RevenueCat webhook
    const { event, app_user_id, product_id, transaction_id } = payload;

    if (event?.type === 'INITIAL_PURCHASE' || event?.type === 'NON_RENEWING_PURCHASE') {
      // Find the profile by app_user_id (should match profile.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, entitlements')
        .eq('id', app_user_id)
        .maybeSingle();

      if (!profile) {
        throw new Error('Profile not found');
      }

      // Check if purchase already exists
      const { data: existingPurchase } = await supabase
        .from('purchases')
        .select('id')
        .eq('transaction_ref', transaction_id)
        .maybeSingle();

      if (!existingPurchase) {
        // Insert purchase record
        await supabase.from('purchases').insert({
          profile_id: app_user_id,
          product_id: product_id,
          platform: 'ios',
          transaction_ref: transaction_id,
          verified: true,
        });
      }

      // Update entitlements
      if (product_id === 'blood_red') {
        const updatedEntitlements = { ...profile.entitlements, blood_red: true };
        await supabase
          .from('profiles')
          .update({ entitlements: updatedEntitlements })
          .eq('id', app_user_id);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Purchase verified and entitlement granted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Event processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});