# Plano de Implementação - Gráficos de Previsão e Comentários

## 📊 Informações Coletadas

### Estado Atual dos Arquivos:
1. **frontPage.html** - Já tem canvas `paymentsForecastChart` implementado
2. **frontPageDashboard.js** - Já tem `renderPaymentsForecastChart()` funcionando
3. **Comments** - Já tem estrutura HTML e função `initCommentsToggle()` no JS

### Análise de Discrepâncias:
- HTML do usuário refere `dashboardChart` e `forecastChart`
- Código atual tem `expensesChart` e `paymentsForecastChart`
- **Decisão**: Manter `paymentsForecastChart` (pagos) e criar `forecastChart` (gastos)

---

## 📋 Plano de Implementação

### Passo 1: Criar função `renderForecastChart()` em frontPageDashboard.js
- **Objetivo**: Gráfico de tendência histórica + previsão de gastos
- **Tipo**: Line chart com dados históricos e linha pontilhada para previsão
- **Dados**: Últimos 6 meses + previsão próximos 3 meses (média móvel)

### Passo 2: Verificar e corrigir `renderPaymentsForecastChart()`
- **Objetivo**: Garantir que o gráfico de previsão de pagos esteja funcionando
- **Dados**: Comparar emitidos vs pendentes dos últimos 6 meses

### Passo 3: Verificar funcionalidade de comentários
- **Objetivo**: garantir toggle de mostrar/ocultar comentários
- **HTML**: já existe estrutura
- **JS**: já existe `initCommentsToggle()`

### Passo 4: Conectar tudo no DOMContentLoaded
- Garantir que todas as funções são chamadas na inicialização

---

## 📁 Arquivos a Editar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `public/frontPage/frontPageDashboard.js` | Modificação | Adicionar `renderForecastChart()` e verificar existentes |
| `public/frontPage/frontPage.html` | Verificação | Verificar IDs dos canvas e estrutura de comentários |

---

## ✅ Resultado Esperado

1. **forecastChart** - Tendência de gastos (histórico + previsão 3 meses)
2. **paymentsForecastChart** - Comparação emitidos vs pendentes
3. **Comments toggle** - Funcionalidade de mostrar/ocultar comentários

---

## 🔧 Próximos Passos
1. Criar arquivo TODO com tasks específicas
2. Implementar `renderForecastChart()`
3. Verificar `renderPaymentsForecastChart()`
4. Testar funcionalidade de comentários

