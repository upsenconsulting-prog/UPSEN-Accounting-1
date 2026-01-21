# UPSEN-Accounting - Plano de Implementação

## ✅ Correção de Links 404 (Concluído)
- `public/frontPage/frontPage.html` - Links corrigidos
- `public/expense/expense.html` - Links corrigidos
- `public/Invoice-issued/invoice-issued.html` - Links corrigidos

---

## Fase 1: Infraestrutura Base (Próximo Passo)

### 1.1 Estrutura de Dados (Spanish Accounting)
```
Models/
├── Company.js          # Configuração fiscal (IVA, IRPF)
├── Customer.js         # Clientes (NIF/NIE/IVA-ID)
├── Supplier.js         # Fornecedores
├── TaxConfig.js        # Tipos de IVA (21%, 10%, 4%)
├── Series.js           # Séries de faturação
└── Invoice.js          # Faturas (emitidas/recebidas)
```

### 1.2 Firebase/Firestore Setup
- Configurar firestore.rules
- Criar índices para queries frequentes
- Estrutura de coleções por empresa

---

## Fase 2: Veri*Factu Implementation

### 2.1 VF_Ledger (Cadeia de Hash SHA-256)
```javascript
// Exemplo de estrutura
{
  id: "uuid",
  prevHash: "hash_anterior",
  currHash: "hash_atual (SHA-256)",
  timestamp: "ISO8601",
  invoiceData: { ... },
  signature: "TSA signature"
}
```

### 2.2 Componentes Necessários
- `utils/hash.js` - Canonicalização + SHA-256
- `services/verifactu.js` - Registro e verificação
- `services/tsa.js` - Sellado temporal (TSA)

---

## Fase 3: Facturae 3.2.2

### 3.1 Geração XML Facturae
- `services/facturae.js` - Builder XML 3.2.2
- Schema validation contra XSD oficial

### 3.2 Assinatura XAdES-EPES
- `services/xades.js` - Assinatura enveloped
- Suporte PKCS#12/HSM

---

## Fase 4: Integrações

### 4.1 Holded API
- `connectors/holded.js` - Connector idempotente
- Endpoints: contacts, invoices, payments

### 4.2 Contasimple CSV
- `templates/contasimple.csv` - Template de importação
- `connectors/contasimple.js` - Mapper de campos

---

## Tarefas Imediatas

- [ ] Testar navegação entre páginas (verificar 404 resolvido)
- [ ] Criar estrutura de pastas para `models/`
- [ ] Configurar Firebase firestore
- [ ] Implementar módulo de hash SHA-256
- [ ] Desenvolver schema VF_Ledger

---

## Referências Técnicas

- [Veri*Factu AEAT](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/)
- [Facturae 3.2.2](https://www.facturae.gob.es/formato/Paginas/version-3-2.aspx)
- [Holded API](https://developers.holded.com/reference/api-key)

