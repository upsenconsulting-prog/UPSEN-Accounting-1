# Plano de Correção - UPSEN Accounting

## Correções Implementadas

### ✅ Problema 1: Loading Infinito na Página de Perfil
- Adicionada função `hideLoading()` que esconde o overlay após carregar os dados
- Adicionado delay de 50ms para garantir que AuthSystem está inicializado
- O loading overlay agora desaparece corretamente após a autenticação

### ✅ Problema 2: Exportação PDF
- Adicionada biblioteca jsPDF via CDN
- **profile.html**: Nova função `exportDataPDF()` exporta perfil em PDF
- **settings.html**: 
  - Função `exportDataPDF(type)` exporta facturas/gastos/presupuestos em PDF
  - Função `exportAllDataPDF()` exporta resumo geral em PDF
  - Botões com opção de PDF e JSON

### ✅ Problema 3: Redução de Tamanhos
- **profile.html** e **settings.css**:
  - Sidebar: 250px → 220px
  - Padding cards: 30px → 20px
  - Border-radius: 16px → 12px
  - Fontes: reduzidas em ~20%
  - Buttons: padding 12px → 8px

- **frontPage.css**:
  - Sidebar: 250px → 220px
  - Padding geral: reduzido

- **budgetPage/style.css**:
  - Buttons: padding reduzido
  - Fontes: reduzidas
  - Border-radius: 12px

---

## Ficheiros Modificados

1. `public/profile/profile.html` - Loading corrigido + PDF + tamanhos
2. `public/profile/settings.html` - PDF export + tamanhos
3. `public/frontPage/frontPage.css` - Tamanhos reduzidos
4. `public/budgetPage/style.css` - Tamanhos reduzidos

---

## Funcionalidades PDF Implementadas

### profile.html
- Botão "Exportar PDF" gera PDF com:
  - Header UPSEN Accounting
  - Dados do perfil (nome, empresa, email, etc.)
  - Preferências
  - Estatísticas

### settings.html
- Facturas: PDF + JSON
- Gastos: PDF + JSON
- Presupuestos: PDF + JSON
- Exportar todo: PDF resumo geral

---

## Como Testar

1. Abrir `public/profile/profile.html`
   - Verificar que o loading desaparece
   - Clicar em "Exportar PDF" para testar

2. Abrir `public/profile/settings.html`
   - Verificar tamanhos reduzidos
   - Testar exportação PDF e JSON

3. Verificar outras páginas:
   - frontPage.css
   - budgetPage/style.css

