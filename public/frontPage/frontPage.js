// Login functionality
document.getElementById('loginBtn').addEventListener('click', function() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  if (email && password) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
  } else {
    alert('Por favor ingresa email y contraseña');
  }
});

// User menu functionality
document.getElementById('userMenuBtn').addEventListener('click', function() {
  document.getElementById('userDropdown').classList.toggle('show');
});

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', function() {
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('userDropdown').classList.remove('show');
});

// Close dropdown when clicking outside
window.addEventListener('click', function(e) {
  if (!e.target.matches('#userMenuBtn')) {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown.classList.contains('show')) {
      dropdown.classList.remove('show');
    }
  }
});

// Accordion functionality
document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', () => {
    const content = header.nextElementSibling;
    content.classList.toggle("open");
  });
});

// Comments toggle - functionality implemented
document.getElementById('toggleComments').addEventListener('click', function() {
  var content = document.getElementById('commentsContent');
  var toggle = document.getElementById('toggleComments');
  
  content.classList.toggle('show');
  toggle.classList.toggle('expanded');
  
  var span = toggle.querySelector('span:not(.toggle-icon)');
  if (span) {
    span.textContent = content.classList.contains('show') ? 'Ocultar comentarios' : 'Mostrar comentarios';
  }
  
  var icon = toggle.querySelector('.toggle-icon');
  if (icon) {
    icon.textContent = content.classList.contains('show') ? '×' : '+';
  }
});

// Refresh button
document.getElementById('refreshBtn').addEventListener('click', function() {
  location.reload();
});

// SIMPLER Sidebar link handling - Opens pages in same tab
document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    
    // Skip internal links (starting with #)
    if (href.startsWith('#')) {
      return;
    }
    
    e.preventDefault();
    // Open the page in same tab
    window.location.href = href;
  });
});

// Auto-login for testing (remove in production)
window.addEventListener('load', function() {
  // Auto-fill for easier testing
  document.getElementById('email').value = 'test@example.com';
  document.getElementById('password').value = '123456';
});

