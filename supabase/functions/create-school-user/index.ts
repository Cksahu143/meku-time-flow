import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the calling user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: callingUser },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller's role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role, school_id")
      .eq("user_id", callingUser.id)
      .single();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: "No role found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPlatformAdmin = callerRole.role === "platform_admin";
    const isSchoolAdmin = callerRole.role === "school_admin";

    if (!isPlatformAdmin && !isSchoolAdmin) {
      return new Response(
        JSON.stringify({ error: "Only school admins and platform admins can create users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { email, password, username, display_name, role, school_id } = body;

    // Validate required fields
    if (!email || !password || !role || !school_id) {
      return new Response(
        JSON.stringify({ error: "email, password, role, and school_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    const allowedRoles = isPlatformAdmin ? ["student", "teacher", "school_admin"] : ["student", "teacher"];
    if (!allowedRoles.includes(role)) {
      const msg = isPlatformAdmin
        ? "Can only create student, teacher, or school_admin accounts"
        : "School admins can only create student or teacher accounts";
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // School admins can only create users in their own school
    if (isSchoolAdmin && !isPlatformAdmin && school_id !== callerRole.school_id) {
      return new Response(
        JSON.stringify({ error: "School admins can only create users in their own school" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the school exists
    const { data: school, error: schoolError } = await adminClient
      .from("schools")
      .select("id, name")
      .eq("id", school_id)
      .single();

    if (schoolError || !school) {
      return new Response(
        JSON.stringify({ error: "School not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user via admin API (auto-confirms email)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: username || null },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The handle_new_user trigger creates the profile, but update it with extra info
    if (display_name || username) {
      await adminClient
        .from("profiles")
        .update({
          display_name: display_name || null,
          username: username || null,
        })
        .eq("id", newUser.user.id);
    }

    // Update user_roles with the correct role and school
    // The assign_default_role trigger already created a 'student' role row
    await adminClient
      .from("user_roles")
      .update({
        role,
        school_id,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", newUser.user.id);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          role,
          school_id,
          school_name: school.name,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-school-user:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
