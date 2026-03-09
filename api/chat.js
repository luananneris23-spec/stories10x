import { createClient } from "@supabase/supabase-js";
import { buildSystemPrompt } from "./prompt.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, user_id, promptData } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "Usuário não identificado." });
    }

    const now = new Date();

    // 🔎 Controle de uso
    const { data: usageData } = await supabase
      .from("usage")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (!usageData) {
      await supabase.from("usage").insert({
        user_id,
        first_call_at: now,
        calls_used: 1,
      });
    } else {
      const firstCall = new Date(usageData.first_call_at);
      const diffDays = (now - firstCall) / (1000 * 60 * 60 * 24);

      if (diffDays > 30) {
        await supabase
          .from("usage")
          .update({ first_call_at: now, calls_used: 1 })
          .eq("user_id", user_id);
      } else {
        if (usageData.calls_used >= 200) {
          return res.status(403).json({
            error: "Você atingiu o limite de 60 gerações. Aguarde o próximo ciclo de 30 dias.",
          });
        }
        await supabase
          .from("usage")
          .update({ calls_used: usageData.calls_used + 1 })
          .eq("user_id", user_id);
      }
    }

    // 🧠 Monta system prompt a partir do prompt.js
    let finalMessages = messages;

    if (promptData) {
      const systemPrompt = buildSystemPrompt({
        nicho: promptData.nicho || "",
        prodList: promptData.prodList || "nenhum cadastrado",
        mecsFav: promptData.mecsFav || "nenhum ainda",
        mecsPouco: promptData.mecsPouco || "todos disponíveis",
        totalSeqs: promptData.totalSeqs || 0,
      });

      finalMessages = [
        { role: "system", content: systemPrompt },
        ...messages.filter(m => m.role !== "system"),
      ];
    }

    // 🚀 Chama OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: finalMessages,
        max_tokens: 5000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", JSON.stringify(data));
      return res.status(response.status).json({
        error: data?.error?.message || data?.error?.code || "Erro na OpenAI: " + response.status,
        detail: JSON.stringify(data?.error || data)
      });
    }

    return res.status(200).json({ choices: data.choices });

  } catch (error) {
    return res.status(500).json({
      error: "Erro ao processar requisição.",
      detail: error?.message || "Erro desconhecido",
    });
  }
}
