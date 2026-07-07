// check-balance.js
// Verifica o saldo/crédito restante na OpenRouter e envia alerta no Slack
// se estiver abaixo do THRESHOLD definido.

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const THRESHOLD = parseFloat(process.env.THRESHOLD || "5"); // em dólares (créditos)

async function main() {
  if (!OPENROUTER_API_KEY || !SLACK_WEBHOOK_URL) {
    console.error("Faltando OPENROUTER_API_KEY ou SLACK_WEBHOOK_URL nas variáveis de ambiente.");
    process.exit(1);
  }

  const res = await fetch("https://openrouter.ai/api/v1/key", {
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Erro ao consultar OpenRouter (${res.status}):`, text);
    // Também avisa no Slack se a própria checagem falhar (ex: key inválida/expirada)
    await sendSlack(`⚠️ Falha ao consultar saldo na OpenRouter (HTTP ${res.status}). Verifique a API key.`);
    process.exit(1);
  }

  const data = await res.json();
  const info = data.data;

  // limit_remaining: crédito restante da conta/key (null = ilimitado)
  const remaining = info.limit_remaining;
  const usage = info.usage;

  console.log("Uso total:", usage, "| Restante:", remaining);

  if (remaining === null) {
    console.log("Sem limite definido nesta key — nada a alertar.");
    return;
  }

  if (remaining <= THRESHOLD) {
    await sendSlack(
      `🔴 *Alerta de crédito OpenRouter*\nSaldo restante: *$${remaining.toFixed(2)}*\n` +
      `Limite de alerta: $${THRESHOLD}\n` +
      `👉 Recarregue em: https://openrouter.ai/credits`
    );
    console.log("Alerta enviado ao Slack.");
  } else {
    console.log(`Saldo OK ($${remaining.toFixed(2)} > $${THRESHOLD}). Nenhum alerta necessário.`);
  }
}

async function sendSlack(text) {
  await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
