// ===========================
// かずたんすいっち app.js
// ===========================

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyCzi_ZptjvIPOEB5gcHT42ZGqpdcSAafF8",
  authDomain: "kazutan-switch.firebaseapp.com",
  databaseURL: "https://kazutan-switch-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kazutan-switch",
  storageBucket: "kazutan-switch.firebasestorage.app",
  messagingSenderId: "216367206536",
  appId: "1:216367206536:web:bc7801a343f0e12c0a4f3d"
};

// VAPIDキー（FCM用）
const VAPID_KEY = "BEv8GqVN0xPtwBv3dMqe-oanNFXS3-E858Ar_4E5CLMwP08FjoECsCUNYraQ7O764DSaNJlmcqtQWrss3OHnylU";

// あいことば
const SECRET_WORD = "みちくん";

// ===========================
// Firebase初期化
// ===========================
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let messaging = null;
try {
  if ('serviceWorker' in navigator && 'Notification' in window) {
    messaging = firebase.messaging();
  }
} catch (e) {
  console.warn('FCM初期化スキップ:', e);
}

// ===========================
// ステート
// ===========================
let state = {
  members: {},   // {id: {name, emoji}}
  buttons: {},   // {id: {label, emoji, order}}
  records: {},   // {id: {memberId, buttonId, timestamp}}
  currentSenderId: null,
};

let calMonth = new Date();
calMonth.setDate(1);

// ===========================
// 絵文字データ
// ===========================
const EMOJI_LIST = [
  '💕','💖','💗','💝','💓','💞','💘','💟','❤️','🧡','💛','💚','💙','💜','🤍','🤎','🖤',
  '😊','🥰','😘','😍','🤗','😌','☺️','😋','😆','😉','😜','😎','🥺','🥹','🤭','😴','😪',
  '😢','😭','😞','🥲','😩','😓','😔','😣','😖','😥','😫','😟','🫠','🫨',
  '😤','😡','😠','😒','😑','😶','🙄','😬',
  '🌸','🌺','🌷','🌹','🌻','🌼','💐','🌿','🍀','🌱','🌲','🌳','🍂',
  '✨','⭐','🌟','💫','🌙','☀️','⛅','☁️','🌈','❄️','⚡',
  '🍩','🍰','🧁','🍪','🍬','🍭','🍫','🍮','🍦','🍓','🍑','🍒','🥞','🍙','🍣','🍵','🧋','☕',
  '🐱','🐶','🐰','🐻','🐼','🦊','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦄','🐹','🐭','🐢','🐳','🐬','🦋',
  '🎀','🎁','🎈','🎉','🎂','🍾','🥂',
  '🏠','🛏️','🛁','🪥','🧴','🧸','📚','✏️','📝','📱','💻','🎧','🎵','🎶','📷',
  '👋','🤝','🙏','👍','👏','🤲','🫶','💪','🤌','✌️','👌','🫰',
  '🚶','🏃','💃','🕺','🧘','💆','💇','🛀','💤'
];

// ===========================
// ユーティリティ
// ===========================
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function showToast(msg, ms = 1800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), ms);
}
function fmtDate(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtRelative(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'たった今';
  if (diff < 3600000) return Math.floor(diff/60000) + '分前';
  if (diff < 86400000) return Math.floor(diff/3600000) + '時間前';
  if (diff < 604800000) return Math.floor(diff/86400000) + '日前';
  return fmtDate(ts);
}

// ===========================
// ロック
// ===========================
const greetingInput = document.getElementById('greetingText');
const unlockBtn = document.getElementById('unlockBtn');
const lockError = document.getElementById('lockError');

function tryUnlock() {
  const v = greetingInput.value.trim();
  if (v === SECRET_WORD) {
    document.getElementById('lockScreen').classList.add('hidden');
    document.getElementById('appHeader').style.display = '';
    document.getElementById('appContent').style.display = '';
    initApp();
  } else {
    lockError.textContent = 'ちがうみたい…もういちど';
    greetingInput.value = '';
    setTimeout(() => lockError.textContent = '', 2000);
  }
}
unlockBtn.addEventListener('click', tryUnlock);
greetingInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });

document.getElementById('logoutBtn').addEventListener('click', () => {
  location.reload();
});

// ===========================
// タブ
// ===========================
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.section').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('section-' + t.dataset.tab).classList.add('active');
    if (t.dataset.tab === 'analytics') renderAnalytics();
    if (t.dataset.tab === 'history') renderHistory();
  });
});

// ===========================
// 絵文字ピッカー
// ===========================
const emojiPicker = document.getElementById('emojiPicker');
const emojiGrid = document.getElementById('emojiGrid');
EMOJI_LIST.forEach(em => {
  const b = document.createElement('button');
  b.textContent = em;
  b.addEventListener('click', () => {
    if (currentEmojiTarget) currentEmojiTarget.textContent = em;
    emojiPicker.classList.remove('show');
  });
  emojiGrid.appendChild(b);
});
let currentEmojiTarget = null;
function openEmojiPicker(target) {
  currentEmojiTarget = target;
  emojiPicker.classList.add('show');
}
emojiPicker.addEventListener('click', e => {
  if (e.target === emojiPicker) emojiPicker.classList.remove('show');
});
document.getElementById('newMemberEmojiBtn').addEventListener('click', e => openEmojiPicker(e.currentTarget));
document.getElementById('newButtonEmojiBtn').addEventListener('click', e => openEmojiPicker(e.currentTarget));

// ===========================
// アプリ初期化
// ===========================
async function initApp() {
  // データ購読
  db.ref('members').on('value', snap => {
    state.members = snap.val() || {};
    renderMembers();
    renderSenderSelect();
    renderFilters();
  });
  db.ref('buttons').on('value', snap => {
    state.buttons = snap.val() || {};
    renderButtons();
    renderSwitchGrid();
    renderFilters();
  });
  db.ref('records').on('value', snap => {
    state.records = snap.val() || {};
    renderHistory();
    if (document.getElementById('section-analytics').classList.contains('active')) {
      renderAnalytics();
    }
  });

  // 既存に何もなければデフォルトを投入
  setTimeout(seedDefaultsIfEmpty, 800);

  // 通知ステータス更新
  updateNotifStatus();
}

async function seedDefaultsIfEmpty() {
  const buttonsSnap = await db.ref('buttons').once('value');
  if (!buttonsSnap.val()) {
    const defaults = [
      { emoji: '💕', label: '会いたい' },
      { emoji: '🥺', label: '寂しい' },
      { emoji: '😪', label: '疲れた' },
      { emoji: '🙏', label: 'ありがとう' },
      { emoji: '🌙', label: 'おやすみ' },
      { emoji: '🤗', label: 'ぎゅーしたい' },
      { emoji: '🏠', label: 'おかえり' },
    ];
    const updates = {};
    defaults.forEach((b, i) => {
      const id = genId();
      updates[id] = { ...b, order: i };
    });
    await db.ref('buttons').set(updates);
  }
}

// ===========================
// メンバー
// ===========================
function renderMembers() {
  const list = document.getElementById('memberList');
  list.innerHTML = '';
  const ids = Object.keys(state.members);
  if (ids.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだメンバーがいません。下から追加してね。</p>';
    return;
  }
  ids.forEach(id => {
    const m = state.members[id];
    const div = document.createElement('div');
    div.className = 'member-list-item';
    div.innerHTML = `
      <span class="member-list-emoji">${m.emoji}</span>
      <span class="member-list-name">${escapeHtml(m.name)}</span>
      <button class="icon-btn" data-act="del" data-id="${id}">🗑️</button>
    `;
    div.querySelector('[data-act="del"]').addEventListener('click', () => askDeleteMember(id));
    list.appendChild(div);
  });
}

document.getElementById('addMemberBtn').addEventListener('click', async () => {
  const name = document.getElementById('newMemberName').value.trim();
  const emoji = document.getElementById('newMemberEmojiBtn').textContent;
  if (!name) { showToast('なまえを入れてね'); return; }
  const id = genId();
  await db.ref('members/' + id).set({ name, emoji });
  document.getElementById('newMemberName').value = '';
  document.getElementById('newMemberEmojiBtn').textContent = '😊';
  showToast('メンバー追加しました 💕');
});

let pendingMemberDelete = null;
function askDeleteMember(id) {
  pendingMemberDelete = id;
  const m = state.members[id];
  document.getElementById('memberDeleteText').textContent = `${m.emoji} ${m.name} を削除しますか？`;
  document.getElementById('memberDeleteModal').classList.add('show');
}
document.getElementById('memberDeleteCancel').addEventListener('click', () => {
  document.getElementById('memberDeleteModal').classList.remove('show');
});
document.getElementById('memberDeleteConfirm').addEventListener('click', async () => {
  if (pendingMemberDelete) {
    await db.ref('members/' + pendingMemberDelete).remove();
    if (state.currentSenderId === pendingMemberDelete) state.currentSenderId = null;
    pendingMemberDelete = null;
    showToast('削除しました');
  }
  document.getElementById('memberDeleteModal').classList.remove('show');
});

// ===========================
// 送信者選択
// ===========================
function renderSenderSelect() {
  const sel = document.getElementById('senderSelect');
  const ids = Object.keys(state.members);
  sel.innerHTML = '';
  if (ids.length === 0) {
    document.getElementById('currentSenderName').textContent = 'メンバーを追加してね';
    sel.style.display = 'none';
    return;
  }
  sel.style.display = '';
  ids.forEach(id => {
    const m = state.members[id];
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `${m.emoji} ${m.name}`;
    sel.appendChild(opt);
  });
  // 既存の保存値があれば復元
  const saved = localStorage.getItem('senderId');
  if (saved && state.members[saved]) {
    state.currentSenderId = saved;
    sel.value = saved;
  } else {
    state.currentSenderId = ids[0];
    sel.value = ids[0];
  }
  updateSenderName();
}
document.getElementById('senderSelect').addEventListener('change', e => {
  state.currentSenderId = e.target.value;
  localStorage.setItem('senderId', state.currentSenderId);
  updateSenderName();
});
function updateSenderName() {
  const m = state.members[state.currentSenderId];
  if (m) {
    document.getElementById('currentSenderName').textContent = `${m.emoji} ${m.name}`;
  }
}

// ===========================
// ボタン管理
// ===========================
function sortedButtonIds() {
  return Object.keys(state.buttons).sort((a,b) => {
    const oa = state.buttons[a].order ?? 0;
    const ob = state.buttons[b].order ?? 0;
    return oa - ob;
  });
}

function renderButtons() {
  const list = document.getElementById('buttonList');
  list.innerHTML = '';
  const ids = sortedButtonIds();
  if (ids.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだボタンがありません</p>';
    return;
  }
  ids.forEach(id => {
    const b = state.buttons[id];
    const div = document.createElement('div');
    div.className = 'btn-list-item';
    div.innerHTML = `
      <span class="btn-list-emoji">${b.emoji}</span>
      <span class="btn-list-name">${escapeHtml(b.label)}</span>
      <button class="icon-btn" data-act="del" data-id="${id}">🗑️</button>
    `;
    div.querySelector('[data-act="del"]').addEventListener('click', () => askDeleteButton(id));
    list.appendChild(div);
  });
}

document.getElementById('addButtonBtn').addEventListener('click', async () => {
  const label = document.getElementById('newButtonLabel').value.trim();
  const emoji = document.getElementById('newButtonEmojiBtn').textContent;
  if (!label) { showToast('なまえを入れてね'); return; }
  const id = genId();
  const order = Object.keys(state.buttons).length;
  await db.ref('buttons/' + id).set({ label, emoji, order });
  document.getElementById('newButtonLabel').value = '';
  document.getElementById('newButtonEmojiBtn').textContent = '💕';
  showToast('ボタン追加しました 🎀');
});

let pendingButtonDelete = null;
function askDeleteButton(id) {
  pendingButtonDelete = id;
  const b = state.buttons[id];
  document.getElementById('buttonDeleteText').textContent = `${b.emoji} ${b.label} を削除しますか？`;
  document.getElementById('buttonDeleteModal').classList.add('show');
}
document.getElementById('buttonDeleteCancel').addEventListener('click', () => {
  document.getElementById('buttonDeleteModal').classList.remove('show');
});
document.getElementById('buttonDeleteConfirm').addEventListener('click', async () => {
  if (pendingButtonDelete) {
    await db.ref('buttons/' + pendingButtonDelete).remove();
    pendingButtonDelete = null;
    showToast('削除しました');
  }
  document.getElementById('buttonDeleteModal').classList.remove('show');
});

// ===========================
// すいっちボタン（押す）
// ===========================
function renderSwitchGrid() {
  const grid = document.getElementById('switchGrid');
  grid.innerHTML = '';
  const ids = sortedButtonIds();
  if (ids.length === 0) {
    grid.innerHTML = '<p class="empty-msg" style="grid-column:1/-1">「かんり」タブからボタンを追加してね</p>';
    return;
  }
  ids.forEach(id => {
    const b = state.buttons[id];
    const btn = document.createElement('button');
    btn.className = 'switch-btn';
    btn.innerHTML = `
      <div class="switch-btn-emoji">${b.emoji}</div>
      <div class="switch-btn-label">${escapeHtml(b.label)}</div>
    `;
    btn.addEventListener('click', () => pressSwitch(id, btn));
    grid.appendChild(btn);
  });
}

async function pressSwitch(buttonId, el) {
  if (!state.currentSenderId) {
    showToast('送り手を選んでね');
    return;
  }
  el.classList.add('sending');
  setTimeout(() => el.classList.remove('sending'), 600);

  const recordId = genId();
  await db.ref('records/' + recordId).set({
    memberId: state.currentSenderId,
    buttonId,
    timestamp: Date.now(),
  });
  const b = state.buttons[buttonId];
  showToast(`${b.emoji} ${b.label} を送ったよ`);
}

// ===========================
// 履歴
// ===========================
function renderFilters() {
  const fm = document.getElementById('filterMember');
  const fb = document.getElementById('filterButton');
  const curM = fm.value, curB = fb.value;
  fm.innerHTML = '<option value="">ぜんいん</option>';
  Object.entries(state.members).forEach(([id, m]) => {
    fm.innerHTML += `<option value="${id}">${m.emoji} ${escapeHtml(m.name)}</option>`;
  });
  fb.innerHTML = '<option value="">すべてのきもち</option>';
  sortedButtonIds().forEach(id => {
    const b = state.buttons[id];
    fb.innerHTML += `<option value="${id}">${b.emoji} ${escapeHtml(b.label)}</option>`;
  });
  fm.value = curM;
  fb.value = curB;
}
document.getElementById('filterMember').addEventListener('change', renderHistory);
document.getElementById('filterButton').addEventListener('change', renderHistory);

function renderHistory() {
  const list = document.getElementById('historyList');
  list.innerHTML = '';
  const fm = document.getElementById('filterMember').value;
  const fb = document.getElementById('filterButton').value;

  const items = Object.entries(state.records)
    .map(([id, r]) => ({ id, ...r }))
    .filter(r => !fm || r.memberId === fm)
    .filter(r => !fb || r.buttonId === fb)
    .sort((a,b) => b.timestamp - a.timestamp);

  if (items.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだ記録がありません</p>';
    return;
  }
  items.forEach(r => {
    const m = state.members[r.memberId];
    const b = state.buttons[r.buttonId];
    const memberStr = m ? `${m.emoji} ${m.name}` : '（削除済み）';
    const btnStr = b ? `${b.emoji} ${b.label}` : '（削除済み）';
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="history-emoji">${b ? b.emoji : '❓'}</div>
      <div class="history-info">
        <div class="history-line1">${escapeHtml(memberStr)} → ${escapeHtml(btnStr)}</div>
        <div class="history-line2">${fmtRelative(r.timestamp)} ・ ${fmtDate(r.timestamp)}</div>
      </div>
      <div class="history-actions">
        <button class="icon-btn" data-act="edit">✏️</button>
        <button class="icon-btn" data-act="del">🗑️</button>
      </div>
    `;
    div.querySelector('[data-act="edit"]').addEventListener('click', () => openEdit(r.id));
    div.querySelector('[data-act="del"]').addEventListener('click', () => openDelete(r.id));
    list.appendChild(div);
  });
}

// ===========================
// 編集モーダル
// ===========================
let editingId = null;
function openEdit(id) {
  editingId = id;
  const r = state.records[id];
  if (!r) return;
  const em = document.getElementById('editMember');
  const eb = document.getElementById('editButton');
  em.innerHTML = '';
  Object.entries(state.members).forEach(([mid, m]) => {
    em.innerHTML += `<option value="${mid}">${m.emoji} ${escapeHtml(m.name)}</option>`;
  });
  eb.innerHTML = '';
  sortedButtonIds().forEach(bid => {
    const b = state.buttons[bid];
    eb.innerHTML += `<option value="${bid}">${b.emoji} ${escapeHtml(b.label)}</option>`;
  });
  em.value = r.memberId;
  eb.value = r.buttonId;

  const d = new Date(r.timestamp);
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('editDatetime').value =
    `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  document.getElementById('editModal').classList.add('show');
}
document.getElementById('editCancel').addEventListener('click', () => {
  document.getElementById('editModal').classList.remove('show');
});
document.getElementById('editSave').addEventListener('click', async () => {
  if (!editingId) return;
  const memberId = document.getElementById('editMember').value;
  const buttonId = document.getElementById('editButton').value;
  const dt = document.getElementById('editDatetime').value;
  const timestamp = new Date(dt).getTime();
  await db.ref('records/' + editingId).update({ memberId, buttonId, timestamp });
  document.getElementById('editModal').classList.remove('show');
  showToast('保存しました ✅');
  editingId = null;
});

// ===========================
// 削除モーダル
// ===========================
let deletingId = null;
function openDelete(id) {
  deletingId = id;
  document.getElementById('deleteModal').classList.add('show');
}
document.getElementById('deleteCancel').addEventListener('click', () => {
  document.getElementById('deleteModal').classList.remove('show');
});
document.getElementById('deleteConfirm').addEventListener('click', async () => {
  if (deletingId) {
    await db.ref('records/' + deletingId).remove();
    showToast('削除しました');
    deletingId = null;
  }
  document.getElementById('deleteModal').classList.remove('show');
});

// ===========================
// 分析
// ===========================
function renderAnalytics() {
  const records = Object.values(state.records);
  const total = records.length;
  const today = new Date(); today.setHours(0,0,0,0);
  const todayCount = records.filter(r => r.timestamp >= today.getTime()).length;
  const week = today.getTime() - 6 * 86400000;
  const weekCount = records.filter(r => r.timestamp >= week).length;
  const memCount = Object.keys(state.members).length;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-box"><div class="stat-num">${total}</div><div class="stat-lbl">ぜんぶ</div></div>
    <div class="stat-box"><div class="stat-num">${todayCount}</div><div class="stat-lbl">きょう</div></div>
    <div class="stat-box"><div class="stat-num">${weekCount}</div><div class="stat-lbl">こんしゅう</div></div>
    <div class="stat-box"><div class="stat-num">${memCount}</div><div class="stat-lbl">メンバー</div></div>
  `;

  // 時間帯
  const hours = new Array(24).fill(0);
  records.forEach(r => hours[new Date(r.timestamp).getHours()]++);
  renderBarChart('hourChart', hours.map((v,i) => ({ label: i + '時', value: v })));

  // 曜日
  const days = new Array(7).fill(0);
  const dnames = ['日','月','火','水','木','金','土'];
  records.forEach(r => days[new Date(r.timestamp).getDay()]++);
  renderBarChart('dayChart', days.map((v,i) => ({ label: dnames[i] + '曜', value: v })));

  // ボタンランキング
  const btnCount = {};
  records.forEach(r => { btnCount[r.buttonId] = (btnCount[r.buttonId] || 0) + 1; });
  const btnRank = Object.entries(btnCount)
    .map(([id, v]) => {
      const b = state.buttons[id];
      return { label: b ? `${b.emoji} ${b.label}` : '（削除）', value: v };
    })
    .sort((a,b) => b.value - a.value);
  renderBarChart('buttonChart', btnRank);

  renderCalendar();
  renderCombos();
}

function renderBarChart(targetId, items) {
  const max = Math.max(1, ...items.map(i => i.value));
  const el = document.getElementById(targetId);
  if (items.every(i => i.value === 0)) {
    el.innerHTML = '<p class="empty-msg" style="padding:14px">まだデータがありません</p>';
    return;
  }
  el.innerHTML = items.map(i => `
    <div class="bar-row">
      <span class="bar-label">${escapeHtml(i.label)}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${i.value / max * 100}%"></div>
        <span class="bar-num">${i.value}</span>
      </div>
    </div>
  `).join('');
}

// カレンダー
function renderCalendar() {
  const y = calMonth.getFullYear();
  const m = calMonth.getMonth();
  document.getElementById('calMonth').textContent = `${y}年${m+1}月`;

  const first = new Date(y, m, 1);
  const last = new Date(y, m+1, 0);
  const days = last.getDate();
  const startDay = first.getDay();

  // 日ごとの集計
  const byDay = {};
  Object.values(state.records).forEach(r => {
    const d = new Date(r.timestamp);
    if (d.getFullYear() === y && d.getMonth() === m) {
      const k = d.getDate();
      byDay[k] = (byDay[k] || 0) + 1;
    }
  });

  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';
  ['日','月','火','水','木','金','土'].forEach(h => {
    const c = document.createElement('div');
    c.className = 'cal-cell head';
    c.textContent = h;
    grid.appendChild(c);
  });
  for (let i = 0; i < startDay; i++) {
    const c = document.createElement('div');
    c.className = 'cal-cell empty';
    grid.appendChild(c);
  }
  for (let d = 1; d <= days; d++) {
    const c = document.createElement('div');
    c.className = 'cal-cell' + (byDay[d] ? ' has' : '');
    c.innerHTML = `${d}${byDay[d] ? `<span class="count">${byDay[d]}</span>` : ''}`;
    grid.appendChild(c);
  }
}
document.getElementById('calPrev').addEventListener('click', () => {
  calMonth.setMonth(calMonth.getMonth() - 1);
  renderCalendar();
});
document.getElementById('calNext').addEventListener('click', () => {
  calMonth.setMonth(calMonth.getMonth() + 1);
  renderCalendar();
});

// 組み合わせ（同じ日に押されたボタンのペア）
function renderCombos() {
  const byDate = {};
  Object.values(state.records).forEach(r => {
    const d = new Date(r.timestamp);
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!byDate[k]) byDate[k] = new Set();
    byDate[k].add(r.buttonId);
  });
  const pairCount = {};
  Object.values(byDate).forEach(set => {
    const arr = [...set];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i+1; j < arr.length; j++) {
        const key = [arr[i], arr[j]].sort().join('::');
        pairCount[key] = (pairCount[key] || 0) + 1;
      }
    }
  });
  const sorted = Object.entries(pairCount)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 8);
  const el = document.getElementById('comboList');
  if (sorted.length === 0) {
    el.innerHTML = '<p class="empty-msg" style="padding:8px">まだ組み合わせのデータがありません</p>';
    return;
  }
  el.innerHTML = sorted.map(([key, cnt]) => {
    const [a, b] = key.split('::');
    const ba = state.buttons[a], bb = state.buttons[b];
    if (!ba || !bb) return '';
    return `
      <div class="bar-row">
        <span style="flex:1;font-size:13px">${ba.emoji}${escapeHtml(ba.label)} ＋ ${bb.emoji}${escapeHtml(bb.label)}</span>
        <span style="font-weight:700;color:var(--pink-deep)">${cnt}回</span>
      </div>
    `;
  }).join('');
}

// ===========================
// 通知
// ===========================
function updateNotifStatus() {
  const status = document.getElementById('notifStatus');
  const text = document.getElementById('notifStatusText');
  const btn = document.getElementById('enableNotifBtn');

  if (!('Notification' in window)) {
    text.textContent = 'このブラウザは通知に対応していません';
    btn.style.display = 'none';
    return;
  }
  if (Notification.permission === 'granted') {
    status.classList.add('on');
    text.textContent = '通知はオンです ✅';
    btn.textContent = '通知を再登録する';
  } else if (Notification.permission === 'denied') {
    text.textContent = '通知がブロックされています';
    btn.textContent = 'ブラウザの設定から許可してください';
  } else {
    text.textContent = '通知はオフです';
    btn.textContent = '通知を有効にする';
  }
}

document.getElementById('enableNotifBtn').addEventListener('click', async () => {
  if (!messaging) { showToast('このブラウザは非対応です'); return; }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { showToast('通知が許可されませんでした'); updateNotifStatus(); return; }

    const token = await messaging.getToken({ vapidKey: VAPID_KEY });
    if (token) {
      // メンバーに紐づける（送信者ではなく、その端末を使う人として保存）
      // 簡易仕様：現在の送信者IDに紐づける
      const sid = state.currentSenderId;
      if (sid) {
        await db.ref(`tokens/${sid}/${token}`).set({ updated: Date.now() });
        showToast('通知を有効にしました 🔔');
      } else {
        // メンバー未選択でもグローバルに保存
        await db.ref(`tokens/_unassigned/${token}`).set({ updated: Date.now() });
        showToast('通知を有効にしました（メンバー未指定）');
      }
    }
  } catch (e) {
    console.error(e);
    showToast('通知設定でエラー');
  }
  updateNotifStatus();
});

// フォアグラウンド受信時のハンドリング
if (messaging) {
  messaging.onMessage(payload => {
    const title = payload?.notification?.title || '新しいおしらせ';
    const body = payload?.notification?.body || '';
    showToast(`${title} - ${body}`, 3000);
  });
}

// Service Worker 登録
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('firebase-messaging-sw.js').catch(err => {
    console.warn('SW登録失敗:', err);
  });
}

// ===========================
// HTMLエスケープ
// ===========================
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
