# Alerta de crédito baixo OpenRouter → Slack

## O que isso faz
A cada 6 horas (ajustável), verifica seu saldo na OpenRouter. Se estiver
abaixo do limite definido (padrão $5), manda uma mensagem no Slack.
Roda de graça no GitHub Actions — não precisa de servidor.

## Passo a passo

### 1. Crie um repositório no GitHub
- Pode ser privado.
- Suba estes dois arquivos mantendo a estrutura de pastas:
  ```
  check-balance.js
  .github/workflows/check-balance.yml
  ```

### 2. Pegue sua API key da OpenRouter
- Vá em https://openrouter.ai/keys
- Copie sua key (ou crie uma nova só para isso)

### 3. Crie um Incoming Webhook no Slack
- Acesse https://api.slack.com/apps → "Create New App" → "From scratch"
- Dê um nome (ex: "Alerta Créditos") e escolha o workspace
- No menu lateral, vá em "Incoming Webhooks" e ative
- Clique em "Add New Webhook to Workspace", escolha o canal (ex: #alertas)
- Copie a URL gerada (começa com `https://hooks.slack.com/services/...`)

### 4. Configure os "Secrets" no GitHub
No seu repositório: **Settings → Secrets and variables → Actions → New repository secret**

Crie dois secrets:
- `OPENROUTER_API_KEY` → sua key da OpenRouter
- `SLACK_WEBHOOK_URL` → a URL do webhook do Slack

### 5. Pronto
O workflow já vai rodar sozinho a cada 6h. Para testar agora sem esperar:
- Vá na aba **Actions** do repositório
- Clique no workflow "Verificar saldo OpenRouter"
- Clique em "Run workflow"

## Ajustes que você pode querer fazer

- **Frequência**: edite a linha `cron: "0 */6 * * *"` no arquivo `.yml`.
  Exemplos: `"0 * * * *"` = a cada hora, `"0 9 * * *"` = 1x por dia às 9h.
- **Threshold (limite de alerta)**: edite `THRESHOLD: "5"` no `.yml` para o
  valor em dólares que quiser.

## Observação importante
O endpoint `/api/v1/key` retorna `limit_remaining` (crédito restante) apenas
se a key tiver um `limit` configurado. Se você nunca setou limite na key,
esse campo vem `null` e o script vai avisar isso no log (mas não vai falhar).
Nesse caso, defina um limite na sua key em openrouter.ai/keys, ou me avise
que ajusto o script para checar o saldo geral da conta em vez do saldo da key.
