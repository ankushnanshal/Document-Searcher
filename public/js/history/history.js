import { state } from '../state.js';
import { els } from '../utils/dom.js';
import { showNotification } from '../utils/notifications.js';
import { logHistoryApi, fetchHistoryApi, clearHistoryApi } from '../api/history.js';

export async function logHistory(title, documentId) {
  if (!state.activeUserEmail) return;
  try {
    await logHistoryApi(title, documentId);
    fetchHistory();
  } catch (err) {
    console.error(err);
  }
}

export async function fetchHistory() {
  if (!state.activeUserEmail) return;
  try {
    const response = await fetchHistoryApi(state.activeUserEmail);
    const data = await response.json();
    if (els.recentActivityList) {
      els.recentActivityList.innerHTML = '';
      const recent = data.slice(0, 5);
      if (recent.length === 0) {
        els.recentActivityList.innerHTML = '<span class="history-empty-state" style="padding:8px; font-size:0.8rem;">No recent views</span>';
      } else {
        recent.forEach(item => {
          const div = document.createElement('div');
          div.style.padding = '6px 12px';
          div.style.fontSize = '0.8rem';
          div.style.color = '#94a3b8';
          div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
          div.innerText = item.title;
          els.recentActivityList.appendChild(div);
        });
      }
    }
    if (els.historyCountText) els.historyCountText.textContent = `${data.length} items recorded`;
    if (els.fullHistoryContainer) {
      els.fullHistoryContainer.innerHTML = data.length === 0
        ? '<span class="history-empty-state">No download or viewing history found.</span>'
        : '';
      data.forEach(item => {
        const row = document.createElement('div');
        row.className = 'document-row-card';
        row.innerHTML = `<div class="doc-body-details"><h3>${item.title}</h3><p>Viewed on: ${new Date(item.timestamp).toLocaleString()}</p></div>`;
        els.fullHistoryContainer.appendChild(row);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

export function setupHistory() {
  if (els.clearHistoryBtn) {
    els.clearHistoryBtn.addEventListener('click', async () => {
      if (!state.activeUserEmail) return;
      try {
        const response = await clearHistoryApi(state.activeUserEmail);
        if (response.ok) {
          showNotification("History cleared", "success");
          fetchHistory();
        }
      } catch (err) {
        showNotification("Failed to clear history", "error");
      }
    });
  }

  if (els.viewFullHistoryBtn) {
    els.viewFullHistoryBtn.addEventListener('click', () => {
      if (els.mainDashboardView) els.mainDashboardView.classList.add('hidden');
      if (els.historyPageView) els.historyPageView.classList.remove('hidden');
      if (els.draftsPageView) els.draftsPageView.classList.add('hidden');
      els.authDropdown.classList.add('hidden');
    });
  }

  if (els.backToHomeBtn) {
    els.backToHomeBtn.addEventListener('click', () => {
      if (els.historyPageView) els.historyPageView.classList.add('hidden');
      if (els.mainDashboardView) els.mainDashboardView.classList.remove('hidden');
    });
  }

  if (els.navBrandHome) {
    els.navBrandHome.addEventListener('click', () => {
      if (els.historyPageView) els.historyPageView.classList.add('hidden');
      if (els.draftsPageView) els.draftsPageView.classList.add('hidden');
      if (els.mainDashboardView) els.mainDashboardView.classList.remove('hidden');
    });
  }
}