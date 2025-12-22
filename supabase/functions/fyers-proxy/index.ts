import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { url, method, headers } = body

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Proxying ${method || 'GET'} request to: ${url}`)
    
    // Explicitly construct headers object to ensure it's clean
    const fetchHeaders = new Headers(headers || {});

    // Forward the request to Fyers
    const response = await fetch(url, {
        method: method || 'GET',
        headers: fetchHeaders,
    })

    // Parse the response text first to handle non-JSON errors gracefully
    const responseText = await response.text();
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        // Fallback if Fyers returns HTML or plain text error
        data = { s: "error", message: responseText || "Non-JSON response from Fyers" };
    }

    // Return response to client
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    })
  } catch (error) {
    console.error("Proxy Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})