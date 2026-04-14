# FactuFácil — Paquete Builderall (HTML/CSS)

Este ZIP incluye:
- `emitir.html`: formulario de facturas con cálculo de Base/IVA/IRPF/Total y botones de *Guardar borrador* y *Emitir* (llama a tu API).
- `verificar.html`: página pública para consultar el *ledger* Veri*Factu por `invoiceId`.
- `brand.css`: estilos base (colores Upsen / FactuFácil).
- `config.js`: define `API_BASE` (edítalo con tu URL).

## Cómo usar en Builderall (Cheetah)
1. En Cheetah, añade **Elemento → HTML/Script** en tu página `/emitir` y pega el contenido de `emitir.html`.
2. En tu página `/verificar`, pega el contenido de `verificar.html`.
3. Sube `brand.css` y `config.js` a tu Hosting estático (o incrústalos en *HTML/Script* si prefieres).
   - Edita `config.js` y reemplaza `https://TU-API-BASE` por tu URL real (Xano o tu API).
4. Asegúrate de permitir **CORS** desde tu dominio en la API y tener **HTTPS** activo.

## API esperada (MVP)
- `POST /invoices` → crea factura (DRAFT) y devuelve `{ id | invoiceId, number?, total? }`.
- `POST /invoices/{id}/emit` → emite factura y devuelve datos finales `{ number, total, ... }`.
- `GET /verifactu/ledger/{invoiceId}` → devuelve array ordenado ascendente por `timestamp` con `eventType, prevHash, currHash`.

> Si usas Xano: crea estos endpoints con tu lógica (hash encadenado como en el documento maestro). Si usas el MVP Node/TS, ya vienen.