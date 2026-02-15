# Plano de Correções - UPSEN Accounting

## 1. Faturas Recebidas (Invoice_recieved)
### HTML (Invoice_recieved.html)
- [ ] Adicionar botões OCR, Filtros, Descargar PDF no header
- [ ] Adicionar filter-card com filtros
- [ ] Adicionar modalNewInvoiceOCR
- [ ] Corrigir script tag do Bootstrap (versão errada)

### JS (Invoice_recieved.js)
- [ ] Adicionar event listeners para btnNewInvoiceOCR
- [ ] Adicionar event listeners para btnFilter
- [ ] Adicionar event listeners para btnDownload (export PDF)
- [ ] Adicionar funções: openOCRModal, toggleFilter, exportToPDF
- [ ] Implementar filtros

## 2. Faturas Emitidas (Invoice-issued)
### HTML (invoice-issued.html)
- [ ] Adicionar modalExport com opções PDF, CSV, Excel

### JS (invoice-issued.js)
- [ ] Adicionar event listener para btnExport
- [ ] Adicionar funções: openExportModal, exportInvoices

## 3. Gastos (expense)
### HTML (expense.html)
- [ ] Adicionar botões de Exportar se necessário

### JS (expense.js)
- [ ] Adicionar função de exportar se necessário

## 4. Página de Configurações (settings.html)
### Verificação
- [ ] Verificar se AuthService.updateUserProfile existe
- [ ] Verificar event listeners dos botões
- [ ] Corrigir se necessário

## 5. Página de Perfil (profile.html)
### Verificação
- [ ] Verificar funções: showEditModal, showPasswordModal, exportDataPDF, deleteAccount, logout
- [ ] Corrigir event listeners
- [ ] Verificar AuthSystem

## Tarefas por arquivo:
1. public/Invoice_recieved/Invoice_recieved.html
2. public/Invoice_recieved/Invoice_recieved.js
3. public/Invoice-issued/invoice-issued.html
4. public/Invoice-issued/invoice-issued.js
5. public/expense/expense.html (se necessário)
6. public/expense/expense.js (se necessário)
7. public/profile/settings.html (verificar/corrigir)
8. public/profile/profile.html (verificar/corrigir)

