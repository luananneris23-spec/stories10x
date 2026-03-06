import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id obrigatório" });
    }

    const { data: row, error } = await supabase
      .from("user_data")
      .select("data")
      .eq("user_id", user_id)
      .single();

    if (error || !row) {
      // Usuário sem dados ainda — retorna vazio
      return res.status(200).json({ data: null });
    }

    return res.status(200).json({ data: JSON.parse(row.data) });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", detail: err.message });
  }
}
