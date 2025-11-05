const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Simple banned words list (extend as needed)
const BANNED_WORDS = [
  'spam', 'scam', 'offensive', 'inappropriate',
  // Add more banned words here
];

const RESERVED_USERNAMES = [
  'admin', 'moderator', 'support', 'system', 'official',
  'ratemyrat', 'ratapp', 'root', 'superuser'
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { text, type } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ valid: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lowerText = text.toLowerCase();

    // Check for reserved usernames
    if (type === 'username' && RESERVED_USERNAMES.includes(lowerText)) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'Username is reserved' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for banned words
    for (const word of BANNED_WORDS) {
      if (lowerText.includes(word)) {
        return new Response(
          JSON.stringify({ valid: false, reason: 'Contains prohibited content' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ valid: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});