import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // ── GET: carregar dados do usuário ────────────────────────────────────────
  if (req.method === "GET") {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: "user_id obrigatório" });
    }

    try {
      const { data, error } = await supabase
        .from("user_data")
        .select("data")
        .eq("user_id", user_id)
        .maybeSingle();

      if (error) throw error;

      return res.status(200).json({ data: data?.data || null });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao carregar dados", detail: err.message });
    }
  }

  // ── POST: salvar dados do usuário ─────────────────────────────────────────
  if (req.method === "POST") {
    const { user_id, data } = req.body;

    if (!user_id || data === undefined) {
      return res.status(400).json({ error: "user_id e data são obrigatórios" });
    }

    try {
      const { error } = await supabase
        .from("user_data")
        .upsert(
          {
            user_id,
            data,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao salvar dados", detail: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
