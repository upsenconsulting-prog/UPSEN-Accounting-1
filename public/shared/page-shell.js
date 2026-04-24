(function() {
  'use strict';

  function normalizeSidebarPath(path) {
    return (path || '').replace(/\\/g, '/').toLowerCase();
  }

  function initSidebarNavigation() {
    const currentPath = normalizeSidebarPath(window.location.pathname);
    const links = Array.from(document.querySelectorAll('.sidebar a.sidebar-link[data-path]'));
    let bestLink = null;
    let bestScore = -1;

    links.forEach((link) => {
      const rawDataPath = link.getAttribute('data-path') || '';
      const candidates = rawDataPath.split(',').map((part) => normalizeSidebarPath(part.trim())).filter(Boolean);
      candidates.forEach((candidate) => {
        if (currentPath.includes(candidate) && candidate.length > bestScore) {
          bestLink = link;
          bestScore = candidate.length;
        }
      });
    });

    if (bestLink) {
      bestLink.classList.add('active');
      const item = bestLink.closest('li');
      if (item) item.classList.add('active');

      const submenu = bestLink.closest('.sidebar-submenu');
      if (submenu) {
        submenu.classList.add('open');
        const parent = submenu.closest('.sidebar-parent');
        if (parent) {
          parent.classList.add('open');
          const trigger = parent.querySelector('.sidebar-parent-trigger');
          if (trigger) trigger.setAttribute('aria-expanded', 'true');
        }
      }
    }

    document.querySelectorAll('.sidebar .sidebar-toggle').forEach((toggle) => {
      toggle.addEventListener('click', function() {
        const parent = toggle.closest('.sidebar-parent');
        const submenu = parent ? parent.querySelector('.sidebar-submenu') : null;
        if (!submenu) return;

        const willOpen = !submenu.classList.contains('open');
        parent.classList.toggle('open', willOpen);
        submenu.classList.toggle('open', willOpen);
        toggle.setAttribute('aria-expanded', String(willOpen));
      });
    });
  }

  function initBasicInteractions() {
    const brand = document.querySelector('.app-brand');
    if (brand) {
      brand.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.href = brand.getAttribute('href');
        }
      });
    }

    document.querySelectorAll('.clickable[role="button"]').forEach((el) => {
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      });
    });
  }

  function initPageShell() {
    initBasicInteractions();
    initSidebarNavigation();
  }

  window.PageShell = {
    initBasicInteractions: initBasicInteractions,
    initSidebarNavigation: initSidebarNavigation,
    initPageShell: initPageShell
  };

  document.addEventListener('DOMContentLoaded', function() {
    initPageShell();
  });
})();