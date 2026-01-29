# TODO - Implementação de Gráficos de Previsão e Comentários

## Estado: CONCLUÍDO
Data: 2025-01-17

---

## Task 1: Criar função renderForecastChart() [CONCLUÍDO]
**Objetivo**: Gráfico de tendência histórica + previsão de gastos
**Arquivo**: `public/frontPage/frontPageDashboard.js`

**Implementado**:
- Type: Line chart
- Dados históricos: últimos 6 meses de gastos
- Previsão: próximos 3 meses (média móvel dos últimos 3)
- Diferenciação visual: linha sólida (histórico) vs linha pontilhada (previsão)

---

## Task 2: Verificar renderPaymentsForecastChart() [CONCLUÍDO]
**Objetivo**: Garantir que o gráfico de previsão de pagos funcione corretamente
**Arquivo**: `public/frontPage/frontPageDashboard.js`

**Implementado**:
- Comparar: Pagos vs Pendentes
- Período: últimos 6 meses
- Cores diferentes para cada dataset

---

## Task 3: Verificar toggle de comentários [CONCLUÍDO]
**Objetivo**: Funcionalidade de mostrar/ocultar comentários
**Arquivo**: `public/frontPage/frontPageDashboard.js` + HTML

**Verificado**:
- Elementos HTML existem: `toggleComments`, `commentsContent`
- Função `initCommentsToggle()` está implementada
- Função é chamada no `DOMContentLoaded`

---

## Task 4: HTML - Adicionar canvas forecastChart [CONCLUÍDO]
**Objetivo**: Adicionar o canvas para o gráfico de previsão de gastos
**Arquivo**: `public/frontPage/frontPage.html`

**Adicionado**:
- Novo card com `forecastChart`
- Mantido card existente com `paymentsForecastChart`

---

## Task 5: Conectar funções no DOMContentLoaded [CONCLUÍDO]
**Objetivo**: Garantir inicialização de todos os componentes
**Arquivo**: `public/frontPage/frontPageDashboard.js`

**Calls adicionadas**:
- `renderForecastChart()` ← nova
- `renderPaymentsForecastChart()` ← existente
- `renderExpensesChart()` ← existente
- `initCommentsToggle()` ← existente
- `renderDashboardKPIs()` ← existente

---

## Resumo das Alterações

### Arquivos Modificados:
1. `public/frontPage/frontPageDashboard.js`
   - Adicionada variável `forecastChart`
   - Adicionada função `renderForecastChart()`
   - Adicionada chamada `renderForecastChart()` no DOMContentLoaded

2. `public/frontPage/frontPage.html`
   - Adicionado novo card "Prevision de gastos" com canvas `forecastChart`
   - Renomeado card existente para "Prevision de pagos"

---

## Funcionalidades Implementadas

### 1. Gráfico de Previsão de Gastos (`forecastChart`)
- **Tipo**: Line chart
- **Dados históricos**: Últimos 6 meses
- **Previsão**: Próximos 3 meses (média dos últimos 3)
- **Visual**: Linha sólida azul (histórico) + linha pontilhada vermelha (previsão)

### 2. Gráfico de Previsão de Pagos (`paymentsForecastChart`)
- **Tipo**: Line chart
- **Dados**: Comparação de emitidos vs pendentes
- **Período**: Últimos 6 meses

### 3. Toggle de Comentários
- Funcionalidade de mostrar/ocultar comentários existente
- Animação suave de expandir/recolher

