# Datenbank- und Backend-Audit

## Reihenfolge

1. Datenbankarchitektur
2. Backend-Validierungen
3. Berechnungsmodul
4. Status
5. Rueckverfolgbarkeit
6. Dashboard-Unterstuetzung

## Umsetzungsstand

Fertiggestellt, getestet und committed:
- Backend-Validierungen fuer Rechnungen, Budgets und Ausgaben
  Commit: `aa500af` `Add validation guards for invoices budgets and expenses`
- Zentrales Berechnungsmodul fuer Rechnungen und Budgets
  Commit: `dc2d604` `Centralize invoice and budget calculations`
- Dokumentstatus und Statusuebergaenge fuer Rechnungen und Budgets
  Commit: `1fa9f28` `Add controlled status transitions for documents`
- Rueckverfolgbarkeit mit `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `statusHistory`
  Commit: `c2fba13` `Add traceability fields for financial documents`
- Dashboard-Zusammenfassung fuer Einnahmen, Ausgaben, offene und ueberfaellige Dokumente
  Commit: `980d665` `Add dashboard summary logic for finance overview`

Getestet wurde pro Block jeweils strukturell im Projekt:
- Validierungsregeln vorhanden und an Speichervorgaenge angebunden
- Berechnungsengine zentral definiert und von Rechnungs-/Budgetmodulen benutzt
- Statusregeln, Uebergaenge und Frontend-Anbindung vorhanden
- Audit-Felder und Historie werden beim Anlegen und Aktualisieren gesetzt
- Dashboard-Zusammenfassung ist zentral exportiert und in der Startseitenlogik eingebunden

## 1. Entitaeten

### 1. Kunde

Vorhanden:
- `public/customers.js`
- `public/costumers/clientService-browser.js`
- Firestore: `companies/{uid}/clients`

Felder im Code:
- `id`
- `nombre`
- `nif_nie_cif`
- `email`
- `telefono`
- `direccion_fiscal`
- `pais`
- `createdAt`
- `updatedAt`

Abweichende Feldnamen:
- Altbestand nutzt teilweise `fecha_creacion` statt `createdAt`
- Altbestand nutzt teilweise `name` oder `phone` statt `nombre` und `telefono`

### 2. Lieferant

Vorhanden:
- `public/providers.js`
- `public/costumers/providerService-browser.js`
- Firestore: `companies/{uid}/providers`

Felder im Code:
- `id`
- `nombre`
- `nif_nie_cif`
- `email`
- `telefono`
- `direccion_fiscal`
- `pais`
- `createdAt`
- `updatedAt`

Abweichende Feldnamen:
- Altbestand nutzt teilweise `fecha_creacion` statt `createdAt`

### 3. Werk

Nicht vorhanden.

Fehlt komplett im Code:
- Modell
- Collection
- Service
- UI-Bindung
- Beziehungen

### 4. Werkslinie

Nicht vorhanden.

Fehlt komplett im Code:
- Modell
- Collection
- Service
- UI-Bindung
- Beziehungen

### 5. Gast

Nicht vorhanden.

Fehlt komplett im Code:
- Modell
- Collection
- Service
- UI-Bindung
- Beziehungen

### 6. Voraussetzungen

Nicht als Entitaet vorhanden.

Moegliche technische Naeherungen:
- Regeln in `Firebase/firestore.rules`
- Validierungen in Services

Als fachliche Entitaet fehlt:
- eigenes Modell
- eigener Datenspeicher
- eigene Beziehung zu Rechnungen, Kunden, Lieferanten oder Werken

## 2. Weitere faktisch vorhandene Entitaeten

### Rechnung

Vorhanden in mehreren Varianten:
- einfache Rechnungen: `public/invoices.js`, `public/costumers/invoiceService-browser.js`, Firestore `companies/{uid}/invoices`
- ausgestellte Rechnungen: `public/Invoice-issued/invoice-issued.js`, `public/shared/store.js`, Firebase Sync `invoicesIssued`
- empfangene Rechnungen: `public/shared/store.js`, Firebase Sync `invoicesReceived`

Felder im Code, je nach Modul:
- `id`
- `numero` oder `invoiceNumber`
- `clientId`
- `providerId`
- `customer`
- `customerNif`
- `supplier`
- `supplierNif`
- `fecha` oder `invoiceDate`
- `dueDate`
- `total` oder `amount`
- `ivaRate`
- `ivaAmount`
- `totalAmount`
- `estado` oder `state`
- `descripcion` oder `description`
- `createdAt`
- `updatedAt`

Abweichende Feldnamen:
- `numero` vs `invoiceNumber`
- `fecha` vs `invoiceDate`
- `estado` vs `state`
- `total` vs `amount` / `totalAmount`

### Position

Nicht als eigene Hauptentitaet modelliert.

Vorhanden nur eingebettet:
- `invoice.lineas`
- `budget.items`

Felder im Code:
- `desc`
- `qty` oder `quantity`
- `unit` oder `price`
- `total`

### Presupuesto

Vorhanden:
- `public/budgetPage/script.js`
- `public/shared/store.js`
- Firebase Sync `budgets`

Felder im Code:
- `id`
- `number`
- `series`
- `date`
- `validity`
- `customer`
- `notes`
- `retention`
- `status`
- `tags`
- `items`
- `total`
- `createdAt`

Fehlend:
- `updatedAt`
- `customerId`

## 3. Pflichtfelder gegen den Code

Wichtig:
- Ich habe keine neuen fachlichen Felder erfunden.
- Ich habe nur die Felder notiert, die im Code tatsaechlich vorkommen.

Fehlende Hauptentitaeten:
- Werk
- Werkslinie
- Gast
- Voraussetzungen

Fehlende Kontrollfelder in Teilen des Systems:
- `updatedAt` fehlt in `store.js` fuer neue ausgestellte Rechnungen, empfangene Rechnungen, Ausgaben und Budgets
- `createdAt` und `updatedAt` sind nicht ueberall einheitlich benannt

Abweichende Feldnamen:
- Kunden/Lieferanten: `fecha_creacion` vs `createdAt`
- Rechnungen: `numero` vs `invoiceNumber`
- Rechnungen: `fecha` vs `invoiceDate`
- Rechnungen: `estado` vs `state`
- Rechnungen: `total` vs `amount` / `totalAmount`

## 4. Beziehungen

### Kunde ↔ Rechnungen

Teilweise vorhanden:
- einfache Rechnungen speichern `clientId`
- `InvoiceService.getInvoicesByClient(clientId)` existiert

Problem:
- `invoicesIssued` speichert oft `customer` und `customerNif` direkt statt nur `clientId`

### Lieferant ↔ Rechnungen

Teilweise vorhanden:
- einfache Rechnungen speichern `providerId`
- `InvoiceService.getInvoicesByProvider(providerId)` existiert

Problem:
- `invoicesReceived` speichert `supplier` und `supplierNif` direkt statt nur `providerId`

### Rechnung ↔ Positionen

Nicht sauber zentral modelliert.

Vorhanden nur als eingebettete Arrays:
- `invoice.lineas`
- `budget.items`

Problem:
- keine einheitliche Positionsstruktur
- keine zentrale Persistenzlogik fuer Positionen
- keine Pflichtpruefung fuer Rechnungen ohne Positionen in den betroffenen Modulen

### Lieferant ↔ Lieferanten

Nicht sinnvoll als Beziehung modelliert.

Befund:
- keine Selbstbeziehung vorhanden
- falls fachlich etwas anderes gemeint war, ist die Beziehung im Code nicht erkennbar

### Kunde ↔ Lieferanten

Nicht vorhanden.

Befund:
- keine Zuordnungstabelle
- keine Referenzliste
- keine many-to-many-Struktur

## 5. Doppelte Daten in Rechnungen

Schlechtes Design gefunden:
- `public/shared/store.js` speichert in `invoicesIssued` direkt `customer` und `customerNif`
- `public/shared/store.js` speichert in `invoicesReceived` direkt `supplier` und `supplierNif`
- `public/Invoice-issued/invoice-issued.js` fuellt diese doppelten Daten aktiv vor dem Speichern

Soll-Zustand:
- nur `clientId`
- nur `providerId`
- Anzeige von Namen/NIF erst zur Laufzeit ueber Lookup

Status:
- noch nicht vollstaendig korrigiert
- als Architekturproblem markiert

## 6. Beziehungen ueber IDs

Vorhanden:
- `clientId`
- `providerId`

Nicht gefunden:
- `factoriaId`

Befund:
- `factoriaId` fehlt komplett
- dadurch fehlt auch die Beziehung zu Werk/Werkslinie

## 7. Kontrolldaten

Vorhanden:
- `createdAt` in mehreren Bereichen
- `updatedAt` in Teilen von Firebase Sync und Auth-System

Korrigiert in dieser Runde:
- einfache Rechnungen erhalten `createdAt` und `updatedAt`
- Lieferanten erhalten `createdAt` und `updatedAt`

Noch offen:
- Vereinheitlichung alter Felder wie `fecha_creacion`
- `updatedAt` in `store.js` fuer alle relevanten Entitaeten

## 8. Backend-Validierungen

### Bereits vorhanden oder jetzt verbessert

- doppelte E-Mail-Adressen bei Kunden: vorhanden
- doppelte NIF bei Kunden: vorhanden
- doppelte E-Mail-Adressen bei Lieferanten: in dieser Runde hinzugefuegt
- doppelte NIF bei Lieferanten: in dieser Runde hinzugefuegt
- negative Betrage in einfacher Rechnung: in dieser Runde blockiert
- falsche Datumsangaben in einfacher Rechnung: in dieser Runde blockiert

### Noch offen oder unvollstaendig

- ungueltige USt-IdNr.: keine echte zentrale VAT-ID-Pruefung gefunden
- Rechnungen ohne Positionen: nicht zentral verhindert
- falsches Telefonnummernformat: nur teilweise auf UI-Ebene, nicht zentral fuer alle Entitaeten
- fehlerhafte Laenderangaben: fuer Kundenformular verbessert, aber nicht zentral fuer alle Module
- negative Betraege in `store.js` fuer `invoicesIssued`, `invoicesReceived`, `expenses`, `budgets`: nicht zentral verhindert

## 9. Berechnungen

Berechnungsorte gefunden:
- `public/Invoice-issued/invoice-issued.js`
- `public/budgetPage/script.js`
- teilweise abgeleitete Summen in `public/shared/store.js`
- VeriFactu-Module erwarten ebenfalls `ivaAmount` und `totalAmount`

Logik gefunden:
- Zwischensumme / line subtotal
- IVA / VAT
- Gesamtbetrag
- Rundung ueber `toFixed(2)` an mehreren Stellen

Probleme:
- Berechnung ist nicht zentral
- gleiche oder aehnliche Funktionen kommen mehrfach vor
- in `invoice-issued.js` existieren doppelte Funktionsdefinitionen fuer:
  - `calculateLineSubtotal`
  - `calculateTaxableAmount`
  - `calculateVAT`
  - `calculateInvoiceTotal`

Bewertung:
- zentrales Berechnungsmodul fehlt

## 10. Status

### Factory

Im Code nicht sauber als eigene Entitaet vorhanden.

Gefundene Statuswerte fuer Rechnungen:
- `pendiente`
- `pagada`
- `parcial`
- `Pendiente`
- `Pagada`
- `Vencida`

Geforderte Status:
- `free`
- `emit`
- `pagada`
- `vencida`

Befund:
- Statusmodell ist inkonsistent
- geforderte Factory-Status sind nicht einheitlich umgesetzt

### Presupuesto

Gefundene Statuswerte:
- `pending`
- `approved`
- `rejected`

Geforderte Status:
- `free`
- `enviado`
- `aceptado`
- `rechazado`

Befund:
- Statuswerte weichen ab

## 11. Statusuebergaenge

Problem:
- Statuswechsel erfolgen an mehreren Stellen direkt per UI oder Update
- keine zentrale Zustandsmaschine
- keine serverseitige Kontrolle erlaubter Uebergaenge

Bewertung:
- Fehler

## 12. Rueckverfolgbarkeit

Gefunden:
- `createdAt` an mehreren Stellen
- `updatedAt` teilweise

Nicht gefunden oder nicht konsistent:
- `createdBy`
- `updatedBy`
- `statusHistory`

Bewertung:
- Rueckverfolgbarkeit unvollstaendig

## 13. Dashboard-Unterstuetzung

Vorhanden in `public/shared/store.js`:
- Summen fuer ausgestellte Rechnungen
- Summen fuer empfangene Rechnungen
- Summen fuer Ausgaben
- Profit
- monatliche Kennzahlen
- Kategorien fuer Ausgaben

Teilweise vorhanden:
- Speicher-/Store-Eintraege: ja
- Cobro-Eintraege: nur indirekt ueber Rechnungsstatus und `paymentMethod`
- Pago-Eintraege: nur indirekt

Nicht erkennbar:
- Ausgaben von Kreativdokumenten als eigene fachliche Entitaet
- Produktionsdaten

## 14. Was fehlt

- Werk
- Werkslinie
- Gast
- Voraussetzungen als echte Entitaeten
- `factoriaId`
- zentrales Berechnungsmodul
- zentrale Statuslogik
- Statushistorie
- `createdBy`
- `updatedBy`
- saubere Positionsentitaet
- ID-only-Speicherung in `invoicesIssued` und `invoicesReceived`

## 15. Was korrigiert werden muss

### Kritisch

- Doppelte Stammdaten in Rechnungen entfernen
- Rechnungen nur ueber `clientId` und `providerId` verknuepfen
- Berechnungen zentralisieren
- Statusmodell vereinheitlichen

### Hoch

- `updatedAt` systemweit vereinheitlichen
- `createdAt`/`fecha_creacion` vereinheitlichen
- Pflichtpruefung fuer Rechnungspositionen ergaenzen
- VAT-/NIF-/Telefon-/Land-Pruefungen zentralisieren

### Mittel

- Budgets auf `customerId` umstellen
- Dashboard-Datenquellen fachlich sauber trennen

## 16. Bereits in dieser Runde umgesetzt

- Lieferanten-Duplikatpruefung fuer E-Mail und NIF in `public/costumers/providerService-browser.js`
- `createdAt` und `updatedAt` fuer Lieferanten in `public/costumers/providerService-browser.js`
- einfache Rechnungsvalidierung fuer Pflichtfelder, positive Betraege und gueltige Datumswerte in `public/costumers/invoiceService-browser.js`
- `createdAt` und `updatedAt` fuer einfache Rechnungen in `public/costumers/invoiceService-browser.js`
