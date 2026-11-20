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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, organizationId, targetUserId, newRole, inviteEmail } = body;

    // Verify requester role in organization
    const { data: memberRecord } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single();

    if (!memberRecord || !["owner", "admin"].includes(memberRecord.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: Owner or Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "change_role") {
      // Non-owners cannot assign or modify the 'owner' role
      if (newRole === "owner" && memberRecord.role !== "owner") {
        return new Response(JSON.stringify({ error: "Only current owner can transfer ownership" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Administrators cannot create other administrators or alter owners
      if (memberRecord.role === "admin" && (newRole === "admin" || newRole === "owner")) {
        return new Response(JSON.stringify({ error: "Forbidden: Administrators cannot assign admin or owner roles" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin
        .from("organization_members")
        .update({ role: newRole })
        .eq("organization_id", organizationId)
        .eq("user_id", targetUserId);

      await supabaseAdmin.from("security_events").insert({
        user_id: user.id,
        organization_id: organizationId,
        event_type: "ROLE_CHANGED",
        details: `Changed role of user ${targetUserId} to ${newRole}`,
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
        user_agent: req.headers.get("user-agent") || "unknown",
      });

      return new Response(JSON.stringify({ success: true, message: `Role updated to ${newRole}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove_member") {
      // Check target member's role
      const { data: targetMember } = await supabaseAdmin
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", targetUserId)
        .single();

      if (targetMember?.role === "owner") {
        return new Response(JSON.stringify({ error: "Cannot remove organization owner" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (memberRecord.role === "admin" && targetMember?.role === "admin") {
        return new Response(JSON.stringify({ error: "Forbidden: Administrators cannot remove other administrators" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin
        .from("organization_members")
        .delete()
        .eq("organization_id", organizationId)
        .eq("user_id", targetUserId);

      await supabaseAdmin.from("security_events").insert({
        user_id: user.id,
        organization_id: organizationId,
        event_type: "MEMBER_REMOVED",
        details: `Removed member ${targetUserId} from organization`,
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
        user_agent: req.headers.get("user-agent") || "unknown",
      });

      return new Response(JSON.stringify({ success: true, message: "Member removed from organization" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
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
