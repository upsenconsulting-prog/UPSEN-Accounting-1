async function loadDashboard() {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      
      const received = await window.sumInvoicesReceivedMonth(y, m);
      const receivedCount = await window.countInvoicesReceivedMonth(y, m);
      const issued = await window.sumInvoicesIssuedMonth(y, m);
      const issuedCount = await window.countInvoicesIssuedMonth(y, m);
      const expenses = await window.sumExpensesMonth(y, m);
      const expensesCount = await window.countExpensesMonth(y, m);
      const budgets = await window.getBudgets();
      const budgetsTotal = budgets.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
      
      document.getElementById('receivedTotal').textContent = formatEUR(received);
      document.getElementById('receivedCount').textContent = receivedCount + ' este mes';
      document.getElementById('issuedTotal').textContent = formatEUR(issued);
      document.getElementById('issuedCount').textContent = issuedCount + ' este mes';
      document.getElementById('expensesTotal').textContent = formatEUR(expenses);
      document.getElementById('expensesCount').textContent = expensesCount + ' este mes';
      document.getElementById('budgetsTotal').textContent = formatEUR(budgetsTotal);
      document.getElementById('budgetsCount').textContent = budgets.length + ' total';
      
      const categories = await window.getExpensesByCategory(y, m);
      const ctx = document.getElementById('expensesChart').getContext('2d');
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(categories).length ? Object.keys(categories) : ['Sin datos'],
          datasets: [{
            data: Object.values(categories).length ? Object.values(categories) : [1],
            backgroundColor: ['#2a4d9c', '#3a6cd6', '#1abc9c', '#e74c3c', '#f39c12']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
      });
    }
    
    function formatEUR(n) {
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);
    }
    
    document.addEventListener('DOMContentLoaded', function() {
      AuthManager.init();
      if (!AuthManager.isLoggedIn()) {
        window.location.href = '../login.html';
        return;
      }
      loadDashboard();
      
      const currentPage = window.location.href;
      document.querySelectorAll('.sidebar-link').forEach(link => {
        link.parentElement.classList.remove('active');
        if (link.href === currentPage) link.parentElement.classList.add('active');
      });
    });

