// check-balance.js
// Verifica o saldo/crédito restante na OpenRouter e envia alerta no Slack
// se estiver abaixo do THRESHOLD definido.

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const THRESHOLD = parseFloat(process.env.THRESHOLD || "5"); // em dólares (créditos)
// REPORT_BALANCE=true: envia o saldo atual no Slack (uso manual/teste), sem passar pela lógica de alerta
const REPORT_BALANCE = process.env.REPORT_BALANCE === "true";

async function main() {
  if (!OPENROUTER_API_KEY || !SLACK_WEBHOOK_URL) {
    console.error("Faltando OPENROUTER_API_KEY ou SLACK_WEBHOOK_URL nas variáveis de ambiente.");
    process.exit(1);
  }

  let res;
  try {
    res = await fetch("https://openrouter.ai/api/v1/credits", {
      headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` },
    });
  } catch (err) {
    console.error("Erro de rede ao consultar OpenRouter:", err.message);
    await sendSlack(`⚠️ Falha de rede ao consultar saldo na OpenRouter: ${err.message}`);
    process.exit(1);
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`Erro ao consultar OpenRouter (${res.status}):`, text);
    // Também avisa no Slack se a própria checagem falhar (ex: key inválida/expirada)
    await sendSlack(`⚠️ Falha ao consultar saldo na OpenRouter (HTTP ${res.status}). Verifique a API key.`);
    process.exit(1);
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    console.error("Resposta da OpenRouter não é JSON válido:", err.message);
    await sendSlack("⚠️ Resposta inválida (JSON malformado) ao consultar saldo na OpenRouter.");
    process.exit(1);
  }

  const info = data.data;

  // total_credits: total já comprado/creditado na conta (all-time)
  // total_usage: total já consumido (all-time)
  const totalCredits = info?.total_credits;
  const totalUsage = info?.total_usage;

  if (typeof totalCredits !== "number" || typeof totalUsage !== "number") {
    console.error("Resposta da OpenRouter sem os campos esperados:", JSON.stringify(data));
    await sendSlack("⚠️ Resposta inesperada da OpenRouter ao consultar saldo (campos total_credits/total_usage ausentes).");
    process.exit(1);
  }

  const remaining = totalCredits - totalUsage;

  console.log("Total creditado:", totalCredits, "| Uso total:", totalUsage, "| Saldo restante:", remaining);

  if (REPORT_BALANCE) {
    await sendSlack(`💰 Saldo atual OpenRouter: *$${remaining.toFixed(2)}*`);
    console.log("Relatório de saldo enviado ao Slack.");
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
  const res = await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Falha ao enviar mensagem ao Slack (HTTP ${res.status}):`, body);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
