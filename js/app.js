/* ============================================
   UPlan Finance Tracker — Application Logic
   SPA Router, Data Store, Page Renderers
   Updated: edit goals, edit limit, mobile nav
   ============================================ */

// =============================================
// DATA STORE
// =============================================
const DEFAULT_DATA = {
  user: {
    name: 'Andy',
    avatar: 'A',
    monthlyIncome: 4800000,
  },
  budget: {
    dailyLimit: 160000,
    todaySpent: 115000,
  },
  qris: {
    streakDays: 3,
    dailyTapLimit: 5,
    todayTaps: 2,
    weeklyTaps: [3, 5, 2, 4, 6, 2, 2],
    totalTapsThisWeek: 23,
    lastWeekTaps: 16,
  },
  transactions: [
    { id: 1, name: 'Morning Latte', merchant: 'Kopi Kenangan', category: 'coffee', amount: 28000, type: 'expense', date: '2026-06-08T08:45:00', isQRIS: true, isImpulse: true },
    { id: 2, name: 'Lunch Special', merchant: 'Warung Nasi', category: 'food', amount: 45000, type: 'expense', date: '2026-06-08T12:30:00', isQRIS: true, isImpulse: false },
    { id: 3, name: 'Mini Keychain', merchant: 'Miniso', category: 'shopping', amount: 15000, type: 'expense', date: '2026-06-07T19:15:00', isQRIS: true, isImpulse: true },
    { id: 4, name: 'Ride to Work', merchant: 'Gojek', category: 'transport', amount: 12000, type: 'expense', date: '2026-06-07T08:00:00', isQRIS: true, isImpulse: false },
    { id: 5, name: 'Iced Americano', merchant: 'Fore Coffee', category: 'coffee', amount: 22000, type: 'expense', date: '2026-06-07T15:30:00', isQRIS: true, isImpulse: true },
    { id: 6, name: 'Grocery Run', merchant: 'Alfamart', category: 'shopping', amount: 87000, type: 'expense', date: '2026-06-06T18:00:00', isQRIS: true, isImpulse: false },
    { id: 7, name: 'Movie Tickets', merchant: 'CGV', category: 'entertainment', amount: 70000, type: 'expense', date: '2026-06-06T20:00:00', isQRIS: false, isImpulse: false },
    { id: 8, name: 'Protein Shake', merchant: 'GymBro', category: 'health', amount: 35000, type: 'expense', date: '2026-06-06T07:00:00', isQRIS: true, isImpulse: false },
    { id: 9, name: 'Electric Bill', merchant: 'PLN', category: 'bills', amount: 350000, type: 'expense', date: '2026-06-05T10:00:00', isQRIS: false, isImpulse: false },
    { id: 10, name: 'Snack Attack', merchant: 'Indomaret', category: 'food', amount: 18000, type: 'expense', date: '2026-06-05T16:00:00', isQRIS: true, isImpulse: true },
    { id: 11, name: 'Top Up GoPay', merchant: 'Bank BCA', category: 'topup', amount: 500000, type: 'income', date: '2026-06-05T09:00:00', isQRIS: false, isImpulse: false },
    { id: 12, name: 'Bubble Tea', merchant: 'Chatime', category: 'coffee', amount: 32000, type: 'expense', date: '2026-06-04T14:30:00', isQRIS: true, isImpulse: true },
    { id: 13, name: 'Grab Ride', merchant: 'Grab', category: 'transport', amount: 25000, type: 'expense', date: '2026-06-04T08:15:00', isQRIS: true, isImpulse: false },
    { id: 14, name: 'Phone Case', merchant: 'Shopee', category: 'shopping', amount: 45000, type: 'expense', date: '2026-06-03T21:00:00', isQRIS: false, isImpulse: true },
    { id: 15, name: 'Nasi Padang', merchant: 'Sederhana', category: 'food', amount: 38000, type: 'expense', date: '2026-06-03T12:00:00', isQRIS: true, isImpulse: false },
  ],
  goals: [
    { id: 1, name: 'New Headphones', description: 'Sony WH-1000XM5', icon: '🎧', target: 5400000, saved: 2100000, color: 'pink' },
    { id: 2, name: 'Weekend Trip', description: 'Bali 3D2N', icon: '✈️', target: 3000000, saved: 750000, color: 'cyan' },
    { id: 3, name: 'Emergency Fund', description: '3 bulan gaji', icon: '🛡️', target: 15000000, saved: 4200000, color: 'green' },
  ],
  settings: {
    notifications: true,
    darkMode: true,
    qrisAlerts: true,
    impulseThreshold: 50000,
    spendingTriggers: ['qris', 'card'],
  }
};

// Load from localStorage or use defaults
let AppData;
try {
  const saved = localStorage.getItem('uplan_data');
  AppData = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_DATA));
} catch (e) {
  AppData = JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function saveData() {
  try {
    localStorage.setItem('uplan_data', JSON.stringify(AppData));
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
}

// =============================================
// UTILITIES
// =============================================
function formatRupiah(num) {
  return 'Rp' + Math.abs(num).toLocaleString('id-ID');
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const dayMs = 86400000;

  if (diff < dayMs && date.getDate() === now.getDate()) {
    return 'Today, ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } else if (diff < 2 * dayMs) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate()) {
      return 'Yesterday, ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  }
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ', ' +
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getCategoryIcon(category) {
  const icons = {
    food: 'fa-utensils',
    coffee: 'fa-mug-hot',
    transport: 'fa-car',
    shopping: 'fa-bag-shopping',
    bills: 'fa-file-invoice',
    health: 'fa-heart-pulse',
    entertainment: 'fa-film',
    topup: 'fa-wallet',
  };
  return icons[category] || 'fa-circle';
}

function getBudgetRemaining() {
  return AppData.budget.dailyLimit - AppData.budget.todaySpent;
}

function getBudgetPercent() {
  return Math.min((AppData.budget.todaySpent / AppData.budget.dailyLimit) * 100, 100);
}

function getImpulseTransactions() {
  return AppData.transactions.filter(t => t.isImpulse && t.type === 'expense');
}

function getTotalSaved() {
  return AppData.goals.reduce((sum, g) => sum + g.saved, 0);
}

function getCategoryTotals() {
  const totals = {};
  AppData.transactions.filter(t => t.type === 'expense').forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });
  return totals;
}

// =============================================
// ROUTER
// =============================================
const pages = {
  dashboard: { title: 'Dashboard', render: renderDashboard },
  qris: { title: 'QRIS Tracker', render: renderQRIS },
  transactions: { title: 'Transactions', render: renderTransactions },
  goals: { title: 'Goals', render: renderGoals },
  insights: { title: 'Insights', render: renderInsights },
  settings: { title: 'Settings', render: renderSettings },
};

let currentPage = 'dashboard';
let chartInstances = [];

function destroyCharts() {
  chartInstances.forEach(c => { try { c.destroy(); } catch(e) {} });
  chartInstances = [];
}

function navigate(page) {
  if (!pages[page]) page = 'dashboard';
  currentPage = page;

  // Update sidebar nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Update bottom nav active state
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Update page title
  document.getElementById('pageTitle').textContent = pages[page].title;

  // Update sidebar budget text
  const remaining = getBudgetRemaining();
  document.getElementById('sidebarBudgetText').textContent =
    `Daily Budget: ${formatRupiah(remaining)} left`;

  // Destroy old charts
  destroyCharts();

  // Render page
  const content = document.getElementById('pageContent');
  content.innerHTML = pages[page].render();

  // Scroll to top
  content.scrollTop = 0;
  window.scrollTo(0, 0);

  // Post-render hooks
  requestAnimationFrame(() => {
    if (page === 'dashboard') initDashboardCharts();
    if (page === 'qris') initQRISCharts();
    if (page === 'insights') initInsightsCharts();
    bindPageEvents(page);
  });

  // Close mobile sidebar
  closeMobileSidebar();

  // Update URL hash
  if (window.location.hash !== '#' + page) {
    history.pushState(null, '', '#' + page);
  }
}

function bindPageEvents(page) {
  if (page === 'transactions') {
    const searchInput = document.getElementById('trxSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterTransactions(e.target.value);
      });
    }
    document.querySelectorAll('.chip[data-cat]').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.chip[data-cat]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        filterTransactions(document.getElementById('trxSearch')?.value || '', chip.dataset.cat);
      });
    });
  }

  if (page === 'settings') {
    document.querySelectorAll('.toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        const key = toggle.dataset.setting;
        if (key && AppData.settings.hasOwnProperty(key)) {
          AppData.settings[key] = toggle.classList.contains('active');
          saveData();
        }
      });
    });
  }

  if (page === 'goals') {
    const addGoalCard = document.getElementById('addGoalCard');
    if (addGoalCard) {
      addGoalCard.addEventListener('click', () => openAddGoalModal());
    }
  }

  if (page === 'dashboard') {
    const scanCard = document.getElementById('dashScanCard');
    if (scanCard) {
      scanCard.addEventListener('click', () => openScanModal());
    }
  }
}

// =============================================
// PAGE: DASHBOARD
// =============================================
function renderDashboard() {
  const remaining = getBudgetRemaining();
  const spent = AppData.budget.todaySpent;
  const limit = AppData.budget.dailyLimit;
  const pct = getBudgetPercent();
  const progressClass = pct > 85 ? 'warning' : 'cyan';

  const recentTx = AppData.transactions.slice(0, 4);
  const streak = AppData.qris.streakDays;
  const goal = AppData.goals[0];
  const goalPct = goal ? Math.round((goal.saved / goal.target) * 100) : 0;

  return `
    <div class="dashboard-grid">
      <!-- Today's Limit -->
      <div class="card card-daily-limit animate-in">
        <div class="limit-header">
          <div class="card-title">TODAY'S LIMIT</div>
          <button class="btn-edit" onclick="openEditLimitModal()">
            <i class="fas fa-pen"></i> Edit Limit
          </button>
        </div>
        <div class="limit-amount">
          <span class="currency">Rp</span><span class="value">${Math.abs(remaining).toLocaleString('id-ID')}</span>
          <span class="label">${remaining >= 0 ? 'left' : 'over!'}</span>
        </div>
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill ${progressClass}" style="width: ${pct}%"></div>
          </div>
          <div class="progress-labels">
            <span>Spent: ${formatRupiah(spent)}</span>
            <span>Daily Target: ${formatRupiah(limit)}</span>
          </div>
        </div>
      </div>

      <!-- Streak -->
      <div class="card card-streak animate-in animate-in-delay-1">
        <div class="streak-icon">
          <i class="fas fa-fire-flame-curved"></i>
        </div>
        <div class="streak-count">${streak} Days Streak</div>
        <div class="streak-text">You're staying under target like a boss! Keep the momentum.</div>
        <div class="streak-dots">
          ${[1,2,3,4,5,6,7].map(d => `<div class="streak-dot ${d <= streak ? 'active' : ''}"></div>`).join('')}
        </div>
      </div>

      <!-- Quick Scan -->
      <div class="card card-scan animate-in animate-in-delay-2" id="dashScanCard">
        <div class="scan-icon">
          <i class="fas fa-camera-retro"></i>
        </div>
        <div class="scan-title">Quick Scan QRIS</div>
        <div class="scan-subtitle">Drag & drop or upload your screenshot</div>
      </div>

      <!-- Goals Preview -->
      <div class="card card-goals animate-in animate-in-delay-3">
        ${goal ? `
          <div class="goal-header">
            <div>
              <div class="goal-name">${goal.name}</div>
              <div class="goal-sub">${goal.description}</div>
            </div>
            <div class="goal-badge">Goal: ${formatRupiah(goal.target)}</div>
          </div>
          <div class="goal-amount">${formatRupiah(goal.saved)}</div>
          <div class="goal-progress-row">
            <div class="progress-bar">
              <div class="progress-fill gradient" style="width: ${goalPct}%"></div>
            </div>
            <div class="goal-percent">${goalPct}% complete</div>
          </div>
          <div style="margin-top:var(--gap-md);display:flex;gap:var(--gap-sm)">
            <button class="btn-edit" onclick="openContributeGoalModal(${goal.id})"><i class="fas fa-plus"></i> Add Funds</button>
            <button class="btn-edit" onclick="openEditGoalModal(${goal.id})"><i class="fas fa-pen"></i> Edit</button>
          </div>
        ` : '<div class="empty-state"><i class="fas fa-bullseye"></i><p>No goals yet</p></div>'}
      </div>

      <!-- Recent Activity -->
      <div class="card card-activity animate-in animate-in-delay-4">
        <div class="activity-header">
          <h3>Recent Activity</h3>
          <a href="#transactions" class="view-all" onclick="event.preventDefault();navigate('transactions')">View All <i class="fas fa-arrow-right"></i></a>
        </div>
        <div class="activity-list">
          ${recentTx.map(tx => renderActivityItem(tx)).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderActivityItem(tx) {
  const iconClass = getCategoryIcon(tx.category);
  const isExpense = tx.type === 'expense';
  return `
    <div class="activity-item">
      <div class="activity-icon ${tx.category}">
        <i class="fas ${iconClass}"></i>
      </div>
      <div class="activity-info">
        <div class="activity-name">
          ${tx.name}
          ${tx.isImpulse ? '<span class="badge badge-impulse"><i class="fas fa-exclamation"></i> Impulse!</span>' : ''}
        </div>
        <div class="activity-meta">${tx.merchant} • ${formatDate(tx.date)}</div>
      </div>
      <div class="activity-amount ${isExpense ? 'expense' : 'income'}">
        ${isExpense ? '-' : '+'} ${formatRupiah(tx.amount)}
      </div>
    </div>
  `;
}

function initDashboardCharts() {
  // No chart instances here — dashboard uses progress bars
}

// =============================================
// PAGE: QRIS TRACKER
// =============================================
function renderQRIS() {
  const { todayTaps, dailyTapLimit, weeklyTaps, totalTapsThisWeek, lastWeekTaps, streakDays } = AppData.qris;
  const weekChange = totalTapsThisWeek - lastWeekTaps;
  const weekChangePct = lastWeekTaps > 0 ? Math.round((weekChange / lastWeekTaps) * 100) : 0;

  const heatmapData = [];
  for (let i = 0; i < 28; i++) {
    const taps = Math.floor(Math.random() * 7);
    let level = '';
    if (taps === 0) level = '';
    else if (taps <= 2) level = 'level-1';
    else if (taps <= 4) level = 'level-2';
    else if (taps <= 5) level = 'level-3';
    else if (taps <= dailyTapLimit) level = 'level-4';
    else level = 'over';
    heatmapData.push(level);
  }

  const merchantCounts = {};
  AppData.transactions.filter(t => t.isQRIS).forEach(t => {
    merchantCounts[t.merchant] = (merchantCounts[t.merchant] || 0) + 1;
  });
  const topMerchants = Object.entries(merchantCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return `
    <div class="stats-grid animate-in">
      <div class="stat-card">
        <div class="stat-label">Today's Taps</div>
        <div class="stat-value cyan">${todayTaps}</div>
        <div class="stat-change ${todayTaps <= dailyTapLimit ? 'down' : 'up'}">
          <i class="fas fa-${todayTaps <= dailyTapLimit ? 'check-circle' : 'exclamation-circle'}"></i>
          ${todayTaps <= dailyTapLimit ? `${dailyTapLimit - todayTaps} taps remaining` : 'Over limit!'}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">This Week</div>
        <div class="stat-value pink">${totalTapsThisWeek}x</div>
        <div class="stat-change ${weekChange > 0 ? 'up' : 'down'}">
          <i class="fas fa-arrow-${weekChange > 0 ? 'up' : 'down'}"></i>
          ${weekChange > 0 ? '+' : ''}${weekChangePct}% from last week
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">QRIS Streak</div>
        <div class="stat-value green">${streakDays} days</div>
        <div class="stat-change down">
          <i class="fas fa-fire"></i> Under daily limit
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Daily Limit</div>
        <div class="stat-value yellow">${dailyTapLimit}x</div>
        <div class="stat-change" style="color: var(--text-muted)">
          <i class="fas fa-sliders"></i> Max taps per day
        </div>
      </div>
    </div>

    <div class="qris-hero">
      <div class="tap-counter-card animate-in animate-in-delay-1">
        <div class="tap-label">TODAY'S TAP COUNT</div>
        <div class="tap-number">${todayTaps}</div>
        <div class="tap-limit">Limit: ${dailyTapLimit} taps / day</div>
        <div class="progress-container mt-md">
          <div class="progress-bar">
            <div class="progress-fill ${todayTaps > dailyTapLimit ? 'warning' : 'cyan'}" style="width: ${Math.min((todayTaps / dailyTapLimit) * 100, 100)}%"></div>
          </div>
        </div>
      </div>

      <div class="tap-counter-card animate-in animate-in-delay-2">
        <div class="tap-label" style="margin-bottom: 12px;">ACTIVITY HEATMAP (Last 28 days)</div>
        <div style="display: flex; gap: 4px; margin-bottom: 8px; padding-left: 2px;">
          ${['M','T','W','T','F','S','S'].map(d => `<div style="flex:1;text-align:center;font-size:0.65rem;color:var(--text-muted)">${d}</div>`).join('')}
        </div>
        <div class="calendar-heatmap">
          ${heatmapData.map(level => `<div class="heatmap-cell ${level}"></div>`).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:12px;justify-content:center">
          <span style="font-size:0.7rem;color:var(--text-muted)">Less</span>
          <div class="heatmap-cell" style="width:14px;height:14px;display:inline-block"></div>
          <div class="heatmap-cell level-1" style="width:14px;height:14px;display:inline-block"></div>
          <div class="heatmap-cell level-2" style="width:14px;height:14px;display:inline-block"></div>
          <div class="heatmap-cell level-3" style="width:14px;height:14px;display:inline-block"></div>
          <div class="heatmap-cell level-4" style="width:14px;height:14px;display:inline-block"></div>
          <span style="font-size:0.7rem;color:var(--text-muted)">More</span>
        </div>
      </div>
    </div>

    <div class="two-col">
      <div class="card animate-in animate-in-delay-3">
        <div class="card-title">WEEKLY TAP FREQUENCY</div>
        <div class="chart-wrapper">
          <canvas id="qrisWeeklyChart"></canvas>
        </div>
      </div>

      <div class="card animate-in animate-in-delay-4">
        <div class="card-title mb-md">TOP MERCHANTS BY QRIS</div>
        <div class="merchant-list">
          ${topMerchants.map(([name, count], i) => `
            <div class="merchant-item">
              <div class="merchant-rank">#${i + 1}</div>
              <div class="merchant-name">${name}</div>
              <div class="merchant-count">${count}x tap</div>
            </div>
          `).join('')}
          ${topMerchants.length === 0 ? '<div class="empty-state"><p>No QRIS transactions yet</p></div>' : ''}
        </div>
      </div>
    </div>
  `;
}

function initQRISCharts() {
  const ctx = document.getElementById('qrisWeeklyChart');
  if (!ctx) return;

  const chart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'QRIS Taps',
        data: AppData.qris.weeklyTaps,
        backgroundColor: AppData.qris.weeklyTaps.map(v =>
          v > AppData.qris.dailyTapLimit
            ? 'rgba(239, 68, 68, 0.7)'
            : 'rgba(0, 229, 255, 0.5)'
        ),
        borderColor: AppData.qris.weeklyTaps.map(v =>
          v > AppData.qris.dailyTapLimit ? '#EF4444' : '#00E5FF'
        ),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1C1C1F',
          titleColor: '#fff',
          bodyColor: '#9CA3AF',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#6B7280', font: { family: 'Inter', weight: 500 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#6B7280', font: { family: 'Inter' }, stepSize: 1 },
          beginAtZero: true,
        }
      }
    }
  });
  chartInstances.push(chart);
}

// =============================================
// PAGE: TRANSACTIONS
// =============================================
function renderTransactions() {
  const categories = ['all', 'food', 'coffee', 'transport', 'shopping', 'bills', 'health', 'entertainment'];
  const catLabels = { all: 'Semua', food: 'Makanan', coffee: 'Kopi', transport: 'Transport', shopping: 'Belanja', bills: 'Tagihan', health: 'Kesehatan', entertainment: 'Hiburan' };

  const impulseCount = getImpulseTransactions().length;
  const totalImpulse = getImpulseTransactions().reduce((s, t) => s + t.amount, 0);

  return `
    ${impulseCount > 0 ? `
      <div class="impulse-alert animate-in">
        <i class="fas fa-triangle-exclamation"></i>
        <div>
          <strong>${impulseCount} impulse transactions</strong> detected — Total: ${formatRupiah(totalImpulse)} in small purchases under ${formatRupiah(AppData.settings.impulseThreshold)}
        </div>
      </div>
    ` : ''}

    <div class="search-bar animate-in animate-in-delay-1">
      <i class="fas fa-magnifying-glass"></i>
      <input type="text" id="trxSearch" placeholder="Search transactions..." autocomplete="off">
    </div>

    <div class="filter-chips animate-in animate-in-delay-2">
      ${categories.map(cat => `
        <button class="chip ${cat === 'all' ? 'active' : ''}" data-cat="${cat}">${catLabels[cat]}</button>
      `).join('')}
    </div>

    <div class="activity-list animate-in animate-in-delay-3" id="transactionsList">
      ${AppData.transactions.map(tx => renderActivityItem(tx)).join('')}
    </div>
  `;
}

function filterTransactions(query, category = 'all') {
  const list = document.getElementById('transactionsList');
  if (!list) return;

  // If no explicit category passed, check which chip is active
  if (category === 'all') {
    const activeChip = document.querySelector('.chip.active[data-cat]');
    if (activeChip) category = activeChip.dataset.cat;
  }

  let filtered = AppData.transactions;

  if (category && category !== 'all') {
    filtered = filtered.filter(t => t.category === category);
  }

  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.merchant.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }

  list.innerHTML = filtered.length > 0
    ? filtered.map(tx => renderActivityItem(tx)).join('')
    : '<div class="empty-state"><i class="fas fa-search"></i><p>No transactions found</p></div>';
}

// =============================================
// PAGE: GOALS (with Edit & Delete)
// =============================================
function renderGoals() {
  const totalSaved = getTotalSaved();
  const dailySavings = Math.max(getBudgetRemaining(), 0);

  return `
    <div class="savings-banner animate-in">
      <div>
        <div class="savings-label">Daily Savings Today</div>
        <div class="savings-amount">${formatRupiah(dailySavings)}</div>
      </div>
      <div style="flex:1"></div>
      <div>
        <div class="savings-label">Total Saved</div>
        <div class="savings-amount">${formatRupiah(totalSaved)}</div>
      </div>
    </div>

    <div class="goals-grid">
      ${AppData.goals.map(goal => {
        const pct = Math.round((goal.saved / goal.target) * 100);
        const colorClass = goal.color === 'pink' ? 'pink' : goal.color === 'cyan' ? 'cyan' : 'gradient';
        return `
          <div class="goal-card animate-in">
            <div class="goal-card-top">
              <div class="goal-card-icon" style="background: var(--${goal.color === 'pink' ? 'primary' : goal.color === 'cyan' ? 'accent' : 'success'}-subtle)">
                <span style="font-size:1.5rem">${goal.icon}</span>
              </div>
              <div class="goal-card-actions">
                <button class="btn-edit" onclick="openContributeGoalModal(${goal.id})" title="Add funds">
                  <i class="fas fa-plus"></i> Add
                </button>
                <button class="btn-edit" onclick="openEditGoalModal(${goal.id})" title="Edit goal">
                  <i class="fas fa-pen"></i>
                </button>
                <button class="btn-edit" onclick="deleteGoal(${goal.id})" title="Delete goal" style="color:var(--danger)">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            <div class="goal-card-name">${goal.name}</div>
            <div class="goal-card-target">${goal.description} — Target: ${formatRupiah(goal.target)}</div>
            <div class="goal-card-amount">${formatRupiah(goal.saved)}</div>
            <div class="goal-progress-row">
              <div class="progress-bar">
                <div class="progress-fill ${colorClass}" style="width: ${Math.min(pct, 100)}%"></div>
              </div>
              <div class="goal-percent">${pct}%</div>
            </div>
          </div>
        `;
      }).join('')}

      <div class="add-goal-card goal-card" id="addGoalCard">
        <i class="fas fa-plus-circle"></i>
        <div class="font-semibold">Add New Goal</div>
      </div>
    </div>
  `;
}

// =============================================
// PAGE: INSIGHTS
// =============================================
function renderInsights() {
  const catTotals = getCategoryTotals();
  const totalExpense = Object.values(catTotals).reduce((s, v) => s + v, 0);

  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  const topCatPct = topCat ? Math.round((topCat[1] / totalExpense) * 100) : 0;

  const catLabels = { food: 'Makanan', coffee: 'Kopi', transport: 'Transport', shopping: 'Belanja', bills: 'Tagihan', health: 'Kesehatan', entertainment: 'Hiburan', topup: 'Top Up' };

  let personality = { emoji: '🤔', type: 'Balanced Spender', desc: 'Pengeluaranmu cukup seimbang di semua kategori.' };
  if (topCat) {
    if (topCat[0] === 'food' || topCat[0] === 'coffee') {
      personality = { emoji: '🍔', type: 'Foodie Impulsif', desc: `${topCatPct}% pengeluaranmu ke ${catLabels[topCat[0]] || topCat[0]}. Kamu paling boros di hari Jumat malam dan weekend. Coba batasi jajan ke 3x sehari!` };
    } else if (topCat[0] === 'shopping') {
      personality = { emoji: '🛍️', type: 'Shopaholic Explorer', desc: `${topCatPct}% budget habis untuk belanja. Kamu sering checkout di malam hari. Coba pakai wishlist 24 jam sebelum beli!` };
    } else if (topCat[0] === 'transport') {
      personality = { emoji: '🚗', type: 'Urban Commuter', desc: `${topCatPct}% pengeluaran ke transport. Coba combine trips atau pakai transport publik untuk hemat!` };
    } else if (topCat[0] === 'entertainment') {
      personality = { emoji: '🎬', type: 'Experience Seeker', desc: `${topCatPct}% budget untuk hiburan. Kamu hidup untuk experience! Coba cari promo atau diskon member.` };
    }
  }

  const impulseTotal = getImpulseTransactions().reduce((s, t) => s + t.amount, 0);
  const impulsePct = totalExpense > 0 ? Math.round((impulseTotal / totalExpense) * 100) : 0;

  const daySpending = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  AppData.transactions.filter(t => t.type === 'expense').forEach(t => {
    const day = new Date(t.date).getDay();
    daySpending[day] += t.amount;
  });
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const peakDay = Object.entries(daySpending).sort((a, b) => b[1] - a[1])[0];

  const qrisExpenses = AppData.transactions.filter(t => t.isQRIS && t.type === 'expense').length;
  const allExpenses = AppData.transactions.filter(t => t.type === 'expense').length;
  const qrisPct = allExpenses > 0 ? Math.round((qrisExpenses / allExpenses) * 100) : 0;

  return `
    <div class="personality-card animate-in">
      <div class="personality-emoji">${personality.emoji}</div>
      <div class="personality-type">${personality.type}</div>
      <div class="personality-desc">${personality.desc}</div>
    </div>

    <div class="stats-grid animate-in animate-in-delay-1">
      <div class="stat-card">
        <div class="stat-label">Total Spending</div>
        <div class="stat-value pink">${formatRupiah(totalExpense)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Impulse Spending</div>
        <div class="stat-value" style="color: var(--danger)">${impulsePct}%</div>
        <div class="stat-change up">${formatRupiah(impulseTotal)} in impulse buys</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Peak Spending Day</div>
        <div class="stat-value cyan">${peakDay ? dayNames[peakDay[0]] : '-'}</div>
        <div class="stat-change" style="color:var(--text-muted)">${peakDay ? formatRupiah(peakDay[1]) : ''}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">QRIS vs Non-QRIS</div>
        <div class="stat-value green">${qrisPct}%</div>
        <div class="stat-change" style="color:var(--text-muted)">Transactions via QRIS</div>
      </div>
    </div>

    <div class="insights-grid animate-in animate-in-delay-2">
      <div class="card">
        <div class="card-title mb-md">SPENDING BY CATEGORY</div>
        <div class="chart-wrapper" style="max-height:280px">
          <canvas id="categoryChart"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-title mb-md">SPENDING BY DAY</div>
        <div class="chart-wrapper" style="max-height:280px">
          <canvas id="dayChart"></canvas>
        </div>
      </div>
    </div>
  `;
}

function initInsightsCharts() {
  const catTotals = getCategoryTotals();
  const catLabelsMap = { food: 'Makanan', coffee: 'Kopi', transport: 'Transport', shopping: 'Belanja', bills: 'Tagihan', health: 'Kesehatan', entertainment: 'Hiburan', topup: 'Top Up' };
  const catColors = {
    food: '#FF6B35', coffee: '#A88264', transport: '#6366F1', shopping: '#EC4899',
    bills: '#F59E0B', health: '#10B981', entertainment: '#8B5CF6', topup: '#00E5FF'
  };

  const catCtx = document.getElementById('categoryChart');
  if (catCtx) {
    const chart = new Chart(catCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(catTotals).map(k => catLabelsMap[k] || k),
        datasets: [{
          data: Object.values(catTotals),
          backgroundColor: Object.keys(catTotals).map(k => catColors[k] || '#6B7280'),
          borderColor: '#161618',
          borderWidth: 3,
          hoverOffset: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#9CA3AF', font: { family: 'Inter', size: 11 }, padding: 16, usePointStyle: true, pointStyleWidth: 8 }
          },
          tooltip: {
            backgroundColor: '#1C1C1F', titleColor: '#fff', bodyColor: '#9CA3AF',
            borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, cornerRadius: 8, padding: 12,
            callbacks: { label: (ctx) => ` ${ctx.label}: ${formatRupiah(ctx.raw)}` }
          }
        }
      }
    });
    chartInstances.push(chart);
  }

  const daySpending = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  AppData.transactions.filter(t => t.type === 'expense').forEach(t => {
    daySpending[new Date(t.date).getDay()] += t.amount;
  });

  const dayCtx = document.getElementById('dayChart');
  if (dayCtx) {
    const dayData = [0,1,2,3,4,5,6].map(d => daySpending[d]);
    const maxDay = Math.max(...dayData);

    const chart = new Chart(dayCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [{
          label: 'Spending',
          data: dayData,
          backgroundColor: dayData.map(v => v === maxDay ? 'rgba(255, 0, 213, 0.6)' : 'rgba(0, 229, 255, 0.3)'),
          borderColor: dayData.map(v => v === maxDay ? '#FF00D5' : '#00E5FF'),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1C1C1F', titleColor: '#fff', bodyColor: '#9CA3AF',
            borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, cornerRadius: 8, padding: 12,
            callbacks: { label: (ctx) => ` ${formatRupiah(ctx.raw)}` }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#6B7280', font: { family: 'Inter', weight: 600 } } },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#6B7280', font: { family: 'Inter' }, callback: (v) => 'Rp' + (v / 1000) + 'k' },
            beginAtZero: true,
          }
        }
      }
    });
    chartInstances.push(chart);
  }
}

// =============================================
// PAGE: SETTINGS (with editable values)
// =============================================
function renderSettings() {
  const { user, budget, settings } = AppData;

  return `
    <div style="max-width: 640px;">
      <!-- Profile -->
      <div class="settings-section animate-in">
        <div class="settings-section-title">Profile</div>
        <div class="card" style="display:flex;align-items:center;gap:var(--gap-lg);padding:var(--gap-lg);flex-wrap:wrap">
          <div class="avatar" style="width:64px;height:64px;font-size:1.5rem">${user.avatar}</div>
          <div style="flex:1;min-width:120px">
            <h3 style="font-size:1.1rem;font-weight:700">${user.name}</h3>
            <p style="font-size:0.82rem;color:var(--text-muted)">Member since June 2026</p>
          </div>
          <button class="btn-secondary btn-sm" onclick="openEditProfileModal()">Edit Profile</button>
        </div>
      </div>

      <!-- Budget Settings -->
      <div class="settings-section animate-in animate-in-delay-1">
        <div class="settings-section-title">Budget</div>
        <div class="card">
          <div class="setting-row">
            <div class="setting-info">
              <h4>Monthly Income</h4>
              <p>Your total monthly income</p>
            </div>
            <div class="setting-value-group">
              <span style="font-weight:700;color:var(--accent)">${formatRupiah(user.monthlyIncome)}</span>
              <button class="btn-edit" onclick="openEditSettingModal('monthlyIncome', 'Monthly Income', ${user.monthlyIncome})"><i class="fas fa-pen"></i></button>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <h4>Daily Limit</h4>
              <p>Maximum spending per day</p>
            </div>
            <div class="setting-value-group">
              <span style="font-weight:700;color:var(--primary)">${formatRupiah(budget.dailyLimit)}</span>
              <button class="btn-edit" onclick="openEditLimitModal()"><i class="fas fa-pen"></i></button>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <h4>QRIS Tap Limit</h4>
              <p>Maximum QRIS transactions per day</p>
            </div>
            <div class="setting-value-group">
              <span style="font-weight:700;color:var(--warning)">${AppData.qris.dailyTapLimit}x / day</span>
              <button class="btn-edit" onclick="openEditSettingModal('tapLimit', 'QRIS Tap Limit', ${AppData.qris.dailyTapLimit})"><i class="fas fa-pen"></i></button>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <h4>Impulse Threshold</h4>
              <p>Flag transactions below this amount</p>
            </div>
            <div class="setting-value-group">
              <span style="font-weight:700;color:var(--danger)">${formatRupiah(settings.impulseThreshold)}</span>
              <button class="btn-edit" onclick="openEditSettingModal('impulseThreshold', 'Impulse Threshold', ${settings.impulseThreshold})"><i class="fas fa-pen"></i></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Notification Settings -->
      <div class="settings-section animate-in animate-in-delay-2">
        <div class="settings-section-title">Notifications</div>
        <div class="card">
          <div class="setting-row">
            <div class="setting-info">
              <h4>Push Notifications</h4>
              <p>Reminder after lunch & dinner</p>
            </div>
            <div class="toggle ${settings.notifications ? 'active' : ''}" data-setting="notifications"></div>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <h4>QRIS Alerts</h4>
              <p>Alert when exceeding tap limit</p>
            </div>
            <div class="toggle ${settings.qrisAlerts ? 'active' : ''}" data-setting="qrisAlerts"></div>
          </div>
        </div>
      </div>

      <!-- Spending Triggers -->
      <div class="settings-section animate-in animate-in-delay-3">
        <div class="settings-section-title">Spending Triggers</div>
        <div class="filter-chips">
          ${['qris', 'card', 'cash'].map(trigger => `
            <button class="chip ${settings.spendingTriggers.includes(trigger) ? 'active' : ''}" onclick="toggleTrigger('${trigger}', this)">
              <i class="fas fa-${trigger === 'qris' ? 'qrcode' : trigger === 'card' ? 'credit-card' : 'money-bill'}"></i>&nbsp;
              ${trigger === 'qris' ? 'QRIS' : trigger === 'card' ? 'Kartu' : 'Tunai'}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="settings-section animate-in animate-in-delay-4">
        <div class="settings-section-title">Data</div>
        <div class="card">
          <div class="setting-row">
            <div class="setting-info">
              <h4>Reset All Data</h4>
              <p>Clear all transactions and settings</p>
            </div>
            <button class="btn-danger btn-sm" onclick="resetData()"><i class="fas fa-trash"></i> Reset</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// =============================================
// MODALS
// =============================================
function openModal(html) {
  const overlay = document.getElementById('modalOverlay');
  const container = document.getElementById('modalContainer');
  container.innerHTML = html;
  overlay.classList.add('show');
  // Focus first input
  requestAnimationFrame(() => {
    const firstInput = container.querySelector('input:not([type=hidden])');
    if (firstInput) firstInput.focus();
  });
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}

// --- Scan Modal ---
function openScanModal() {
  openModal(`
    <div class="modal-header">
      <h3>📷 Scan QRIS Screenshot</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="card-scan" style="border-radius:var(--radius-lg);min-height:160px;margin-bottom:var(--gap-lg)">
        <div class="scan-icon"><i class="fas fa-cloud-arrow-up"></i></div>
        <div class="scan-title">Drop QRIS screenshot here</div>
        <div class="scan-subtitle">or click to browse files</div>
      </div>
      <p style="font-size:0.82rem;color:var(--text-muted);text-align:center">
        We'll automatically extract merchant name and amount from your QRIS receipt screenshot.
      </p>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="simulateScan()">
        <i class="fas fa-magic"></i>&nbsp; Simulate Scan
      </button>
    </div>
  `);
}

// --- Add Transaction Modal ---
function openAddTransactionModal() {
  openModal(`
    <div class="modal-header">
      <h3>➕ Add Transaction</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Transaction Name</label>
        <input type="text" id="txName" placeholder="e.g., Kopi Kenangan">
      </div>
      <div class="form-group">
        <label>Merchant</label>
        <input type="text" id="txMerchant" placeholder="e.g., Kopi Kenangan">
      </div>
      <div class="form-group">
        <label>Amount (Rp)</label>
        <input type="number" id="txAmount" placeholder="25000" inputmode="numeric">
      </div>
      <div class="form-group">
        <label>Category</label>
        <select id="txCategory">
          <option value="food">Makanan</option>
          <option value="coffee">Kopi</option>
          <option value="transport">Transport</option>
          <option value="shopping">Belanja</option>
          <option value="bills">Tagihan</option>
          <option value="health">Kesehatan</option>
          <option value="entertainment">Hiburan</option>
        </select>
      </div>
      <div class="form-group" style="display:flex;align-items:center;gap:var(--gap-md)">
        <label style="margin:0">QRIS Payment?</label>
        <div class="toggle active" id="txQRIS"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="addTransaction()">
        <i class="fas fa-plus"></i>&nbsp; Add
      </button>
    </div>
  `);

  document.getElementById('txQRIS')?.addEventListener('click', function() {
    this.classList.toggle('active');
  });
}

// --- Add Goal Modal ---
function openAddGoalModal() {
  openModal(`
    <div class="modal-header">
      <h3>🎯 Add New Goal</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Goal Name</label>
        <input type="text" id="goalName" placeholder="e.g., New MacBook">
      </div>
      <div class="form-group">
        <label>Description</label>
        <input type="text" id="goalDesc" placeholder="e.g., MacBook Air M4">
      </div>
      <div class="form-group">
        <label>Target Amount (Rp)</label>
        <input type="number" id="goalTarget" placeholder="15000000" inputmode="numeric">
      </div>
      <div class="form-group">
        <label>Icon (emoji)</label>
        <input type="text" id="goalIcon" placeholder="💻" value="🎯" maxlength="4">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="addGoal()">
        <i class="fas fa-plus"></i>&nbsp; Create Goal
      </button>
    </div>
  `);
}

// --- Edit Goal Modal ---
function openEditGoalModal(goalId) {
  const goal = AppData.goals.find(g => g.id === goalId);
  if (!goal) return;

  openModal(`
    <div class="modal-header">
      <h3>✏️ Edit Goal</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Goal Name</label>
        <input type="text" id="editGoalName" value="${goal.name}">
      </div>
      <div class="form-group">
        <label>Description</label>
        <input type="text" id="editGoalDesc" value="${goal.description}">
      </div>
      <div class="form-group">
        <label>Target Amount (Rp)</label>
        <input type="number" id="editGoalTarget" value="${goal.target}" inputmode="numeric">
      </div>
      <div class="form-group">
        <label>Amount Saved (Rp)</label>
        <input type="number" id="editGoalSaved" value="${goal.saved}" inputmode="numeric">
      </div>
      <div class="form-group">
        <label>Icon (emoji)</label>
        <input type="text" id="editGoalIcon" value="${goal.icon}" maxlength="4">
      </div>
      <input type="hidden" id="editGoalId" value="${goal.id}">
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="updateGoal()">
        <i class="fas fa-check"></i>&nbsp; Save Changes
      </button>
    </div>
  `);
}

// --- Contribute to Goal Modal ---
function openContributeGoalModal(goalId) {
  const goal = AppData.goals.find(g => g.id === goalId);
  if (!goal) return;

  const pct = Math.round((goal.saved / goal.target) * 100);
  const remaining = goal.target - goal.saved;

  openModal(`
    <div class="modal-header">
      <h3>${goal.icon} Add Funds to ${goal.name}</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div style="text-align:center;margin-bottom:var(--gap-lg)">
        <div style="font-size:0.82rem;color:var(--text-muted)">Current Progress</div>
        <div style="font-size:1.8rem;font-weight:800;color:var(--primary)">${formatRupiah(goal.saved)}</div>
        <div class="progress-container" style="margin:var(--gap-sm) 0">
          <div class="progress-bar">
            <div class="progress-fill gradient" style="width:${Math.min(pct,100)}%"></div>
          </div>
        </div>
        <div style="font-size:0.78rem;color:var(--text-muted)">${pct}% — ${formatRupiah(remaining)} remaining</div>
      </div>
      <div class="form-group">
        <label>Amount to Add (Rp)</label>
        <input type="number" id="contributeAmount" placeholder="100000" inputmode="numeric">
      </div>
      <div style="display:flex;gap:var(--gap-sm);flex-wrap:wrap;margin-bottom:var(--gap-md)">
        <button class="chip" onclick="document.getElementById('contributeAmount').value='25000'">Rp25K</button>
        <button class="chip" onclick="document.getElementById('contributeAmount').value='50000'">Rp50K</button>
        <button class="chip" onclick="document.getElementById('contributeAmount').value='100000'">Rp100K</button>
        <button class="chip" onclick="document.getElementById('contributeAmount').value='250000'">Rp250K</button>
        <button class="chip" onclick="document.getElementById('contributeAmount').value='500000'">Rp500K</button>
      </div>
      <input type="hidden" id="contributeGoalId" value="${goal.id}">
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="contributeToGoal()">
        <i class="fas fa-piggy-bank"></i>&nbsp; Add Funds
      </button>
    </div>
  `);
}

// --- Edit Daily Limit Modal ---
function openEditLimitModal() {
  openModal(`
    <div class="modal-header">
      <h3>💰 Edit Daily Limit</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div style="text-align:center;margin-bottom:var(--gap-lg)">
        <div style="font-size:0.82rem;color:var(--text-muted)">Current Daily Limit</div>
        <div style="font-size:2rem;font-weight:800;color:var(--primary)">${formatRupiah(AppData.budget.dailyLimit)}</div>
      </div>
      <div class="form-group">
        <label>New Daily Limit (Rp)</label>
        <input type="number" id="newDailyLimit" value="${AppData.budget.dailyLimit}" inputmode="numeric">
      </div>
      <div style="display:flex;gap:var(--gap-sm);flex-wrap:wrap;margin-bottom:var(--gap-md)">
        <button class="chip" onclick="document.getElementById('newDailyLimit').value='100000'">Rp100K</button>
        <button class="chip" onclick="document.getElementById('newDailyLimit').value='150000'">Rp150K</button>
        <button class="chip" onclick="document.getElementById('newDailyLimit').value='200000'">Rp200K</button>
        <button class="chip" onclick="document.getElementById('newDailyLimit').value='250000'">Rp250K</button>
        <button class="chip" onclick="document.getElementById('newDailyLimit').value='300000'">Rp300K</button>
      </div>
      <p style="font-size:0.78rem;color:var(--text-muted)">
        💡 Recommended: ${formatRupiah(Math.round(AppData.user.monthlyIncome / 30))} /day based on your monthly income.
      </p>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="updateDailyLimit()">
        <i class="fas fa-check"></i>&nbsp; Save Limit
      </button>
    </div>
  `);
}

// --- Edit Setting Modal (generic) ---
function openEditSettingModal(field, label, currentValue) {
  openModal(`
    <div class="modal-header">
      <h3>✏️ Edit ${label}</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>${label}</label>
        <input type="number" id="editSettingValue" value="${currentValue}" inputmode="numeric">
      </div>
      <input type="hidden" id="editSettingField" value="${field}">
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="updateSettingValue()">
        <i class="fas fa-check"></i>&nbsp; Save
      </button>
    </div>
  `);
}

// --- Edit Profile Modal ---
function openEditProfileModal() {
  openModal(`
    <div class="modal-header">
      <h3>👤 Edit Profile</h3>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="editProfileName" value="${AppData.user.name}">
      </div>
      <div class="form-group">
        <label>Avatar Initial</label>
        <input type="text" id="editProfileAvatar" value="${AppData.user.avatar}" maxlength="2">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="updateProfile()">
        <i class="fas fa-check"></i>&nbsp; Save
      </button>
    </div>
  `);
}

// =============================================
// ACTIONS
// =============================================

// --- Add Transaction ---
function addTransaction() {
  const name = document.getElementById('txName')?.value?.trim();
  const merchant = document.getElementById('txMerchant')?.value?.trim();
  const amount = parseInt(document.getElementById('txAmount')?.value) || 0;
  const category = document.getElementById('txCategory')?.value || 'food';
  const isQRIS = document.getElementById('txQRIS')?.classList.contains('active');

  if (!name || amount <= 0) {
    alert('Please fill in name and amount!');
    return;
  }

  const isImpulse = amount < AppData.settings.impulseThreshold;

  AppData.transactions.unshift({
    id: Date.now(),
    name,
    merchant: merchant || 'Unknown',
    category,
    amount,
    type: 'expense',
    date: new Date().toISOString(),
    isQRIS,
    isImpulse,
  });

  AppData.budget.todaySpent += amount;

  if (isQRIS) {
    AppData.qris.todayTaps++;
    AppData.qris.totalTapsThisWeek++;
  }

  if (AppData.qris.todayTaps > AppData.qris.dailyTapLimit) {
    AppData.qris.streakDays = 0;
  }

  saveData();
  closeModal();
  navigate(currentPage);
}

// --- Add Goal ---
function addGoal() {
  const name = document.getElementById('goalName')?.value?.trim();
  const description = document.getElementById('goalDesc')?.value?.trim();
  const target = parseInt(document.getElementById('goalTarget')?.value) || 0;
  const icon = document.getElementById('goalIcon')?.value || '🎯';

  if (!name || target <= 0) {
    alert('Please fill in name and target!');
    return;
  }

  const colors = ['pink', 'cyan', 'green'];
  AppData.goals.push({
    id: Date.now(),
    name,
    description: description || '',
    icon,
    target,
    saved: 0,
    color: colors[AppData.goals.length % colors.length],
  });

  saveData();
  closeModal();
  navigate('goals');
}

// --- Update Goal ---
function updateGoal() {
  const id = parseInt(document.getElementById('editGoalId')?.value);
  const goal = AppData.goals.find(g => g.id === id);
  if (!goal) return;

  const name = document.getElementById('editGoalName')?.value?.trim();
  const description = document.getElementById('editGoalDesc')?.value?.trim();
  const target = parseInt(document.getElementById('editGoalTarget')?.value) || goal.target;
  const saved = parseInt(document.getElementById('editGoalSaved')?.value) || 0;
  const icon = document.getElementById('editGoalIcon')?.value || goal.icon;

  if (!name) {
    alert('Goal name cannot be empty!');
    return;
  }

  goal.name = name;
  goal.description = description || '';
  goal.target = target;
  goal.saved = Math.min(saved, target);
  goal.icon = icon;

  saveData();
  closeModal();
  navigate(currentPage);
}

// --- Delete Goal ---
function deleteGoal(goalId) {
  const goal = AppData.goals.find(g => g.id === goalId);
  if (!goal) return;

  if (confirm(`Delete goal "${goal.name}"? This cannot be undone.`)) {
    AppData.goals = AppData.goals.filter(g => g.id !== goalId);
    saveData();
    navigate(currentPage);
  }
}

// --- Contribute to Goal ---
function contributeToGoal() {
  const id = parseInt(document.getElementById('contributeGoalId')?.value);
  const amount = parseInt(document.getElementById('contributeAmount')?.value) || 0;
  const goal = AppData.goals.find(g => g.id === id);

  if (!goal || amount <= 0) {
    alert('Please enter a valid amount!');
    return;
  }

  goal.saved = Math.min(goal.saved + amount, goal.target);

  saveData();
  closeModal();

  if (goal.saved >= goal.target) {
    setTimeout(() => alert(`🎉 Congratulations! You've reached your goal "${goal.name}"!`), 300);
  }

  navigate(currentPage);
}

// --- Update Daily Limit ---
function updateDailyLimit() {
  const newLimit = parseInt(document.getElementById('newDailyLimit')?.value) || 0;

  if (newLimit <= 0) {
    alert('Daily limit must be greater than 0!');
    return;
  }

  AppData.budget.dailyLimit = newLimit;
  saveData();
  closeModal();
  navigate(currentPage);
}

// --- Update Setting Value ---
function updateSettingValue() {
  const field = document.getElementById('editSettingField')?.value;
  const value = parseInt(document.getElementById('editSettingValue')?.value) || 0;

  if (value <= 0) {
    alert('Value must be greater than 0!');
    return;
  }

  switch (field) {
    case 'monthlyIncome':
      AppData.user.monthlyIncome = value;
      break;
    case 'tapLimit':
      AppData.qris.dailyTapLimit = value;
      break;
    case 'impulseThreshold':
      AppData.settings.impulseThreshold = value;
      // Re-evaluate impulse flags
      AppData.transactions.forEach(t => {
        if (t.type === 'expense') {
          t.isImpulse = t.amount < value;
        }
      });
      break;
  }

  saveData();
  closeModal();
  navigate(currentPage);
}

// --- Update Profile ---
function updateProfile() {
  const name = document.getElementById('editProfileName')?.value?.trim();
  const avatar = document.getElementById('editProfileAvatar')?.value?.trim();

  if (!name) {
    alert('Name cannot be empty!');
    return;
  }

  AppData.user.name = name;
  AppData.user.avatar = avatar || name.charAt(0).toUpperCase();

  // Update header avatar
  const avatarEl = document.getElementById('userAvatar');
  if (avatarEl) {
    avatarEl.textContent = AppData.user.avatar;
    avatarEl.title = name;
  }

  saveData();
  closeModal();
  navigate(currentPage);
}

// --- Simulate Scan ---
function simulateScan() {
  const mockMerchants = [
    { name: 'Matcha Latte', merchant: 'Starbucks', amount: 55000, category: 'coffee' },
    { name: 'Nasi Goreng', merchant: 'Warung Pojok', amount: 25000, category: 'food' },
    { name: 'Grab Ride', merchant: 'Grab', amount: 18000, category: 'transport' },
    { name: 'Snack Box', merchant: 'Indomaret', amount: 12000, category: 'food' },
  ];

  const mock = mockMerchants[Math.floor(Math.random() * mockMerchants.length)];

  AppData.transactions.unshift({
    id: Date.now(),
    name: mock.name,
    merchant: mock.merchant,
    category: mock.category,
    amount: mock.amount,
    type: 'expense',
    date: new Date().toISOString(),
    isQRIS: true,
    isImpulse: mock.amount < AppData.settings.impulseThreshold,
  });

  AppData.budget.todaySpent += mock.amount;
  AppData.qris.todayTaps++;
  AppData.qris.totalTapsThisWeek++;

  if (AppData.qris.todayTaps > AppData.qris.dailyTapLimit) {
    AppData.qris.streakDays = 0;
  }

  saveData();
  closeModal();

  setTimeout(() => {
    alert(`✅ QRIS scan detected!\n\n${mock.name} — ${mock.merchant}\n${formatRupiah(mock.amount)}\n\nTransaction has been recorded.`);
  }, 300);

  navigate(currentPage);
}

// --- Toggle Trigger ---
function toggleTrigger(trigger, el) {
  const idx = AppData.settings.spendingTriggers.indexOf(trigger);
  if (idx > -1) {
    AppData.settings.spendingTriggers.splice(idx, 1);
    el.classList.remove('active');
  } else {
    AppData.settings.spendingTriggers.push(trigger);
    el.classList.add('active');
  }
  saveData();
}

// --- Reset Data ---
function resetData() {
  if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
    localStorage.removeItem('uplan_data');
    AppData = JSON.parse(JSON.stringify(DEFAULT_DATA));
    navigate('dashboard');
  }
}

// =============================================
// MOBILE SIDEBAR
// =============================================
function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('show');
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// =============================================
// INITIALIZATION
// =============================================
function init() {
  // Set initial page from hash
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  navigate(hash);

  // Hash change listener
  window.addEventListener('popstate', () => {
    const page = window.location.hash.replace('#', '') || 'dashboard';
    navigate(page);
  });

  // Sidebar nav click handlers
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(item.dataset.page);
    });
  });

  // Bottom nav click handlers
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(item.dataset.page);
    });
  });

  // Floating scan button
  document.getElementById('btnScanFloat')?.addEventListener('click', openScanModal);

  // Mobile menu
  document.getElementById('mobileMenuBtn')?.addEventListener('click', openMobileSidebar);
  document.getElementById('sidebarOverlay')?.addEventListener('click', closeMobileSidebar);

  // Modal close on overlay click
  document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Keyboard shortcut: Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Header add transaction button
  document.getElementById('notifBtn')?.addEventListener('click', openAddTransactionModal);
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
