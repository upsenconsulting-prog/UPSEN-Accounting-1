# TODO: Implementar IVA fields e Importação em massa

## Status: CONCLUÍDO

### Implementado:

1. **Invoice Issued** - COMPLETO:
   - ✅ Campos IVA: ivaRate, ivaAmount, totalAmount, customerNif
   - ✅ Importação massiva CSV
   - ✅ Sincronização Firebase corrigida (agora usa estrutura correta users/{uid}/documents/...)
   - ✅ Tabela com colunas IVA
   - ✅ Formulário com campos IVA

2. **Invoice Received** - COMPLETO:
   - ✅ Campos IVA: ivaRate, ivaAmount, totalAmount, supplierNif
   - ✅ Importação massiva CSV
   - ✅ Sincronização Firebase corrigida
   - ✅ Tabela com colunas IVA
   - ✅ Formulário com campos IVA

3. **Problema do Firebase** - CORRIGIDO:
   - Alterada a verificação de userId para não bloquear 'demo'
   - Alterada a estrutura do Firebase de `companies/{uid}/invoicesIssued` para `users/{uid}/documents/invoicesIssued/items`
   - Adicionados logs de debug para identificar problemas

### Como usar:
1. Faça login com uma conta real (não demo) para ver os dados no Firebase
2. Para IVA: Os campos são calculados automaticamente ao criar/importar faturas
3. Para importar: Use o botão "Importar" e selecione um arquivo CSV

### Formato CSV para importação:

**Faturas Emitidas:**
```csv
Numero,Cliente,NIF,Fecha,Vence,Base Imponible,IVA Rate,Estado
INV-2025-001,Cliente SL,12345678A,2025-01-15,2025-02-15,1000.00,21,Pendiente
```

**Faturas Recebidas:**
```csv
Numero,Proveedor,NIF,Fecha,Base Imponible,IVA Rate,Estado
REC-2025-001,Proveedor SL,12345678A,2025-01-15,1000.00,21,Pendiente
```

