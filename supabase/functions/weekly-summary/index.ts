// =============================================================================
// UPlan Finance Tracker - Weekly Summary Edge Function
// Endpoint: /functions/v1/weekly-summary
// Description: Generate weekly spending summaries for all users and send
//              push notifications via Firebase Cloud Messaging (FCM)
// =============================================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ─────────────────────────────────────────────────────────────────────────────
// CORS Headers
// ─────────────────────────────────────────────────────────────────────────────
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface UserRecord {
  id: string;
  full_name: string | null;
  fcm_token: string | null;
}

interface WeeklyStats {
  user_id: string;
  total_spent: number;
  qris_count: number;
  impulse_count: number;
  top_category: string;
  top_category_amount: number;
  previous_week_spent: number;
  change_percentage: number;
  total_transactions: number;
  streak_days: number;
}

interface SummaryResult {
  user_id: string;
  full_name: string | null;
  stats: WeeklyStats | null;
  notification_sent: boolean;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Format currency for notification messages
// ─────────────────────────────────────────────────────────────────────────────
function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Get emoji for category
// ─────────────────────────────────────────────────────────────────────────────
function getCategoryEmoji(category: string): string {
  const emojiMap: Record<string, string> = {
    food: "🍔",
    coffee: "☕",
    transport: "🚗",
    shopping: "🛍️",
    entertainment: "🎬",
    bills: "📄",
    health: "💊",
    other: "📦",
  };
  return emojiMap[category] || "📦";
}

// ─────────────────────────────────────────────────────────────────────────────
// Build notification message
// ─────────────────────────────────────────────────────────────────────────────
function buildNotificationMessage(
  fullName: string | null,
  stats: WeeklyStats
): { title: string; body: string } {
  const name = fullName?.split(" ")[0] || "UPlanner";
  const changeDirection = stats.change_percentage >= 0 ? "📈" : "📉";
  const changeText =
    stats.change_percentage >= 0
      ? `naik ${Math.abs(stats.change_percentage)}%`
      : `turun ${Math.abs(stats.change_percentage)}%`;

  const title = `📊 Rekap Mingguanmu, ${name}!`;
  const body = [
    `💸 Total: ${formatRupiah(stats.total_spent)}`,
    `${changeDirection} ${changeText} dari minggu lalu`,
    `${getCategoryEmoji(stats.top_category)} Top: ${stats.top_category}`,
    `📱 QRIS: ${stats.qris_count}x tap`,
    stats.impulse_count > 0
      ? `⚡ ${stats.impulse_count} impulse purchase${stats.impulse_count > 1 ? "s" : ""}`
      : null,
    stats.streak_days > 0
      ? `🔥 ${stats.streak_days} hari streak QRIS!`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return { title, body };
}

// ─────────────────────────────────────────────────────────────────────────────
// Send FCM Push Notification
// ─────────────────────────────────────────────────────────────────────────────
async function sendFCMNotification(
  fcmToken: string,
  title: string,
  body: string,
  fcmServerKey: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${fcmServerKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: fcmToken,
        notification: {
          title,
          body,
          sound: "default",
          badge: 1,
          click_action: "OPEN_WEEKLY_SUMMARY",
        },
        data: {
          type: "weekly_summary",
          ...data,
        },
        priority: "high",
        content_available: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`FCM error (${response.status}): ${errorText}`);
      return false;
    }

    const result = await response.json();

    // Check for FCM-level errors (e.g., invalid token)
    if (result.failure > 0) {
      console.warn(
        `FCM delivery failure for token: ${fcmToken.substring(0, 20)}...`,
        result.results
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("FCM send error:", error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Process a single user's weekly summary
// ─────────────────────────────────────────────────────────────────────────────
async function processUser(
  supabase: SupabaseClient,
  user: UserRecord,
  fcmServerKey: string | null
): Promise<SummaryResult> {
  const result: SummaryResult = {
    user_id: user.id,
    full_name: user.full_name,
    stats: null,
    notification_sent: false,
  };

  try {
    // Call the get_weekly_stats database function
    const { data: statsData, error: statsError } = await supabase.rpc(
      "get_weekly_stats",
      { p_user_id: user.id }
    );

    if (statsError) {
      console.error(
        `Error getting weekly stats for user ${user.id}:`,
        statsError
      );
      result.error = statsError.message;
      return result;
    }

    if (!statsData) {
      result.error = "No stats data returned";
      return result;
    }

    const stats: WeeklyStats = {
      user_id: user.id,
      total_spent: statsData.total_spent || 0,
      qris_count: statsData.qris_count || 0,
      impulse_count: statsData.impulse_count || 0,
      top_category: statsData.top_category || "other",
      top_category_amount: statsData.top_category_amount || 0,
      previous_week_spent: statsData.previous_week_spent || 0,
      change_percentage: statsData.change_percentage || 0,
      total_transactions: statsData.total_transactions || 0,
      streak_days: statsData.streak_days || 0,
    };

    result.stats = stats;

    // Send push notification if user has FCM token
    if (user.fcm_token && fcmServerKey) {
      const { title, body } = buildNotificationMessage(
        user.full_name,
        stats
      );

      result.notification_sent = await sendFCMNotification(
        user.fcm_token,
        title,
        body,
        fcmServerKey,
        {
          total_spent: stats.total_spent.toString(),
          qris_count: stats.qris_count.toString(),
          top_category: stats.top_category,
        }
      );
    } else {
      if (!user.fcm_token) {
        console.info(`User ${user.id} has no FCM token, skipping notification`);
      }
      if (!fcmServerKey) {
        console.warn("FCM_SERVER_KEY not set, skipping all notifications");
      }
    }

    return result;
  } catch (error) {
    console.error(`Error processing user ${user.id}:`, error);
    result.error = error instanceof Error ? error.message : "Unknown error";
    return result;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────
serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Allow POST only (triggered by cron or manual invocation)
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Create Supabase admin client (service role for cross-user access)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY") || null;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch all users who have weekly_summary notifications enabled
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select(
        `
        id,
        full_name,
        fcm_token,
        notification_preferences!inner (
          weekly_summary,
          push_enabled
        )
      `
      )
      .eq("notification_preferences.weekly_summary", true)
      .eq("notification_preferences.push_enabled", true);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch users",
          details: usersError.message,
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No users with weekly summary enabled",
          processed: 0,
          results: [],
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    console.info(`Processing weekly summaries for ${users.length} users`);

    // Process all users concurrently (with concurrency limit)
    const CONCURRENCY_LIMIT = 10;
    const results: SummaryResult[] = [];

    for (let i = 0; i < users.length; i += CONCURRENCY_LIMIT) {
      const batch = users.slice(i, i + CONCURRENCY_LIMIT);
      const batchResults = await Promise.all(
        batch.map((user: UserRecord) =>
          processUser(supabase, user, fcmServerKey)
        )
      );
      results.push(...batchResults);
    }

    // Compute summary stats
    const totalProcessed = results.length;
    const totalNotified = results.filter((r) => r.notification_sent).length;
    const totalErrors = results.filter((r) => r.error).length;
    const totalSpentAllUsers = results.reduce(
      (sum, r) => sum + (r.stats?.total_spent || 0),
      0
    );

    const summary = {
      message: "Weekly summary processing complete",
      timestamp: new Date().toISOString(),
      processed: totalProcessed,
      notifications_sent: totalNotified,
      errors: totalErrors,
      aggregate: {
        total_spent_all_users: totalSpentAllUsers,
        avg_spent_per_user:
          totalProcessed > 0
            ? Math.round(totalSpentAllUsers / totalProcessed)
            : 0,
      },
      results,
    };

    console.info(
      `Weekly summary complete: ${totalProcessed} processed, ${totalNotified} notified, ${totalErrors} errors`
    );

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in weekly-summary function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
