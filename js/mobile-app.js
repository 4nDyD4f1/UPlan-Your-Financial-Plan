/* ============================================
   UPlan Mobile App — Logic
   Shares localStorage with desktop version
   ============================================ */

// =============================================
// DATA (shared with desktop via localStorage)
// =============================================
const DEFAULT_DATA = {
  user: { name: 'Andy', avatar: 'A', monthlyIncome: 4800000 },
  budget: { dailyLimit: 160000, todaySpent: 115000 },
  qris: { streakDays: 3, dailyTapLimit: 5, todayTaps: 2, weeklyTaps: [3,5,2,4,6,2,2], totalTapsThisWeek: 23, lastWeekTaps: 16 },
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
  ],
  goals: [
    { id: 1, name: 'New Headphones', description: 'Sony WH-1000XM5', icon: '🎧', target: 5400000, saved: 2100000, color: 'pink' },
    { id: 2, name: 'Weekend Trip', description: 'Bali 3D2N', icon: '✈️', target: 3000000, saved: 750000, color: 'cyan' },
    { id: 3, name: 'Emergency Fund', description: '3 bulan gaji', icon: '🛡️', target: 15000000, saved: 4200000, color: 'green' },
  ],
  settings: { notifications: true, darkMode: true, qrisAlerts: true, impulseThreshold: 50000, spendingTriggers: ['qris','card'] }
};

let D;
try { const s = localStorage.getItem('uplan_data'); D = s ? JSON.parse(s) : JSON.parse(JSON.stringify(DEFAULT_DATA)); }
catch(e) { D = JSON.parse(JSON.stringify(DEFAULT_DATA)); }

function save() { try { localStorage.setItem('uplan_data', JSON.stringify(D)); } catch(e) {} }

// =============================================
// UTILITIES
// =============================================
const fmt = n => 'Rp' + Math.abs(n).toLocaleString('id-ID');

function fmtDate(ds) {
  const d = new Date(ds), now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const y = new Date(now); y.setDate(y.getDate()-1);
  const isYesterday = d.toDateString() === y.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true });
  if (isToday) return 'Today, ' + time;
  if (isYesterday) return 'Yesterday, ' + time;
  return d.toLocaleDateString('id-ID', { day:'numeric', month:'short' }) + ', ' + time;
}

const catIcon = c => ({ food:'fa-utensils', coffee:'fa-mug-hot', transport:'fa-car', shopping:'fa-bag-shopping', bills:'fa-file-invoice', health:'fa-heart-pulse', entertainment:'fa-film', topup:'fa-wallet' }[c] || 'fa-circle');

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning 👋';
  if (h < 17) return 'Good Afternoon ☀️';
  return 'Good Evening 🌙';
}

const remaining = () => D.budget.dailyLimit - D.budget.todaySpent;
const budgetPct = () => Math.min((D.budget.todaySpent / D.budget.dailyLimit) * 100, 100);
let charts = [];
function killCharts() { charts.forEach(c => { try { c.destroy(); } catch(e) {} }); charts = []; }

// =============================================
// ROUTER
// =============================================
let page = 'home';

function go(p) {
  page = p;
  killCharts();

  // Update tabs
  document.querySelectorAll('.tab[data-page]').forEach(t => t.classList.toggle('active', t.dataset.page === p));

  // Update header
  document.getElementById('greetingText').textContent = getGreeting();
  document.getElementById('userName').textContent = D.user.name;
  document.getElementById('hdrAvatar').textContent = D.user.avatar;

  // Render
  const body = document.getElementById('appBody');
  body.scrollTop = 0;

  switch(p) {
    case 'home': body.innerHTML = renderHome(); break;
    case 'qris': body.innerHTML = renderQRIS(); break;
    case 'goals': body.innerHTML = renderGoals(); break;
    case 'profile': body.innerHTML = renderProfile(); break;
    default: body.innerHTML = renderHome();
  }

  requestAnimationFrame(() => {
    if (p === 'qris') initQRISChart();
  });
}

// =============================================
// HOME PAGE
// =============================================
function renderHome() {
  const rem = remaining();
  const pct = budgetPct();
  const barClass = pct > 85 ? 'warn' : 'cyan';
  const streak = D.qris.streakDays;
  const recent = D.transactions.slice(0, 5);

  return `
    <!-- Daily Limit -->
    <div class="limit-card anim">
      <div class="limit-card-top">
        <span class="limit-label">Today's Limit</span>
        <button class="limit-edit" onclick="sheetEditLimit()"><i class="fas fa-pen"></i> Edit</button>
      </div>
      <div class="limit-amount">
        <span>${fmt(Math.abs(rem))}</span>
        <span class="lbl">${rem >= 0 ? 'left' : 'over!'}</span>
      </div>
      <div class="limit-bar"><div class="limit-bar-fill ${barClass}" style="width:${pct}%"></div></div>
      <div class="limit-meta">
        <span>Spent: ${fmt(D.budget.todaySpent)}</span>
        <span>Target: ${fmt(D.budget.dailyLimit)}</span>
      </div>
    </div>

    <!-- Streak Pill -->
    <div class="streak-pill anim anim-d1">
      <div class="streak-pill-icon"><i class="fas fa-fire-flame-curved"></i></div>
      <div class="streak-pill-text">
        <div class="streak-pill-count">${streak} Days Streak 🔥</div>
        <div class="streak-pill-sub">Staying under target — keep it up!</div>
      </div>
      <div class="streak-dots">
        ${[1,2,3,4,5,6,7].map(i => `<div class="streak-dot ${i<=streak?'on':''}"></div>`).join('')}
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions anim anim-d2">
      <button class="qa-btn" onclick="sheetAddTx()">
        <i class="fas fa-plus pink"></i>
        <span>Add</span>
      </button>
      <button class="qa-btn" onclick="sheetScan()">
        <i class="fas fa-camera cyan"></i>
        <span>Scan</span>
      </button>
      <button class="qa-btn" onclick="go('goals')">
        <i class="fas fa-piggy-bank green"></i>
        <span>Save</span>
      </button>
      <button class="qa-btn" onclick="go('qris')">
        <i class="fas fa-chart-simple yellow"></i>
        <span>Stats</span>
      </button>
    </div>

    <!-- Goals Scroll -->
    <div class="sec-header anim anim-d3">
      <span class="sec-title">My Goals</span>
      <button class="sec-link" onclick="go('goals')">See all →</button>
    </div>
    <div class="hscroll anim anim-d3">
      ${D.goals.map(g => {
        const p = Math.round((g.saved/g.target)*100);
        return `
          <div class="goal-mini" onclick="sheetContribute(${g.id})">
            <div class="goal-mini-top">
              <span class="goal-mini-icon">${g.icon}</span>
              <div>
                <div class="goal-mini-name">${g.name}</div>
                <div class="goal-mini-sub">${g.description}</div>
              </div>
            </div>
            <div class="goal-mini-amount">${fmt(g.saved)}</div>
            <div class="goal-mini-bar"><div class="goal-mini-bar-fill" style="width:${Math.min(p,100)}%"></div></div>
            <div class="goal-mini-pct">${p}% of ${fmt(g.target)}</div>
          </div>`;
      }).join('')}
      <div class="goal-mini" style="display:flex;align-items:center;justify-content:center;border-style:dashed;color:var(--text-muted)" onclick="sheetAddGoal()">
        <div style="text-align:center"><i class="fas fa-plus" style="font-size:1.4rem;margin-bottom:6px;display:block"></i><span style="font-size:0.78rem;font-weight:600">New Goal</span></div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="sec-header anim anim-d4" style="margin-top:18px">
      <span class="sec-title">Recent Activity</span>
      <button class="sec-link" onclick="sheetAllTx()">View all →</button>
    </div>
    <div class="m-card anim anim-d4" style="padding:6px 14px">
      ${recent.map(renderTxItem).join('')}
    </div>
  `;
}

function renderTxItem(tx) {
  const isExp = tx.type === 'expense';
  return `
    <div class="tx-item">
      <div class="tx-icon ${tx.category}"><i class="fas ${catIcon(tx.category)}"></i></div>
      <div class="tx-info">
        <div class="tx-name">
          ${tx.name}
          ${tx.isImpulse ? '<span class="badge-imp">Impulse</span>' : ''}
        </div>
        <div class="tx-meta">${tx.merchant} • ${fmtDate(tx.date)}</div>
      </div>
      <div class="tx-amount ${isExp?'exp':'inc'}">${isExp?'-':'+'} ${fmt(tx.amount)}</div>
    </div>`;
}

// =============================================
// QRIS PAGE
// =============================================
function renderQRIS() {
  const { todayTaps, dailyTapLimit, weeklyTaps, totalTapsThisWeek, lastWeekTaps, streakDays } = D.qris;
  const wc = totalTapsThisWeek - lastWeekTaps;
  const wcp = lastWeekTaps > 0 ? Math.round((wc/lastWeekTaps)*100) : 0;

  const hm = [];
  for (let i=0;i<28;i++) {
    const t = Math.floor(Math.random()*7);
    hm.push(t===0?'':t<=2?'l1':t<=4?'l2':t<=5?'l3':t<=dailyTapLimit?'l4':'over');
  }

  const merchants = {};
  D.transactions.filter(t => t.isQRIS).forEach(t => { merchants[t.merchant] = (merchants[t.merchant]||0)+1; });
  const top = Object.entries(merchants).sort((a,b) => b[1]-a[1]).slice(0,4);

  return `
    <div class="tap-hero anim">
      <div class="tap-hero-label">Today's QRIS Taps</div>
      <div class="tap-hero-num">${todayTaps}</div>
      <div class="tap-hero-limit">Limit: ${dailyTapLimit}x / day</div>
      <div class="limit-bar" style="margin:14px auto 0;max-width:200px">
        <div class="limit-bar-fill ${todayTaps>dailyTapLimit?'warn':'cyan'}" style="width:${Math.min((todayTaps/dailyTapLimit)*100,100)}%"></div>
      </div>
    </div>

    <div class="stat-row anim anim-d1">
      <div class="stat-box">
        <div class="stat-box-label">This Week</div>
        <div class="stat-box-val pink">${totalTapsThisWeek}x</div>
        <div class="stat-box-note ${wc>0?'up':'down'}"><i class="fas fa-arrow-${wc>0?'up':'down'}"></i> ${wc>0?'+':''}${wcp}%</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-label">Streak</div>
        <div class="stat-box-val green">${streakDays} days</div>
        <div class="stat-box-note down"><i class="fas fa-fire"></i> Under limit</div>
      </div>
    </div>

    <div class="m-card anim anim-d2 heatmap-container">
      <div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Activity Heatmap</div>
      <div style="display:flex;gap:3px;margin-bottom:6px">
        ${['M','T','W','T','F','S','S'].map(d => `<div style="flex:1;text-align:center;font-size:0.55rem;color:var(--text-muted)">${d}</div>`).join('')}
      </div>
      <div class="heatmap-grid">${hm.map(l => `<div class="hm-cell ${l}"></div>`).join('')}</div>
    </div>

    <div class="m-card anim anim-d3">
      <div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Weekly Frequency</div>
      <div class="chart-box"><canvas id="qrisChart"></canvas></div>
    </div>

    <div class="sec-header anim anim-d4"><span class="sec-title">Top Merchants</span></div>
    <div class="m-card anim anim-d4" style="padding:6px 14px">
      ${top.map(([name,count],i) => `
        <div class="tx-item">
          <div style="width:28px;font-weight:800;color:var(--text-muted);font-size:0.85rem">#${i+1}</div>
          <div class="tx-info"><div class="tx-name">${name}</div></div>
          <div style="font-size:0.82rem;font-weight:700;color:var(--accent)">${count}x</div>
        </div>
      `).join('')}
    </div>
  `;
}

function initQRISChart() {
  const ctx = document.getElementById('qrisChart');
  if (!ctx) return;
  const c = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      datasets: [{
        data: D.qris.weeklyTaps,
        backgroundColor: D.qris.weeklyTaps.map(v => v > D.qris.dailyTapLimit ? 'rgba(239,68,68,0.6)' : 'rgba(0,229,255,0.4)'),
        borderColor: D.qris.weeklyTaps.map(v => v > D.qris.dailyTapLimit ? '#EF4444' : '#00E5FF'),
        borderWidth: 2, borderRadius: 6, borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor:'#1C1C1F', titleColor:'#fff', bodyColor:'#9CA3AF', cornerRadius:8, padding:10 } },
      scales: {
        x: { grid:{display:false}, ticks:{color:'#6B7280',font:{family:'Inter',size:10}} },
        y: { grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#6B7280',font:{family:'Inter',size:10},stepSize:1}, beginAtZero:true }
      }
    }
  });
  charts.push(c);
}

// =============================================
// GOALS PAGE
// =============================================
function renderGoals() {
  const totalSaved = D.goals.reduce((s,g) => s+g.saved, 0);
  const dailySavings = Math.max(remaining(), 0);

  return `
    <div class="stat-row anim">
      <div class="stat-box">
        <div class="stat-box-label">Today's Savings</div>
        <div class="stat-box-val green">${fmt(dailySavings)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-label">Total Saved</div>
        <div class="stat-box-val cyan">${fmt(totalSaved)}</div>
      </div>
    </div>

    ${D.goals.map((g, idx) => {
      const p = Math.round((g.saved/g.target)*100);
      return `
        <div class="goal-full-card anim anim-d${Math.min(idx+1,5)}">
          <div class="goal-full-top">
            <div class="goal-full-left">
              <span class="goal-full-icon">${g.icon}</span>
              <div>
                <div class="goal-full-name">${g.name}</div>
                <div class="goal-full-desc">${g.description}</div>
              </div>
            </div>
            <div class="goal-full-actions">
              <button class="goal-action-btn" onclick="sheetEditGoal(${g.id})"><i class="fas fa-pen"></i></button>
              <button class="goal-action-btn del" onclick="deleteGoal(${g.id})"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          <div class="goal-full-amount">${fmt(g.saved)}</div>
          <div class="goal-full-target">Target: ${fmt(g.target)}</div>
          <div class="goal-full-bar"><div class="goal-full-bar-fill" style="width:${Math.min(p,100)}%"></div></div>
          <div class="goal-full-bottom">
            <span class="goal-full-pct">${p}% complete</span>
            <button class="btn-add-funds" onclick="sheetContribute(${g.id})"><i class="fas fa-plus"></i> Add Funds</button>
          </div>
        </div>`;
    }).join('')}

    <button class="add-goal-btn anim anim-d4" onclick="sheetAddGoal()">
      <i class="fas fa-plus-circle"></i> Add New Goal
    </button>
  `;
}

function deleteGoal(id) {
  const g = D.goals.find(x => x.id === id);
  if (!g) return;
  if (confirm(`Delete "${g.name}"?`)) {
    D.goals = D.goals.filter(x => x.id !== id);
    save();
    go(page);
  }
}

// =============================================
// PROFILE PAGE
// =============================================
function renderProfile() {
  const { user, budget, settings } = D;

  return `
    <div class="profile-hero anim">
      <div class="profile-avatar">${user.avatar}</div>
      <div class="profile-name">${user.name}</div>
      <div class="profile-sub">Member since June 2026</div>
    </div>

    <div class="setting-group anim anim-d1">
      <div class="setting-group-title">Budget</div>
      <div class="setting-item" onclick="sheetEditSetting('monthlyIncome','Monthly Income',${user.monthlyIncome})">
        <div class="setting-item-info"><h4>Monthly Income</h4></div>
        <span class="setting-val">${fmt(user.monthlyIncome)}</span>
        <span class="setting-arrow"><i class="fas fa-chevron-right"></i></span>
      </div>
      <div class="setting-item" onclick="sheetEditLimit()">
        <div class="setting-item-info"><h4>Daily Limit</h4></div>
        <span class="setting-val pink">${fmt(budget.dailyLimit)}</span>
        <span class="setting-arrow"><i class="fas fa-chevron-right"></i></span>
      </div>
      <div class="setting-item" onclick="sheetEditSetting('tapLimit','QRIS Tap Limit',${D.qris.dailyTapLimit})">
        <div class="setting-item-info"><h4>QRIS Tap Limit</h4></div>
        <span class="setting-val" style="color:var(--warning)">${D.qris.dailyTapLimit}x / day</span>
        <span class="setting-arrow"><i class="fas fa-chevron-right"></i></span>
      </div>
      <div class="setting-item" onclick="sheetEditSetting('impulseThreshold','Impulse Threshold',${settings.impulseThreshold})">
        <div class="setting-item-info"><h4>Impulse Threshold</h4></div>
        <span class="setting-val" style="color:var(--danger)">${fmt(settings.impulseThreshold)}</span>
        <span class="setting-arrow"><i class="fas fa-chevron-right"></i></span>
      </div>
    </div>

    <div class="setting-group anim anim-d2">
      <div class="setting-group-title">Notifications</div>
      <div class="setting-item">
        <div class="setting-item-info"><h4>Push Notifications</h4><p>Reminder after meals</p></div>
        <div class="m-toggle ${settings.notifications?'on':''}" onclick="this.classList.toggle('on');D.settings.notifications=this.classList.contains('on');save()"></div>
      </div>
      <div class="setting-item">
        <div class="setting-item-info"><h4>QRIS Alerts</h4><p>Over tap limit warning</p></div>
        <div class="m-toggle ${settings.qrisAlerts?'on':''}" onclick="this.classList.toggle('on');D.settings.qrisAlerts=this.classList.contains('on');save()"></div>
      </div>
    </div>

    <div class="setting-group anim anim-d3">
      <div class="setting-group-title">Spending Triggers</div>
      <div class="chip-row">
        ${['qris','card','cash'].map(t => `<button class="m-chip ${settings.spendingTriggers.includes(t)?'active':''}" onclick="toggleTrigger('${t}',this)"><i class="fas fa-${t==='qris'?'qrcode':t==='card'?'credit-card':'money-bill'}"></i>&nbsp;${t==='qris'?'QRIS':t==='card'?'Kartu':'Tunai'}</button>`).join('')}
      </div>
    </div>

    <div class="setting-group anim anim-d4">
      <div class="setting-group-title">Data</div>
      <div class="setting-item" onclick="resetAll()" style="border-radius:var(--radius)">
        <div class="setting-item-info"><h4 style="color:var(--danger)">Reset All Data</h4><p>Clear everything</p></div>
        <span class="setting-arrow" style="color:var(--danger)"><i class="fas fa-trash"></i></span>
      </div>
    </div>

    <a href="index.html" style="display:block;text-align:center;padding:16px;font-size:0.82rem;color:var(--primary);font-weight:600;margin-top:8px">
      <i class="fas fa-desktop"></i>&nbsp; Open Desktop Version
    </a>

    <div style="text-align:center;padding:20px 0 40px;font-size:0.68rem;color:var(--text-muted)">
      UPlan v1.0 — Made for Gen Z 💜
    </div>
  `;
}

function toggleTrigger(t, el) {
  const idx = D.settings.spendingTriggers.indexOf(t);
  if (idx > -1) { D.settings.spendingTriggers.splice(idx, 1); el.classList.remove('active'); }
  else { D.settings.spendingTriggers.push(t); el.classList.add('active'); }
  save();
}

function resetAll() {
  if (confirm('Reset all data?')) {
    localStorage.removeItem('uplan_data');
    D = JSON.parse(JSON.stringify(DEFAULT_DATA));
    go('home');
  }
}

// =============================================
// BOTTOM SHEETS
// =============================================
function openSheet(html) {
  const o = document.getElementById('sheetOverlay');
  document.getElementById('sheetContent').innerHTML = html;
  o.classList.add('show');
  requestAnimationFrame(() => {
    const inp = document.querySelector('#sheetContent input:not([type=hidden])');
    if (inp) inp.focus();
  });
}

function closeSheet() {
  document.getElementById('sheetOverlay').classList.remove('show');
}

// --- Add Transaction ---
function sheetAddTx() {
  openSheet(`
    <div class="sheet-title">➕ Add Transaction</div>
    <div class="form-grp"><label>Name</label><input type="text" id="sName" placeholder="Kopi Kenangan"></div>
    <div class="form-grp"><label>Merchant</label><input type="text" id="sMerchant" placeholder="Kopi Kenangan"></div>
    <div class="form-grp"><label>Amount (Rp)</label><input type="number" id="sAmount" placeholder="25000" inputmode="numeric"></div>
    <div class="form-grp"><label>Category</label>
      <select id="sCategory">
        <option value="food">Makanan</option><option value="coffee">Kopi</option>
        <option value="transport">Transport</option><option value="shopping">Belanja</option>
        <option value="bills">Tagihan</option><option value="health">Kesehatan</option>
        <option value="entertainment">Hiburan</option>
      </select>
    </div>
    <div class="form-grp" style="display:flex;align-items:center;justify-content:space-between">
      <label style="margin:0">QRIS Payment?</label>
      <div class="m-toggle on" id="sQRIS" onclick="this.classList.toggle('on')"></div>
    </div>
    <div class="sheet-btns">
      <button class="btn-full secondary" onclick="closeSheet()">Cancel</button>
      <button class="btn-full primary" onclick="doAddTx()"><i class="fas fa-plus"></i> Add</button>
    </div>
  `);
}

function doAddTx() {
  const name = document.getElementById('sName')?.value?.trim();
  const merchant = document.getElementById('sMerchant')?.value?.trim();
  const amount = parseInt(document.getElementById('sAmount')?.value) || 0;
  const category = document.getElementById('sCategory')?.value || 'food';
  const isQRIS = document.getElementById('sQRIS')?.classList.contains('on');

  if (!name || amount <= 0) { alert('Fill name and amount!'); return; }

  D.transactions.unshift({
    id: Date.now(), name, merchant: merchant||'Unknown', category, amount,
    type: 'expense', date: new Date().toISOString(), isQRIS,
    isImpulse: amount < D.settings.impulseThreshold,
  });
  D.budget.todaySpent += amount;
  if (isQRIS) { D.qris.todayTaps++; D.qris.totalTapsThisWeek++; }
  if (D.qris.todayTaps > D.qris.dailyTapLimit) D.qris.streakDays = 0;

  save(); closeSheet(); go(page);
}

// --- Scan ---
function sheetScan() {
  openSheet(`
    <div class="sheet-title">📷 Scan QRIS</div>
    <div style="border:2px dashed var(--border);border-radius:var(--radius);padding:40px 20px;text-align:center;margin-bottom:16px;color:var(--text-muted)">
      <i class="fas fa-cloud-arrow-up" style="font-size:2rem;margin-bottom:10px;display:block;opacity:0.4"></i>
      <div style="font-weight:700;color:var(--text);margin-bottom:4px">Drop screenshot here</div>
      <div style="font-size:0.78rem">or tap to browse</div>
    </div>
    <div class="sheet-btns">
      <button class="btn-full secondary" onclick="closeSheet()">Cancel</button>
      <button class="btn-full primary" onclick="doScan()"><i class="fas fa-magic"></i> Simulate</button>
    </div>
  `);
}

function doScan() {
  const mocks = [
    { name:'Matcha Latte', merchant:'Starbucks', amount:55000, category:'coffee' },
    { name:'Nasi Goreng', merchant:'Warung Pojok', amount:25000, category:'food' },
    { name:'Grab Ride', merchant:'Grab', amount:18000, category:'transport' },
    { name:'Snack Box', merchant:'Indomaret', amount:12000, category:'food' },
  ];
  const m = mocks[Math.floor(Math.random()*mocks.length)];

  D.transactions.unshift({
    id: Date.now(), name:m.name, merchant:m.merchant, category:m.category, amount:m.amount,
    type:'expense', date:new Date().toISOString(), isQRIS:true,
    isImpulse: m.amount < D.settings.impulseThreshold,
  });
  D.budget.todaySpent += m.amount;
  D.qris.todayTaps++; D.qris.totalTapsThisWeek++;
  if (D.qris.todayTaps > D.qris.dailyTapLimit) D.qris.streakDays = 0;

  save(); closeSheet();
  setTimeout(() => alert(`✅ Detected!\n\n${m.name} — ${m.merchant}\n${fmt(m.amount)}`), 200);
  go(page);
}

// --- Edit Limit ---
function sheetEditLimit() {
  const rec = Math.round(D.user.monthlyIncome / 30);
  openSheet(`
    <div class="sheet-title">💰 Edit Daily Limit</div>
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:0.78rem;color:var(--text-muted)">Current Limit</div>
      <div style="font-size:1.8rem;font-weight:800;color:var(--primary)">${fmt(D.budget.dailyLimit)}</div>
    </div>
    <div class="form-grp"><label>New Daily Limit (Rp)</label><input type="number" id="sLimit" value="${D.budget.dailyLimit}" inputmode="numeric"></div>
    <div class="chip-row">
      <button class="m-chip" onclick="document.getElementById('sLimit').value='100000'">100K</button>
      <button class="m-chip" onclick="document.getElementById('sLimit').value='150000'">150K</button>
      <button class="m-chip" onclick="document.getElementById('sLimit').value='200000'">200K</button>
      <button class="m-chip" onclick="document.getElementById('sLimit').value='250000'">250K</button>
    </div>
    <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:16px">💡 Recommended: ${fmt(rec)}/day</div>
    <div class="sheet-btns">
      <button class="btn-full secondary" onclick="closeSheet()">Cancel</button>
      <button class="btn-full primary" onclick="doEditLimit()"><i class="fas fa-check"></i> Save</button>
    </div>
  `);
}

function doEditLimit() {
  const v = parseInt(document.getElementById('sLimit')?.value) || 0;
  if (v <= 0) { alert('Must be > 0!'); return; }
  D.budget.dailyLimit = v;
  save(); closeSheet(); go(page);
}

// --- Add Goal ---
function sheetAddGoal() {
  openSheet(`
    <div class="sheet-title">🎯 New Goal</div>
    <div class="form-grp"><label>Name</label><input type="text" id="sgName" placeholder="New MacBook"></div>
    <div class="form-grp"><label>Description</label><input type="text" id="sgDesc" placeholder="MacBook Air M4"></div>
    <div class="form-grp"><label>Target (Rp)</label><input type="number" id="sgTarget" placeholder="15000000" inputmode="numeric"></div>
    <div class="form-grp"><label>Icon</label><input type="text" id="sgIcon" value="🎯" maxlength="4"></div>
    <div class="sheet-btns">
      <button class="btn-full secondary" onclick="closeSheet()">Cancel</button>
      <button class="btn-full primary" onclick="doAddGoal()"><i class="fas fa-plus"></i> Create</button>
    </div>
  `);
}

function doAddGoal() {
  const name = document.getElementById('sgName')?.value?.trim();
  const target = parseInt(document.getElementById('sgTarget')?.value) || 0;
  if (!name || target <= 0) { alert('Fill name and target!'); return; }
  const colors = ['pink','cyan','green'];
  D.goals.push({
    id: Date.now(), name,
    description: document.getElementById('sgDesc')?.value?.trim() || '',
    icon: document.getElementById('sgIcon')?.value || '🎯',
    target, saved: 0,
    color: colors[D.goals.length % colors.length],
  });
  save(); closeSheet(); go('goals');
}

// --- Edit Goal ---
function sheetEditGoal(id) {
  const g = D.goals.find(x => x.id === id);
  if (!g) return;
  openSheet(`
    <div class="sheet-title">✏️ Edit Goal</div>
    <div class="form-grp"><label>Name</label><input type="text" id="egName" value="${g.name}"></div>
    <div class="form-grp"><label>Description</label><input type="text" id="egDesc" value="${g.description}"></div>
    <div class="form-grp"><label>Target (Rp)</label><input type="number" id="egTarget" value="${g.target}" inputmode="numeric"></div>
    <div class="form-grp"><label>Saved (Rp)</label><input type="number" id="egSaved" value="${g.saved}" inputmode="numeric"></div>
    <div class="form-grp"><label>Icon</label><input type="text" id="egIcon" value="${g.icon}" maxlength="4"></div>
    <input type="hidden" id="egId" value="${g.id}">
    <div class="sheet-btns">
      <button class="btn-full secondary" onclick="closeSheet()">Cancel</button>
      <button class="btn-full primary" onclick="doEditGoal()"><i class="fas fa-check"></i> Save</button>
    </div>
  `);
}

function doEditGoal() {
  const id = parseInt(document.getElementById('egId')?.value);
  const g = D.goals.find(x => x.id === id);
  if (!g) return;
  const name = document.getElementById('egName')?.value?.trim();
  if (!name) { alert('Name required!'); return; }
  g.name = name;
  g.description = document.getElementById('egDesc')?.value?.trim() || '';
  g.target = parseInt(document.getElementById('egTarget')?.value) || g.target;
  g.saved = Math.min(parseInt(document.getElementById('egSaved')?.value) || 0, g.target);
  g.icon = document.getElementById('egIcon')?.value || g.icon;
  save(); closeSheet(); go(page);
}

// --- Contribute to Goal ---
function sheetContribute(id) {
  const g = D.goals.find(x => x.id === id);
  if (!g) return;
  const p = Math.round((g.saved/g.target)*100);
  const rem = g.target - g.saved;
  openSheet(`
    <div class="sheet-title">${g.icon} Add to ${g.name}</div>
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:1.5rem;font-weight:800;color:var(--primary)">${fmt(g.saved)}</div>
      <div class="limit-bar" style="margin:8px 0"><div class="limit-bar-fill cyan" style="width:${Math.min(p,100)}%"></div></div>
      <div style="font-size:0.72rem;color:var(--text-muted)">${p}% — ${fmt(rem)} remaining</div>
    </div>
    <div class="form-grp"><label>Amount (Rp)</label><input type="number" id="scAmt" placeholder="100000" inputmode="numeric"></div>
    <div class="chip-row">
      <button class="m-chip" onclick="document.getElementById('scAmt').value='25000'">25K</button>
      <button class="m-chip" onclick="document.getElementById('scAmt').value='50000'">50K</button>
      <button class="m-chip" onclick="document.getElementById('scAmt').value='100000'">100K</button>
      <button class="m-chip" onclick="document.getElementById('scAmt').value='500000'">500K</button>
    </div>
    <input type="hidden" id="scId" value="${g.id}">
    <div class="sheet-btns">
      <button class="btn-full secondary" onclick="closeSheet()">Cancel</button>
      <button class="btn-full primary" onclick="doContribute()"><i class="fas fa-piggy-bank"></i> Add Funds</button>
    </div>
  `);
}

function doContribute() {
  const id = parseInt(document.getElementById('scId')?.value);
  const amt = parseInt(document.getElementById('scAmt')?.value) || 0;
  const g = D.goals.find(x => x.id === id);
  if (!g || amt <= 0) { alert('Enter a valid amount!'); return; }
  g.saved = Math.min(g.saved + amt, g.target);
  save(); closeSheet();
  if (g.saved >= g.target) setTimeout(() => alert(`🎉 Goal "${g.name}" reached!`), 200);
  go(page);
}

// --- Edit Setting ---
function sheetEditSetting(field, label, current) {
  openSheet(`
    <div class="sheet-title">✏️ ${label}</div>
    <div class="form-grp"><label>${label}</label><input type="number" id="seVal" value="${current}" inputmode="numeric"></div>
    <input type="hidden" id="seField" value="${field}">
    <div class="sheet-btns">
      <button class="btn-full secondary" onclick="closeSheet()">Cancel</button>
      <button class="btn-full primary" onclick="doEditSetting()"><i class="fas fa-check"></i> Save</button>
    </div>
  `);
}

function doEditSetting() {
  const field = document.getElementById('seField')?.value;
  const val = parseInt(document.getElementById('seVal')?.value) || 0;
  if (val <= 0) { alert('Must be > 0!'); return; }
  switch(field) {
    case 'monthlyIncome': D.user.monthlyIncome = val; break;
    case 'tapLimit': D.qris.dailyTapLimit = val; break;
    case 'impulseThreshold':
      D.settings.impulseThreshold = val;
      D.transactions.forEach(t => { if (t.type==='expense') t.isImpulse = t.amount < val; });
      break;
  }
  save(); closeSheet(); go(page);
}

// --- All Transactions Sheet ---
function sheetAllTx() {
  openSheet(`
    <div class="sheet-title">📋 All Transactions</div>
    <div style="max-height:60vh;overflow-y:auto">
      ${D.transactions.map(renderTxItem).join('')}
    </div>
    <button class="btn-full secondary" style="margin-top:16px" onclick="closeSheet()">Close</button>
  `);
}

// =============================================
// INIT
// =============================================
function init() {
  go('home');

  // Tab clicks
  document.querySelectorAll('.tab[data-page]').forEach(t => {
    t.addEventListener('click', () => go(t.dataset.page));
  });

  // Center tab (scan)
  document.getElementById('tabCenter')?.addEventListener('click', () => sheetScan());

  // Header add btn
  document.getElementById('btnAddTx')?.addEventListener('click', () => sheetAddTx());

  // Sheet overlay close
  document.getElementById('sheetOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSheet();
  });
}

document.addEventListener('DOMContentLoaded', init);
