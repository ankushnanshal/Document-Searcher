import { state } from '../state.js';
import { getRoleDisplay } from '../constants.js';
import { showInputModal } from '../ui/modals.js';
import { showNotification } from '../utils/notifications.js';
import { getIncomingRequests, getOutgoingRequests, approveRequest, rejectRequest, cancelRequest, getPendingCount } from '../api/deletionRequests.js';
import { fetchDocuments } from '../documents/documentList.js';
import { fetchNotifications } from '../notifications/notifications.js';

export function removeDeletionRequestsTab() {
  const tab = document.querySelector('.filter-tab[data-category="deletion_requests"]');
  if (tab) tab.remove();
}

export function updateRequestTabBadge(count) {
  let reqTab = document.querySelector('.filter-tab[data-category="deletion_requests"]');
  if (!reqTab && state.isUserLoggedIn && state.currentUserPermissions) {
    const filterContainer = document.querySelector('.category-filter-table');
    if (filterContainer) {
      reqTab = document.createElement('div');
      reqTab.className = 'filter-tab';
      reqTab.setAttribute('data-category', 'deletion_requests');
      reqTab.innerHTML = `<i class="fa-solid fa-inbox"></i> Deletion Requests${count > 0 ? ` (${count})` : ''}`;
      filterContainer.appendChild(reqTab);
      reqTab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        reqTab.classList.add('active');
        state.currentSelectedCategory = 'deletion_requests';
        showDeletionRequestsModal();
        const ss = document.getElementById('searchSuggestions');
        if (ss) ss.classList.add('hidden');
      });
    }
  } else if (reqTab) {
    reqTab.innerHTML = `<i class="fa-solid fa-inbox"></i> Deletion Requests${count > 0 ? ` (${count})` : ''}`;
  }
}

export async function fetchDeletionRequests() {
  if (!state.isUserLoggedIn) return;
  try {
    const response = await getPendingCount();
    if (response.ok) {
      const data = await response.json();
      updateRequestTabBadge(data.count);
    }
  } catch (e) {
    console.error("Error fetching deletion requests count:", e);
  }
}

async function loadRequestTab(tab, container) {
  container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 40px;">Loading...</div>';
  try {
    const response = tab === 'incoming' ? await getIncomingRequests() : await getOutgoingRequests();
    if (!response.ok) throw new Error("Failed to fetch");
    const requests = await response.json();
    renderRequestList(requests, container, tab);
  } catch (e) {
    container.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 40px;">Failed to load requests.</div>';
  }
}

function renderRequestList(requests, container, tab) {
  if (!requests || requests.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 40px;">No ${tab} requests.</div>`;
    return;
  }
  container.innerHTML = '';
  const filtered = tab === 'incoming' ? requests.filter(r => r.status === 'pending') : requests;
  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 40px;">No ${tab} requests.</div>`;
    return;
  }
  filtered.forEach(req => {
    const card = document.createElement('div');
    card.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); border-radius: 12px; padding: 16px; margin-bottom: 12px;';
    let actionButtons = '';
    if (tab === 'incoming' && req.status === 'pending') {
      actionButtons = `
        <button class="req-approve-btn" style="background: rgba(74,222,128,0.1); color: #4ade80; border: 1px solid rgba(74,222,128,0.3); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 500;"><i class="fa-solid fa-check"></i> Approve Delete</button>
        <button class="req-reject-btn" style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 500;"><i class="fa-solid fa-xmark"></i> Reject Request</button>
      `;
    } else if (tab === 'outgoing' && req.status === 'pending') {
      actionButtons = `
        <button class="req-cancel-req-btn" style="background: rgba(148,163,184,0.1); color: #94a3b8; border: 1px solid var(--border-glass); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem;">Cancel Request</button>
      `;
    }
    let statusColor = '#3b82f6';
    if (req.status === 'approved') statusColor = '#4ade80';
    if (req.status === 'rejected') statusColor = '#ef4444';
    if (req.status === 'cancelled') statusColor = '#94a3b8';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
        <div>
          <h4 style="color: #f1f5f9; font-size: 1rem; font-weight: 600; margin-bottom: 4px;">${req.resourceName}</h4>
          <p style="color: #94a3b8; font-size: 0.8rem;">Requested by: ${req.requesterName || req.requestedBy} (${getRoleDisplay(req.requesterRole)})</p>
          <p style="color: #94a3b8; font-size: 0.8rem;">Original Uploader: ${req.originalUploaderName || req.originalUploader}</p>
          <p style="color: #94a3b8; font-size: 0.8rem;">Target: ${req.targetAuthority}</p>
          <p style="color: #94a3b8; font-size: 0.8rem;">Type: ${req.requestType === 'UPLOADER_APPROVAL' ? 'Original Uploader' : 'Higher Authority'}</p>
          <p style="color: #94a3b8; font-size: 0.8rem;">Date: ${new Date(req.createdAt).toLocaleString()}</p>
          ${req.respondedBy ? `<p style="color: #94a3b8; font-size: 0.8rem;">Responded by: ${req.respondedBy} on ${new Date(req.respondedAt).toLocaleString()}</p>` : ''}
        </div>
        <span style="background: ${statusColor}; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 600;">${req.status.toUpperCase()}</span>
      </div>
      <div style="background: rgba(251,191,36,0.08); border-left: 3px solid #fbbf24; padding: 10px; border-radius: 4px; margin-bottom: 12px;">
        <p style="color: #fbbf24; font-size: 0.75rem; font-weight: 600; margin-bottom: 4px;">Reason:</p>
        <p style="color: #e2e8f0; font-size: 0.85rem;">${req.comment}</p>
      </div>
      ${req.responseComment ? `<div style="background: rgba(99,102,241,0.08); border-left: 3px solid #6366f1; padding: 10px; border-radius: 4px; margin-bottom: 12px;"><p style="color: #a5b4fc; font-size: 0.75rem; font-weight: 600; margin-bottom: 4px;">Response:</p><p style="color: #e2e8f0; font-size: 0.85rem;">${req.responseComment}</p></div>` : ''}
      <div style="display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
        ${actionButtons}
      </div>
    `;
    container.appendChild(card);

    const approveBtn = card.querySelector('.req-approve-btn');
    const rejectBtn = card.querySelector('.req-reject-btn');
    const cancelReqBtn = card.querySelector('.req-cancel-req-btn');

    if (approveBtn) approveBtn.addEventListener('click', () => handleApproveRequest(req._id));
    if (rejectBtn) rejectBtn.addEventListener('click', () => handleRejectRequest(req._id));
    if (cancelReqBtn) cancelReqBtn.addEventListener('click', () => handleCancelRequest(req._id));
  });
}

async function handleApproveRequest(requestId) {
  showInputModal(
    "Approve Deletion Request",
    "Optional response comment...",
    "",
    async (responseComment) => {
      try {
        const { response, data } = await approveRequest(requestId, responseComment);
        if (response.ok) {
          showNotification("Request approved. Resource deleted.", "success");
          fetchDocuments(document.getElementById('searchInput') ? document.getElementById('searchInput').value.trim() : "");
          fetchNotifications();
          const reqContent = document.querySelector('.req-content');
          if (reqContent) {
            const activeTab = document.querySelector('.req-tab.active');
            if (activeTab) loadRequestTab(activeTab.dataset.tab, reqContent);
          }
        } else {
          showNotification(data.message || "Approval failed.", "error");
        }
      } catch (e) {
        showNotification("Network error.", "error");
      }
    },
    false
  );
}

async function handleRejectRequest(requestId) {
  showInputModal(
    "Reject Deletion Request",
    "Optional response comment...",
    "",
    async (responseComment) => {
      try {
        const { response, data } = await rejectRequest(requestId, responseComment);
        if (response.ok) {
          showNotification("Request rejected.", "success");
          fetchNotifications();
          const reqContent = document.querySelector('.req-content');
          if (reqContent) {
            const activeTab = document.querySelector('.req-tab.active');
            if (activeTab) loadRequestTab(activeTab.dataset.tab, reqContent);
          }
        } else {
          showNotification(data.message || "Rejection failed.", "error");
        }
      } catch (e) {
        showNotification("Network error.", "error");
      }
    },
    false
  );
}

async function handleCancelRequest(requestId) {
  try {
    const { response, data } = await cancelRequest(requestId);
    if (response.ok) {
      showNotification("Request cancelled.", "success");
      const reqContent = document.querySelector('.req-content');
      if (reqContent) {
        const activeTab = document.querySelector('.req-tab.active');
        if (activeTab) loadRequestTab(activeTab.dataset.tab, reqContent);
      }
    } else {
      showNotification(data.message || "Cancel failed.", "error");
    }
  } catch (e) {
    showNotification("Network error.", "error");
  }
}

export function showDeletionRequestsModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '5500';
  modal.innerHTML = `
    <div class="modal-glass-card" style="max-width: 800px; width: 90%; max-height: 85vh; display: flex; flex-direction: column;">
      <div class="modal-top-bar" style="border-bottom: 1px solid var(--border-glass); padding-bottom: 12px;">
        <h3 style="color: #fbbf24; font-size: 1.2rem; display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-inbox"></i> Deletion Requests
        </h3>
        <button class="modal-dismiss-icon" style="color: #94a3b8;">&times;</button>
      </div>
      <div style="display: flex; gap: 8px; padding: 12px 0; border-bottom: 1px solid var(--border-glass);">
        <button class="req-tab active" data-tab="incoming" style="background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3); padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; cursor: pointer;">Incoming</button>
        <button class="req-tab" data-tab="outgoing" style="background: transparent; color: #94a3b8; border: 1px solid var(--border-glass); padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; cursor: pointer;">Outgoing</button>
      </div>
      <div class="req-content" style="flex: 1; overflow-y: auto; padding: 16px 0;">
        <div style="text-align: center; color: #94a3b8; padding: 40px;">Loading...</div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const closeBtn = modal.querySelector('.modal-dismiss-icon');
  const content = modal.querySelector('.req-content');
  const tabs = modal.querySelectorAll('.req-tab');
  const close = () => {
    modal.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => modal.remove(), 180);
  };
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.style.background = 'transparent';
        t.style.color = '#94a3b8';
        t.style.borderColor = 'var(--border-glass)';
      });
      tab.classList.add('active');
      tab.style.background = 'rgba(99,102,241,0.15)';
      tab.style.color = '#a5b4fc';
      tab.style.borderColor = 'rgba(99,102,241,0.3)';
      loadRequestTab(tab.dataset.tab, content);
    });
  });

  loadRequestTab('incoming', content);
}