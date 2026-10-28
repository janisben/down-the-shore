import { createClient } from "@supabase/supabase-js";

const supabase =
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

async function requireOwner(req) {
  const auth =
    String(
      req.headers.authorization || ""
    );

  const token =
    auth.startsWith("Bearer ")
      ? auth.slice(7).trim()
      : "";

  if (!token) {
    throw Object.assign(
      new Error("Owner authentication required."),
      { statusCode: 401 }
    );
  }

  const { data, error } =
    await supabase.auth.getUser(token);

  if (error || !data?.user) {
    throw Object.assign(
      new Error("Owner session is invalid or expired."),
      { statusCode: 401 }
    );
  }
}

export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SECRET_KEY
    ) {
      throw new Error(
        "Server configuration is incomplete."
      );
    }

    await requireOwner(req);

    const id =
      String(req.body?.id || "").trim();

    const changes =
      req.body?.changes;

    if (
      !id ||
      !changes ||
      typeof changes !== "object" ||
      Array.isArray(changes)
    ) {
      return res.status(400).json({
        error: "Valid property settings are required."
      });
    }

    const allowedChanges = {};

    if ("cleaning_fee" in changes) {
      allowedChanges.cleaning_fee =
        Number(changes.cleaning_fee);
    }

    if ("pet_fee" in changes) {
      allowedChanges.pet_fee =
        Number(changes.pet_fee);
    }

    if ("max_dogs" in changes) {
      allowedChanges.max_dogs =
        Number(changes.max_dogs);
    }

    if (
      changes.lease_defaults &&
      typeof changes.lease_defaults === "object" &&
      !Array.isArray(changes.lease_defaults)
    ) {
      allowedChanges.lease_defaults =
        changes.lease_defaults;
    }

    if (!Object.keys(allowedChanges).length) {
      return res.status(400).json({
        error: "No supported property settings were provided."
      });
    }

    const { data, error } =
      await supabase
        .from("properties")
        .update(allowedChanges)
        .eq("id", id)
        .select("id,name,cleaning_fee,pet_fee,max_dogs,lease_defaults")
        .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      property: data
    });
  } catch (error) {
    console.error(
      "Property settings update failed:",
      error
    );

    return res
      .status(error.statusCode || 500)
      .json({
        error:
          error.message ||
          "Could not save property settings."
      });
  }
}
