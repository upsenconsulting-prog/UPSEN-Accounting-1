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

    body.dark {
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
      height: 100vh;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 1000;
      overflow-y: auto;
      transition: transform 0.3s ease;
    }

    /* Scrollbar */
    .sidebar::-webkit-scrollbar { width: 6px; }
    .sidebar::-webkit-scrollbar-track { background: var(--border); }
    .sidebar::-webkit-scrollbar-thumb { background: var(--muted); border-radius: 3px; }

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
    .sidebar-header i { color: var(--metric3-text); }

    .sidebar-menu { list-style: none; padding: 15px 0; margin: 0; }
    .sidebar-menu li { padding: 0 15px; margin-bottom: 5px; }

    .sidebar-link {
      color: var(--muted);
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 15px;
      border-radius: 8px;
      transition: all 0.2s ease;
      font-weight: 500;
      cursor: pointer;
    }
    .sidebar-link i { width: 24px; text-align: center; font-size: 1.1em; }
    .sidebar-link:hover { background: var(--border); color: var(--text); }

    .sidebar-menu li.active .sidebar-link {
      background: var(--metric3-bg);
      color: var(--metric3-text);
      font-weight: 600;
    }
    .sidebar-menu li.active .sidebar-link i { color: var(--metric3-text); }

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
      padding: 0;
      margin: 0 0 0 15px; /* Indentation */
      border-left: 2px solid var(--metric3-bg);
    }
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
        position: relative;
        border-right: none;
        border-bottom: 1px solid var(--border);
        overflow-y: visible;
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
      <i class="fas fa-chart-line"></i> FactuFácil
    </div>

    <ul class="sidebar-menu">
      <!-- C. Panel de Control -->
      <li data-page="frontPage.html">
        <a href="${pathPrefix}frontPage/frontPage.html" class="sidebar-link">
          <i class="fas fa-home"></i> Panel de Control
        </a>
      </li>

      <!-- D. Facturación (ACCORDION) -->
      <li data-page="invoice-issued.html">
  <a href="${pathPrefix}Invoice-issued/invoice-issued.html" class="sidebar-link">
    <i class="fas fa-file-export"></i> Facturas emitidas
  </a>
</li>

<li data-page="budget.html">
  <a href="${pathPrefix}budgetPage/budget.html" class="sidebar-link">
    <i class="fas fa-file-contract"></i> Presupuestos
  </a>
</li>

      <li data-page="Invoice_recieved.html">
        <a href="${pathPrefix}Invoice_recieved/Invoice_recieved.html" class="sidebar-link">
          <i class="fas fa-file-import"></i> Facturas recibidas
        </a>
      </li>
      <li data-page="expense.html">
        <a href="${pathPrefix}expense/expense.html" class="sidebar-link">
          <i class="fas fa-receipt"></i> Gastos
        </a>
      </li>

      <!-- E. Contabilidad -->
      <li class="sidebar-header-sm">Contabilidad</li>
      <li><a href="#" class="sidebar-link" style="opacity:0.6"><i class="fas fa-book"></i> Libros Registro</a></li>

      <!-- F. Impuestos -->
      <li class="sidebar-header-sm">Impuestos</li>
      <li><a href="#" class="sidebar-link" style="opacity:0.6"><i class="fas fa-university"></i> Modelos IVA/IRPF</a></li>
      <li><a href="#" class="sidebar-link" style="opacity:0.6"><i class="fas fa-qrcode"></i> Veri*Factu</a></li>

      <!-- G. Gestión -->
      <li class="sidebar-header-sm">Gestión</li>
      <li data-page="customers.html"><a href="${pathPrefix}customers.html" class="sidebar-link"><i class="fas fa-users"></i> Clientes</a></li>

      <!-- H. Configuración -->
      <li class="sidebar-header-sm">Configuración</li>
      <li data-page="profile.html"><a href="${pathPrefix}profile/profile.html" class="sidebar-link"><i class="fas fa-building"></i> Datos Empresa</a></li>
      <li data-page="settings.html"><a href="${pathPrefix}profile/settings.html" class="sidebar-link"><i class="fas fa-cog"></i> Plantillas</a></li>

      <li style="border-top: 1px solid var(--border); margin-top: 10px; padding-top: 10px;">
        <a href="javascript:void(0)" class="sidebar-link" id="btnLogout" style="color: var(--danger);">
          <i class="fas fa-sign-out-alt"></i> Cerrar sesión
        </a>
      </li>
    </ul>
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

    // Lógica de Ativação (Highlight da página atual)
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = sidebar.querySelectorAll('li[data-page]');
    let parentActive = false;

    links.forEach(li => {
      if (li.dataset.page === currentPage) {
        li.classList.add('active');
        // Se estiver dentro de um submenu, abrir o pai
        const submenu = li.closest('.sidebar-submenu');
        if (submenu) {
          submenu.classList.add('show');
          const parentLi = submenu.closest('.sidebar-parent');
          if (parentLi) parentLi.classList.add('open');
          parentActive = true;
        }
      }
    });

    // Event Listeners
    // Toggle Submenu
    const toggles = sidebar.querySelectorAll('.toggle-submenu');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', function(e) {
        e.preventDefault();
        const parent = this.closest('.sidebar-parent');
        const submenu = parent.querySelector('.sidebar-submenu');
        parent.classList.toggle('open');
        submenu.classList.toggle('show');
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
