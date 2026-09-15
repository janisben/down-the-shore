import { createClient } from "@supabase/supabase-js";


export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SECRET_KEY
  ) {
    return res.status(500).json({
      error: "Server configuration is incomplete"
    });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const { data, error } = await supabase
      .from("reservations")
      .update({
        status: "expired"
      })
      .eq("status", "pending_payment")
      .not("hold_expires_at", "is", null)
      .lte("hold_expires_at", new Date().toISOString())
      .select("id");

    if (error) {
      throw error;
    }

    return res.status(200).json({
      expired: data?.length || 0
    });
  } catch (error) {
    console.error("Could not expire reservation holds:", error);

    return res.status(500).json({
      error: "Could not release expired holds"
    });
  }
}
