# UPSEN Accounting - Estado do Projeto

## ✅ Funcionalidades Implementadas

### Autenticação
- Firebase Authentication (Email/Password, Google)
- Sistema de sessões com localStorage
- Registo e login de utilizadores

### Gestão de Dados
- Gastos (expenses) com IVA
- Faturas Emitidas com IVA
- Faturas Recebidas
- Orçamentos (budgets)
- Sincronização Firebase ↔ localStorage
- Estrutura de dados: `companies/{uid}/{collection}`

### Interface
- Dashboard com KPIs
- Temas (claro/escuro)
- Design responsivo Bootstrap 5
- Sidebar de navegação

### Import/Export
- Importação de CSV
- Exportação PDF/CSV/Excel
- Templates para importação

---

## 📋 Implementações Recentes (Migração Firebase)

### 1. Estrutura de Dados Unificada
- **Antes**: `users/{uid}/{uid}/documents/{collection}/items` (legado)
- **Depois**: `companies/{uid}/{collection}` (organizado)
- Migração automática ao fazer login

### 2. Ficheiros Modificados/Criados
1. `public/shared/firebase-sync.js` - Sincronização com migração automática
2. `public/shared/data-migration.js` - Utilitário de migração manual
3. Todas as páginas HTML atualizadas para incluir o script de migração

### 3. Páginas com Suporte à Migração
- frontPage/frontPage.html
- expense/expense.html
- Invoice-issued/invoice-issued.html
- Invoice_recieved/Invoice_recieved.html
- budgetPage/budget.html
- profile/profile.html
- profile/settings.html

---

## 🎯 O Que Falta para Veri*Factu e Facturae

### Requisitos Legais Spanish (Veri*Factu)
- [ ] Registo de faturação com hash SHA-256
- [ ] Encadeamento de registos (cadeia de hash)
- [ ] Sellado temporal (TSA)
- [ ] Envio automático à AEAT
- [ ] QR Code / Legenda de controlo em PDFs
- [ ] Livros de registo (IVA)
- [ ] IRPF (retenções 7%/15%)

### Facturae (e-Fatura)
- [ ] Geração de XML Facturae 3.2.2
- [ ] Assinatura XAdES-EPES
- [ ] Validação contra XSD

### Funcionalidades Adicionais
- [ ] Faturas retificativas
- [ ] Faturas simplificadas
- [ ] Notas de crédito/abono
- [ ] SII (Suministro Inmediato de Información)
- [ ] Integração Holded API
- [ ] Integração Contasimple (CSV)

---

## 🚀 Próximos Passos Recomendados

1. **Testar a migração** - Fazer login e verificar se os dados aparecem
2. **Implementar Veri*Factu** - Registo com hash e sellado temporal
3. **Gerar PDF com QR** - Código de verificação em cada fatura
4. **Facturae** - Exportar faturas em formato XML assinado
5. **Domínio** - Comprar domínio e configurar HTTPS

