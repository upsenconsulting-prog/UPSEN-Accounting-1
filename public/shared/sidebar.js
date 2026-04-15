/**
 * Shared Sidebar Component - UPSEN Accounting
 * Garante consistência visual e responsividade em todas as páginas
 */

(function() {
  'use strict';

  // Lógica de Prefixo: Detectar se estamos na raiz (public/) ou subpasta
  const pageName = window.location.pathname.split('/').pop() || 'index.html';
  const rootPages = ['customers.html', 'providers.html', 'invoices.html', 'index.html', 'login.html', 'migration.html', 'customers-backup.html'];
  const pathPrefix = rootPages.includes(pageName) ? './' : '../';
  const logoPath = `${pathPrefix}assets/logo-factufacil.png`;

  // 1. Estilos CSS (Copiados e adaptados do frontPage.html para garantir uniformidade)
  const styles = `
    :root {
      --bg: #F7F9FC;
      --text: #1F2937;
      --card-bg: #FFFFFF;
      --border: #E6EAF0;
      --muted: #6B7280;
      --metric1-bg: #e9f6ec;
      --metric1-text: #0f6c69;
      --metric2-bg: #fee8d9;
      --metric2-text: #b86313;
      --metric3-bg: #e2f1fd;
      --metric3-text: #0958b2;
      --metric4-bg: #e9e4fb;
      --metric4-text: #314057;
      --danger: #e74c3c;
    }

    body.dark,
    body.theme-dark {
      --bg: #0F172A;
      --text: #F1F5F9;
      --card-bg: #1E293B;
      --border: #334155;
      --muted: #94A3B8;
      --metric3-bg: #1E3A8A;
      --metric3-text: #93C5FD;
      --danger: #ef4444;
    }

    /* Layout Base para Responsividade */
    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg);
      color: var(--text);
      margin: 0;
      min-height: 100vh;
      display: flex; /* Flex layout para sidebar + content */
      flex-direction: row;
      overflow-x: hidden;
    }

    /* Sidebar Styles */
    .sidebar {
      width: 260px;
      background: var(--card-bg);
      border-right: 1px solid var(--border);
      color: var(--text);
      min-height: 100vh;
      height: 100vh;
      max-height: 100vh;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 1000;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.3s ease;
    }

    .sidebar-content {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      scrollbar-gutter: stable;
    }

    /* Scrollbar */
    .sidebar-content::-webkit-scrollbar { width: 6px; }
    .sidebar-content::-webkit-scrollbar-track { background: var(--border); }
    .sidebar-content::-webkit-scrollbar-thumb { background: var(--muted); border-radius: 3px; }

    .sidebar-header {
      padding: 30px 20px;
      font-size: 1.4em;
      font-weight: 700;
      text-align: center;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .app-brand {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      text-decoration: none;
      color: var(--text);
      cursor: pointer;
      user-select: none;
    }
    .app-brand:hover {
      opacity: 0.92;
    }
    .app-logo {
      width: min(190px, 100%);
      height: auto;
      object-fit: contain;
      object-position: center;
      display: block;
      border-radius: 0;
    }
    .app-brand-text {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1;
      color: var(--text);
    }

    .sidebar-menu { list-style: none; padding: 15px 0; margin: 0; }
    .sidebar-menu li { padding: 0 15px; margin-bottom: 6px; }

    .sidebar-link {
      color: var(--muted);
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      justify-content: flex-start;
      padding: 12px 15px;
      border-radius: 8px;
      transition: all 0.2s ease;
      font-weight: 500;
      cursor: pointer;
      min-width: 0;
    }

    .sidebar-toggle {
      border: 0;
      background: transparent;
      font: inherit;
      text-align: left;
    }
    .sidebar-link i { width: 24px; text-align: center; font-size: 1.1em; }
    .sidebar-link:hover { background: var(--border); color: var(--text); }

    .sidebar-menu li.active > .sidebar-link,
    .sidebar-link.active {
      background: var(--metric3-bg);
      color: var(--metric3-text);
      font-weight: 600;
    }
    .sidebar-menu li.active > .sidebar-link i,
    .sidebar-link.active i { color: var(--metric3-text); }
    .sidebar-link-disabled {
      color: var(--muted);
      cursor: default;
      opacity: 0.95;
    }
    .sidebar-link-disabled:hover {
      background: transparent;
      color: var(--muted);
    }

    a,
    button,
    [role="button"],
    input[type="button"],
    input[type="submit"],
    input[type="reset"],
    summary,
    select,
    .clickable,
    .sidebar-link,
    .sidebar-toggle,
    .menu-item,
    .card-action,
    .icon-button,
    .menu-link {
      cursor: pointer;
    }

    body,
    p,
    span,
    div,
    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
    label,
    td,
    th {
      cursor: default;
    }

    h1.clickable,
    h2.clickable,
    h3.clickable,
    h4.clickable,
    h5.clickable,
    h6.clickable,
    div.clickable,
    span.clickable {
      cursor: pointer;
    }

    .section-title.clickable {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: opacity 0.2s ease;
    }

    .section-title.clickable:hover {
      opacity: 0.85;
    }

    .dashboard-card.clickable {
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .dashboard-card.clickable:hover {
      transform: translateY(-1px);
    }

    .app-brand,
    .section-title.clickable,
    .dashboard-card.clickable,
    .sidebar-link,
    .sidebar-toggle,
    .btn,
    button,
    a {
      user-select: none;
    }

    .sidebar-link-disabled,
    .sidebar-link-disabled:hover,
    [aria-disabled="true"],
    button:disabled,
    .btn:disabled,
    [disabled] {
      cursor: default !important;
    }

    .sidebar-header-sm {
      padding: 12px 20px;
      font-size: 0.85em;
      font-weight: 600;
      color: var(--metric3-text);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border);
      margin: 0 15px 10px 15px;
    }

    /* Submenus */
    .sidebar-parent { position: relative; }
    .sidebar-parent-arrow { margin-left: auto !important; transition: transform 0.2s ease; }
    .sidebar-parent.open .sidebar-parent-arrow { transform: rotate(90deg); }
    .sidebar-submenu {
      display: none;
      list-style: none;
      padding: 0 0 0 12px;
      margin: 4px 0 8px 18px;
      border-left: 2px solid var(--metric3-bg);
      width: calc(100% - 18px);
    }
    .sidebar-submenu li { padding: 0; margin-bottom: 4px; }
    .sidebar-submenu .sidebar-link {
      padding: 10px 12px;
      font-size: 0.95em;
    }
    .sidebar-submenu.open,
    .sidebar-submenu.show { display: block; }

    /* Main Content Adjustments */
    .main-content {
      margin-left: 260px; /* Largura da sidebar */
      width: calc(100% - 260px);
      padding: 32px;
      min-height: 100vh;
      transition: margin-left 0.3s ease, width 0.3s ease;
    }

    /* Responsividade (Mobile) */
    @media (max-width: 992px) {
      body { flex-direction: column; }
      
      .sidebar {
        width: 100%;
        height: auto;
        max-height: none;
        position: relative;
        border-right: none;
        border-bottom: 1px solid var(--border);
        overflow: visible;
      }

      .sidebar-content {
        max-height: 60vh;
      }
      
      .main-content {
        margin-left: 0;
        width: 100%;
        padding: 20px;
      }

      /* Opcional: Colapsar menu no mobile se desejar, mas o design atual é empilhado */
    }
  `;

  // 2. Estrutura HTML da Sidebar (Centralizada)
  // Usa ${pathPrefix} para ajustar os links dinamicamente
  const sidebarHTML = `
    <div class="sidebar-header">
      <a href="${pathPrefix}frontPage/frontPage.html" class="app-brand clickable" aria-label="Ir al Dashboard">
        <img src="${logoPath}" alt="FactuFácil" class="app-logo">
      </a>
    </div>

    <div class="sidebar-content">
      <ul class="sidebar-menu">
      <li>
        <a href="${pathPrefix}frontPage/frontPage.html" class="sidebar-link" data-path="/frontpage/frontpage.html">
          <i class="fas fa-home"></i> Dashboard
        </a>
      </li>

      <li class="sidebar-parent" id="facturacionParent">
        <button type="button" class="sidebar-link sidebar-toggle" aria-expanded="false" aria-controls="facturacionSubmenu">
          <i class="fas fa-file-invoice-dollar"></i> Facturación
          <i class="fas fa-chevron-right sidebar-parent-arrow"></i>
        </button>
        <ul class="sidebar-menu sidebar-submenu" id="facturacionSubmenu">
          <li>
            <a href="${pathPrefix}Invoice-issued/invoice-issued.html" class="sidebar-link" data-path="/invoice-issued/invoice-issued.html">
              <i class="fas fa-file-export"></i> Facturas emitidas
            </a>
          </li>
          <li>
            <a href="${pathPrefix}Invoice_recieved/Invoice_recieved.html" class="sidebar-link" data-path="/invoice_recieved/invoice_recieved.html,/invoice_received/invoice_recieved.html">
              <i class="fas fa-file-import"></i> Facturas recibidas
            </a>
          </li>
          <li>
            <a href="${pathPrefix}budgetPage/budget.html" class="sidebar-link" data-path="/budgetpage/budget.html">
              <i class="fas fa-file-contract"></i> Presupuestos
            </a>
          </li>
        </ul>
      </li>
      <li>
        <a href="${pathPrefix}expense/expense.html" class="sidebar-link" data-path="/expense/expense.html">
          <i class="fas fa-receipt"></i> Gastos
        </a>
      </li>
      <li><a href="${pathPrefix}customers.html" class="sidebar-link" data-path="/customers.html,/providers.html,/invoices.html"><i class="fas fa-users"></i> Clientes y Proveedores</a></li>
      <li><a href="javascript:void(0)" class="sidebar-link sidebar-link-disabled"><i class="fas fa-cash-register"></i> Tesorería</a></li>
      <li><a href="javascript:void(0)" class="sidebar-link sidebar-link-disabled"><i class="fas fa-university"></i> Impuestos</a></li>

      <li class="sidebar-parent" id="configuracionParent">
        <button type="button" class="sidebar-link sidebar-toggle" aria-expanded="false" aria-controls="configuracionSubmenu">
          <i class="fas fa-cog"></i> Configuración
          <i class="fas fa-chevron-right sidebar-parent-arrow"></i>
        </button>
        <ul class="sidebar-menu sidebar-submenu" id="configuracionSubmenu">
          <li><a href="${pathPrefix}profile/settings.html" class="sidebar-link" data-path="/profile/settings.html"><i class="fas fa-building"></i> Datos de empresa</a></li>
          <li><a href="${pathPrefix}profile/settings.html" class="sidebar-link" data-path="/profile/settings.html"><i class="fas fa-image"></i> Logo y plantillas</a></li>
          <li><a href="${pathPrefix}profile/profile.html" class="sidebar-link" data-path="/profile/profile.html"><i class="fas fa-user"></i> Cuenta</a></li>
        </ul>
      </li>

      <li><a href="javascript:void(0)" class="sidebar-link sidebar-link-disabled"><i class="fas fa-qrcode"></i> VeriFactu</a></li>

      <li style="border-top: 1px solid var(--border); margin-top: 10px; padding-top: 10px;">
        <a href="javascript:void(0)" class="sidebar-link" id="btnLogout" style="color: var(--danger);">
          <i class="fas fa-sign-out-alt"></i> Cerrar sesión
        </a>
      </li>
    </ul>
    </div>
  `;

  // 3. Função de Inicialização
  function initSidebar() {
    // Injetar CSS
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Encontrar ou Criar Elemento Sidebar
    let sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
      // Se não existir, criar e inserir no início do body
      sidebar = document.createElement('aside');
      sidebar.className = 'sidebar';
      document.body.insertBefore(sidebar, document.body.firstChild);
    }

    // Injetar HTML
    sidebar.innerHTML = sidebarHTML;

    function normalizePath(path) {
      return (path || '').replace(/\\/g, '/').toLowerCase();
    }

    const currentPath = normalizePath(window.location.pathname);
    const linkNodes = Array.from(sidebar.querySelectorAll('a.sidebar-link[data-path]'));
    let bestLink = null;
    let bestScore = -1;

    linkNodes.forEach(link => {
      const rawDataPath = link.getAttribute('data-path') || '';
      const candidates = rawDataPath
        .split(',')
        .map(item => normalizePath(item.trim()))
        .filter(Boolean);

      candidates.forEach(candidate => {
        if (currentPath.includes(candidate) && candidate.length > bestScore) {
          bestLink = link;
          bestScore = candidate.length;
        }
      });
    });

    if (bestLink) {
      bestLink.classList.add('active');
      const bestLi = bestLink.closest('li');
      if (bestLi) bestLi.classList.add('active');

      const submenu = bestLink.closest('.sidebar-submenu');
      if (submenu) {
        submenu.classList.add('open');
        const parentLi = submenu.closest('.sidebar-parent');
        if (parentLi) {
          parentLi.classList.add('open');
          const toggle = parentLi.querySelector('.sidebar-toggle');
          if (toggle) toggle.setAttribute('aria-expanded', 'true');
        }
      }
    }

    // Event Listeners
    const brand = sidebar.querySelector('.app-brand');
    if (brand) {
      brand.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.href = brand.getAttribute('href');
        }
      });
    }

    document.querySelectorAll('.clickable[role="button"]').forEach(el => {
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      });
    });

    // Toggle Submenu
    const toggles = sidebar.querySelectorAll('.sidebar-toggle');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', function(e) {
        e.preventDefault();
        const parent = this.closest('.sidebar-parent');
        const submenu = parent.querySelector('.sidebar-submenu');
        const willOpen = !submenu.classList.contains('open');
        parent.classList.toggle('open', willOpen);
        submenu.classList.toggle('open', willOpen);
        this.setAttribute('aria-expanded', String(willOpen));
      });
    });

    // Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', function() {
        if (confirm('¿Cerrar sesión?')) {
          // Limpar storages
          localStorage.removeItem('upsen_current_user');
          
          // Firebase Signout
          if (window.firebaseAuth) {
            window.firebaseAuth.signOut().catch(console.error);
          }
          
          // AuthService Logout
          if (window.AuthService && window.AuthService.logout) {
            window.AuthService.logout().then(() => {
              window.location.href = pathPrefix + 'login.html';
            });
          } else {
            window.location.href = pathPrefix + 'login.html';
          }
        }
      });
    }

    // Fix para Main Content se necessário
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) {
      // Tenta encontrar container principal e adicionar classe se faltar
      const container = document.querySelector('.container-fluid') || document.querySelector('main');
      if (container) container.classList.add('main-content');
    }
  }

  // Executar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebar);
  } else {
    initSidebar();
  }

})();
