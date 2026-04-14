/**
 * verifactu-hash.js
 * Sistema de Hash SHA-256 para Veri*Factu
 * Implementa a cadeia de hash para garantir integridade das faturas
 */

(function() {
  'use strict';

  // ========== CONFIGURAÇÃO ==========
  var CONFIG = {
    // Hash inicial (genesis block) - 64 zeros conforme SHA-256
    GENESIS_HASH: '0000000000000000000000000000000000000000000000000000000000000000',
    // Campos a incluir no hash (ordenados alfabeticamente)
    HASH_FIELDS: [
      'amount',
      'customerNif',
      'ivaAmount',
      'invoiceDate',
      'invoiceNumber',
      'series',
      'totalAmount'
    ]
  };

  // ========== HELPER FUNCTIONS ==========
  
  /**
   * Normalizar valor para string consistente
   */
  function normalizeValue(value) {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'number') {
      // Usar 2 casas decimais para valores monetários
      return Number(value).toFixed(2);
    }
    return String(value).trim();
  }

  /**
   * Canonicalizar dados da fatura para hash consistente
   * Ordena campos alfabeticamente e normaliza valores
   */
  function canonicalizeInvoice(invoice) {
    var canonical = {};
    
    CONFIG.HASH_FIELDS.forEach(function(field) {
      canonical[field] = normalizeValue(invoice[field]);
    });
    
    return canonical;
  }

  /**
   * Calcular SHA-256 de uma string
   * Usa Web Crypto API (nativo do browser)
   */
  async function sha256(message) {
    if (!message) {
      message = '';
    }
    
    var msgBuffer = new TextEncoder().encode(message);
    var hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    var hashHex = hashArray.map(function(b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
    
    return hashHex;
  }

  /**
   * Criar string para hash a partir dos dados canonicalizados
   */
  function createHashInput(invoice, previousHash) {
    var canonical = canonicalizeInvoice(invoice);
    var hashInput = JSON.stringify(canonical);
    
    // Na especificação Veri*Factu, o hash atual inclui o hash anterior
    // para criar a cadeia criptográfica
    if (previousHash) {
      hashInput = previousHash + '|' + hashInput;
    }
    
    return hashInput;
  }

  // ========== MAIN FUNCTIONS ==========

  /**
   * Calcular hash Veri*Factu para uma fatura
   * @param {Object} invoice - Dados da fatura
   * @param {string} previousHash - Hash da fatura anterior (opcional)
   * @returns {Promise<string>} - Hash SHA-256 em hex
   */
  async function calculateInvoiceHash(invoice, previousHash) {
    if (!invoice) {
      throw new Error('Invoice data is required');
    }
    
    var hashInput = createHashInput(invoice, previousHash || CONFIG.GENESIS_HASH);
    return await sha256(hashInput);
  }

  /**
   * Calcular hash para cadeia (inclui hash anterior)
   * @param {string} currentHash - Hash atual da fatura
   * @param {string} previousHash - Hash da fatura anterior
   * @returns {Promise<string>} - Hash encadeado
   */
  async function calculateChainHash(currentHash, previousHash) {
    var chainInput = (previousHash || CONFIG.GENESIS_HASH) + '|' + currentHash;
    return await sha256(chainInput);
  }

  /**
   * Verificar integridade de uma fatura
   * @param {Object} invoice - Fatura a verificar
   * @param {string} storedHash - Hash armazenado
   * @param {string} previousHash - Hash da fatura anterior
   * @returns {Promise<boolean>} - true se válido
   */
  async function verifyInvoiceIntegrity(invoice, storedHash, previousHash) {
    if (!invoice || !storedHash) {
      return false;
    }
    
    var calculatedHash = await calculateInvoiceHash(invoice, previousHash);
    return calculatedHash === storedHash;
  }

  /**
   * Obter o hash genesisinicial
   */
  function getGenesisHash() {
    return CONFIG.GENESIS_HASH;
  }

  /**
   * Validar formato do hash (64 caracteres hex)
   */
  function isValidHashFormat(hash) {
    if (!hash || typeof hash !== 'string') {
      return false;
    }
    return /^[a-f0-9]{64}$/.test(hash);
  }

  /**
   * Obter resumo do hash (primeiros 8 caracteres)
   */
  function getHashPreview(hash) {
    if (!hash) return '---------';
    return hash.substring(0, 8) + '...';
  }

  // ========== EXPORT TO WINDOW ==========
  window.VeriFactuHash = {
    calculateInvoiceHash: calculateInvoiceHash,
    calculateChainHash: calculateChainHash,
    verifyInvoiceIntegrity: verifyInvoiceIntegrity,
    canonicalizeInvoice: canonicalizeInvoice,
    sha256: sha256,
    getGenesisHash: getGenesisHash,
    isValidHashFormat: isValidHashFormat,
    getHashPreview: getHashPreview,
    CONFIG: CONFIG
  };

  console.log('✅ VeriFactu Hash service loaded');

})();

