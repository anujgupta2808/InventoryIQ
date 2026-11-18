import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify requesting user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, sessionId } = await req.json();

    if (action === "revoke_all_others") {
      // Sign out all sessions except current
      await supabaseAdmin.auth.admin.signOut(token, "others");

      // Update session records
      await supabaseAdmin
        .from("user_sessions")
        .update({ is_revoked: true })
        .eq("user_id", user.id)
        .neq("id", sessionId || "");

      // Log security event
      await supabaseAdmin.from("security_events").insert({
        user_id: user.id,
        event_type: "ALL_OTHER_SESSIONS_REVOKED",
        details: "User revoked all remote device sessions",
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
        user_agent: req.headers.get("user-agent") || "unknown",
      });

      return new Response(JSON.stringify({ success: true, message: "All other sessions revoked" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "revoke_single" && sessionId) {
      // Verify session belongs to user
      const { data: sessionRecord } = await supabaseAdmin
        .from("user_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .single();

      if (!sessionRecord) {
        return new Response(JSON.stringify({ error: "Session not found or forbidden" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin
        .from("user_sessions")
        .update({ is_revoked: true })
        .eq("id", sessionId);

      await supabaseAdmin.from("security_events").insert({
        user_id: user.id,
        event_type: "SESSION_REVOKED",
        details: `Revoked session ${sessionId} (${sessionRecord.device_info})`,
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
        user_agent: req.headers.get("user-agent") || "unknown",
      });

      return new Response(JSON.stringify({ success: true, message: "Session revoked" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
