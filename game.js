'use strict';

// LUCK 50 (rebuilt): no login, no external data sending.
// Score / best / local ranking are stored only in this browser (localStorage).
// Restarts (continues) are limited to 5 per day, free of charge, resetting next day.

var LS_NAME = 'luck50.displayName';
var LS_BEST = 'luck50.bestScore';
var LS_RANKING = 'luck50.ranking';
var LS_RESTARTS = 'luck50.restartsDaily';
var MAX_RESTARTS = 5;
var MAX_RANKING = 5;

var score = 0;
var streak = 0;
var isGameOver = false;
var restartsLeft = loadRestarts();
var best = loadBest();

function todayStr() {
  var d = new Date();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

function loadRestarts() {
  try {
    var raw = localStorage.getItem(LS_RESTARTS);
    if (!raw) return MAX_RESTARTS;
    var obj = JSON.parse(raw);
    if (!obj || obj.date !== todayStr()) return MAX_RESTARTS;
    var n = parseInt(obj.left, 10);
    return isNaN(n) ? MAX_RESTARTS : Math.max(0, Math.min(MAX_RESTARTS, n));
  } catch (e) {
    return MAX_RESTARTS;
  }
}

function saveRestarts() {
  try { localStorage.setItem(LS_RESTARTS, JSON.stringify({ date: todayStr(), left: restartsLeft })); } catch (e) { /* ignore */ }
}

function loadBest() {
  try {
    var n = parseInt(localStorage.getItem(LS_BEST) || '0', 10);
    return isNaN(n) ? 0 : n;
  } catch (e) {
    return 0;
  }
}

function saveBest() {
  try { localStorage.setItem(LS_BEST, String(best)); } catch (e) { /* ignore */ }
}

function getDisplayName() {
  var input = document.getElementById('display-name');
  var name = (input && input.value ? input.value : '').trim();
  return name || 'Player';
}

function loadRanking() {
  try {
    var raw = localStorage.getItem(LS_RANKING);
    if (!raw) return [];
    var arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function saveRanking(arr) {
  try { localStorage.setItem(LS_RANKING, JSON.stringify(arr)); } catch (e) { /* ignore */ }
}

function addRankingEntry(name, entryScore) {
  if (!entryScore || entryScore <= 0) return;
  var arr = loadRanking();
  arr.push({ name: name, score: entryScore, date: new Date().toISOString().slice(0, 10) });
  arr.sort(function (a, b) { return b.score - a.score; });
  saveRanking(arr.slice(0, MAX_RANKING));
}

function rankFor(value) {
  if (value >= 1000) return '運の神様';
  if (value >= 700) return '奇跡を呼ぶ者';
  if (value >= 400) return '超強運';
  if (value >= 200) return '強運';
  if (value >= 100) return '幸運の持ち主';
  if (value >= 50) return '運試し上手';
  if (value >= 20) return '見習い挑戦者';
  return '初心者';
}

function fireConfetti(options) {
  try {
    if (typeof confetti === 'function') confetti(options);
  } catch (e) { /* confetti is optional decoration */ }
}

function renderRanking() {
  var list = document.getElementById('ranking-list');
  var arr = loadRanking();
  if (!arr.length) {
    list.innerHTML = '<div class="ranking-empty">まだ記録がありません。遊んで記録を作ろう。</div>';
    return;
  }
  list.innerHTML = '';
  arr.forEach(function (item, idx) {
    var row = document.createElement('div');
    row.className = 'ranking-item';
    var left = document.createElement('span');
    left.textContent = (idx + 1) + '. ' + item.name;
    var right = document.createElement('span');
    right.textContent = Number(item.score).toLocaleString() + ' pt';
    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  });
}

function updateUI() {
  document.getElementById('score-text').textContent = score.toLocaleString();
  document.getElementById('rank-text').textContent = rankFor(score);
  document.getElementById('best-text').textContent = best.toLocaleString() + ' pt';
  document.getElementById('streak-text').textContent = streak + ' 回';
  document.getElementById('restarts-text').textContent = restartsLeft + ' 回';
  document.getElementById('normal-btns').style.display = isGameOver ? 'none' : 'grid';
  document.getElementById('resume-btn').style.display = (isGameOver && restartsLeft > 0) ? 'block' : 'none';
  document.getElementById('resume-btn').textContent = '再開する（のこり ' + restartsLeft + ' 回）';
  document.getElementById('restarts-note').style.display = (isGameOver && restartsLeft <= 0) ? 'block' : 'none';
  document.getElementById('save-btn').style.display = (!isGameOver && score > 0) ? 'block' : 'none';
  renderRanking();
}

function setStatus(text, color, miracle) {
  var el = document.getElementById('status-msg');
  el.textContent = text;
  el.className = miracle ? 'miracle-status' : '';
  el.style.color = color || '#888';
}

function challenge(prob, gain) {
  if (isGameOver) return;
  if (prob === 0.01 && !window.confirm('1%の奇跡に挑戦しますか？失敗するとスコアは0になります。')) return;

  if (Math.random() < prob) {
    streak += 1;
    if (gain === 'double') {
      score = (score === 0) ? 10 : score * 2;
      setStatus('MIRACLE!!!', '#ffd700', true);
      fireConfetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } else {
      score += gain;
      setStatus('SUCCESS! (+' + gain + 'pt)', '#00ff88', false);
      if (prob <= 0.25) fireConfetti({ particleCount: 60, spread: 55, origin: { y: 0.6 } });
    }
    if (score > best) { best = score; saveBest(); }
  } else {
    var finalScore = score;
    if (finalScore > 0) {
      addRankingEntry(getDisplayName(), finalScore);
      if (finalScore > best) { best = finalScore; saveBest(); }
    }
    score = 0;
    streak = 0;
    isGameOver = true;
    setStatus(finalScore > 0 ? 'FAILED... ' + finalScore.toLocaleString() + 'ptでゲームオーバー' : 'FAILED... ゲームオーバー', '#ff0055', false);
  }
  updateUI();
}

document.getElementById('btn-75').addEventListener('click', function () { challenge(0.75, 10); });
document.getElementById('btn-50').addEventListener('click', function () { challenge(0.50, 20); });
document.getElementById('btn-25').addEventListener('click', function () { challenge(0.25, 50); });
document.getElementById('btn-1').addEventListener('click', function () { challenge(0.01, 'double'); });

document.getElementById('resume-btn').addEventListener('click', function () {
  if (!isGameOver || restartsLeft <= 0) return;
  restartsLeft -= 1;
  saveRestarts();
  score = 0;
  streak = 0;
  isGameOver = false;
  setStatus('READY', '#888', false);
  updateUI();
});

document.getElementById('save-btn').addEventListener('click', function () {
  if (isGameOver || score <= 0) return;
  if (!window.confirm('ランキングに保存して、この回を終了しますか？')) return;
  addRankingEntry(getDisplayName(), score);
  if (score > best) { best = score; saveBest(); }
  score = 0;
  streak = 0;
  isGameOver = true;
  setStatus('ランキングに保存しました', '#00ff88', false);
  updateUI();
});

document.getElementById('clear-ranking-btn').addEventListener('click', function () {
  if (!window.confirm('この端末のランキングと自己ベストを消去しますか？')) return;
  try {
    localStorage.removeItem(LS_RANKING);
    localStorage.removeItem(LS_BEST);
  } catch (e) { /* ignore */ }
  best = 0;
  updateUI();
});

(function init() {
  var input = document.getElementById('display-name');
  try { input.value = localStorage.getItem(LS_NAME) || 'Player'; } catch (e) { input.value = 'Player'; }
  input.addEventListener('change', function () {
    try { localStorage.setItem(LS_NAME, getDisplayName()); } catch (e) { /* ignore */ }
  });
  updateUI();
})();
