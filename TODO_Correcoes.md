# TODO - Correções de Bugs UPSEN Accounting

## ✅ CORREÇÕES CONCLUÍDAS

### 1. Modal de Gastos (PRIORIDADE ALTA)
- ✅ expense.html - Bootstrap JS adicionado
- ✅ expense.html - Modal inicializado corretamente com `new bootstrap.Modal()`
- ✅ expense.html - Botão de logout na sidebar com confirmação
- ✅ expense.js - Adicionada função viewExpense() e botão "Ver"
- ✅ expense.html - Adicionado modal "Ver Gasto"

### 2. Facturas Emitidas
- ✅ invoice-issued.html - Botão logout na sidebar
- ✅ invoice-issued.html - Modal Ver Factura adicionado
- ✅ invoice-issued.js - Função viewInvoice() adicionada
- ✅ invoice-issued.js - Botões: Ver, Pagar, Eliminar

### 3. Facturas Recibidas
- ✅ Invoice_recieved.html - Botão logout na sidebar
- ✅ Invoice_recieved.html - Modal Ver Factura adicionado
- ✅ Invoice_recieved.js - Função viewInvoice() adicionada
- ✅ Invoice_recieved.js - Botões: Ver, Pagar, Eliminar

### 4. Todas as páginas com Logout fixo na Sidebar
- ✅ expense.html
- ✅ invoice-issued.html
- ✅ invoice-recieved.html
- ✅ frontPage.html
- ✅ budget.html
- ✅ profile.html
- ✅ settings.html

### 5. Funcionalidades adicionadas
- ✅ Botão "Ver" em todas as tabelas (Gastos, Facturas Emitidas, Facturas Recibidas)
- ✅ Confirmação ao fazer logout: `confirm('¿Cerrar sesión?')`
- ✅ Modais de visualização de detalhes

## Ficheiros Modificados:
1. `public/expense/expense.html` - Modal fixo, logout, modal Ver
2. `public/expense/expense.js` - Função viewExpense()
3. `public/Invoice-issued/invoice-issued.html` - Logout, modal Ver
4. `public/Invoice-issued/invoice-issued.js` - viewInvoice()
5. `public/Invoice_recieved/Invoice_recieved.html` - Logout, modal Ver
6. `public/Invoice_recieved/Invoice_recieved.js` - viewInvoice()
7. `public/frontPage/frontPage.html` - Logout na sidebar
8. `public/budgetPage/budget.html` - Logout na sidebar
9. `public/profile/profile.html` - Confirmação logout
10. `public/profile/settings.html` - Confirmação logout

## Problemas Resolvidos:
1. ✅ Modal de gastos AGORA ABRE e guarda dados
2. ✅ Botão "cerrar sesión" aparece FIXO na barra lateral em todas as páginas
3. ✅ Confirmação ao fazer logout
4. ✅ Botão "Ver" para visualizar detalhes em gastos e facturas

## Para Testar:
1. Abrir `public/expense/expense.html`
2. Clicar em "Nuevo gasto" - O modal deve abrir
3. Preencher os campos e clicar "Guardar" - O gasto deve ser salvo
4. Clicar em "Ver" para ver os detalhes
5. Verificar que "Cerrar sesión" aparece na sidebar
6. Testar as outras páginas (facturas emitidas/recibidas)
