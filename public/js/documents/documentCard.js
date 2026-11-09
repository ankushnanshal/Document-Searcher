import { state } from '../state.js';
import { canManageDrafts, canApproveDocuments, canEditDocuments, isResourceOwner, canDirectlyDelete, canRequestDelete, canCollegeWideRequestDelete } from '../utils/helpers.js';
import { openPreviewModal } from '../ui/preview.js';
import { logHistory } from '../history/history.js';
import { openEditDocumentModal } from './editModal.js';
import { showDeleteResourceConfirm, showRequestDeleteModal } from '../deletion/deletionModal.js';
import { deleteDocument, publishDraft } from './documentActions.js';
import { approveDocument, rejectDocument } from '../approvals/approvals.js';

export async function renderDocumentCard(doc, container, isPendingView) {
  const card = document.createElement('div');
  card.className = 'document-row-card';
  const isDraft = doc.status === 'draft';
  const isPending = doc.status === 'pending_approval';
  const owner = isResourceOwner(doc);
  const canDel = canDirectlyDelete(doc);
  const canReq = canRequestDelete(doc);
  const canCWReq = canCollegeWideRequestDelete(doc);

  let pillsHtml = `<span style="background: rgba(99,102,241,0.15); color: #a5b4fc; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${doc.category || 'University Paper'}</span>`;
  if (isDraft) pillsHtml += `<span style="background:#f59e0b;color:#000;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;">DRAFT</span>`;
  if (isPending) pillsHtml += `<span style="background:#3b82f6;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;">PENDING</span>`;
  if (owner) pillsHtml += `<span style="background:rgba(74,222,128,0.15);color:#4ade80;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600;">YOUR UPLOAD</span>`;
  if (doc.department) pillsHtml += `<span style="background:rgba(74,222,128,0.15);color:#4ade80;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600;">${doc.department}</span>`;
  if (doc.branch) pillsHtml += `<span style="background:rgba(99,102,241,0.15);color:#a5b4fc;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600;">${doc.branch}</span>`;

  let approvalInfo = '';
  if (isPending) {
    approvalInfo = `<p style="color:#fbbf24;font-size:0.8rem;margin-top:4px;">Stage: ${doc.approvalStage || 'pending'}</p>`;
  }

  let rejectionInfo = '';
  if (doc.rejectionReason && doc.status === 'draft') {
    rejectionInfo = `<p style="color:#fca5a5;font-size:0.8rem;margin-top:4px;padding:6px;background:rgba(239,68,68,0.1);border-radius:4px;">Rejected: ${doc.rejectionReason}</p>`;
  }

  let actionButtons = `<button class="action-btn-link view-btn" style="background:rgba(99,102,241,0.1);color:#a5b4fc;border:1px solid rgba(99,102,241,0.2);padding:6px 14px;border-radius:6px;font-weight:500;cursor:pointer;font-size:0.9rem;">View</button>`;

  if (doc.fileUrl) {
    actionButtons += `<a href="${doc.fileUrl}" target="_blank" rel="noopener" download class="action-btn-link get-btn" style="display:inline-flex;align-items:center;justify-content:center;background:var(--accent-gradient);color:#ffffff;padding:6px 14px;border-radius:6px;font-weight:500;text-decoration:none;font-size:0.9rem;">Get</a>`;
  }

  if (canManageDrafts() && isDraft) {
    actionButtons += `<button class="action-btn-link publish-btn" style="background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.2);padding:6px 14px;border-radius:6px;cursor:pointer;font-size:0.9rem;">Submit for Approval</button>`;
  }

  if (canApproveDocuments() && isPending) {
    actionButtons += `<button class="action-btn-link approve-btn" style="background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.2);padding:6px 14px;border-radius:6px;cursor:pointer;font-size:0.9rem;">Approve</button>`;
    actionButtons += `<button class="action-btn-link reject-btn" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);padding:6px 14px;border-radius:6px;cursor:pointer;font-size:0.9rem;">Reject</button>`;
  }

  if (canEditDocuments() && !isPending) {
    actionButtons += `<button class="action-btn-link edit-btn" title="Edit" style="background:rgba(234,179,8,0.1);color:#fde047;border:1px solid rgba(234,179,8,0.2);padding:6px 10px;border-radius:6px;cursor:pointer;font-size:0.9rem;"><i class="fa-solid fa-pen"></i></button>`;
  }

  let deleteTooltip = "";
  let deleteClass = "";
  let showDeleteButton = false;

  if (canDel && !isPending && !isDraft) {
    deleteTooltip = "Delete this resource";
    deleteClass = "delete-btn";
    showDeleteButton = true;
  } else if ((canReq || canCWReq) && !isPending && !isDraft) {
    deleteTooltip = "Request deletion of this resource";
    deleteClass = "req-delete-btn";
    showDeleteButton = true;
  }

  if (showDeleteButton) {
    actionButtons += `<button class="action-btn-link ${deleteClass}" title="${deleteTooltip}" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);padding:6px 14px;border-radius:6px;cursor:pointer;font-size:0.9rem;"><i class="fa-solid fa-trash"></i> Delete</button>`;
  }

  card.innerHTML = `
    <div class="doc-body-details">
      <h3>${doc.title} ${isDraft ? '<span style="background:#f59e0b;color:#000;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:700;margin-left:4px;">DRAFT</span>' : ''} ${isPending ? '<span style="background:#3b82f6;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:700;margin-left:4px;">PENDING</span>' : ''}</h3>
      <p>Category: ${doc.category} ${doc.pageCount ? `• ${doc.pageCount} pages` : ''}</p>
      ${doc.year ? `<p>Session: ${doc.year}</p>` : ''}
      ${doc.semester ? `<p>Semester: ${doc.semester}</p>` : ''}
      ${doc.branch ? `<p>Branch: ${doc.branch}</p>` : ''}
      ${doc.officialDocType ? `<p>Doc Type: ${doc.officialDocType}</p>` : ''}
      ${doc.paperType ? `<p>Type: ${doc.paperType}</p>` : ''}
      ${doc.department ? `<p>Department: ${doc.department}</p>` : ''}
      ${doc.docDate ? `<p>Date: ${doc.docDate}</p>` : ''}
      ${doc.uploadedByName || doc.uploadedBy ? `<p>Uploaded By: ${doc.uploadedByName || doc.uploadedBy}</p>` : ''}
      ${approvalInfo}
      ${rejectionInfo}
      <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">${pillsHtml}</div>
    </div>
    <div class="doc-action-zone" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      ${actionButtons}
    </div>
  `;
  container.appendChild(card);

  card.querySelector('.view-btn').addEventListener('click', () => openPreviewModal(doc.title, doc.fileUrl, doc._id));
  const getBtn = card.querySelector('.get-btn');
  if (getBtn) getBtn.addEventListener('click', () => logHistory(doc.title, doc._id));
  const editBtn = card.querySelector('.edit-btn');
  if (editBtn) editBtn.addEventListener('click', () => openEditDocumentModal(doc));

  const deleteBtn = card.querySelector('.delete-btn');
  if (deleteBtn) deleteBtn.addEventListener('click', () => showDeleteResourceConfirm(doc, (reason) => deleteDocument(doc._id, reason)));

  const reqDeleteBtn = card.querySelector('.req-delete-btn');
  if (reqDeleteBtn) reqDeleteBtn.addEventListener('click', () => showRequestDeleteModal(doc));

  const publishBtn = card.querySelector('.publish-btn');
  if (publishBtn) publishBtn.addEventListener('click', () => publishDraft(doc._id));
  const approveBtn = card.querySelector('.approve-btn');
  if (approveBtn) approveBtn.addEventListener('click', () => approveDocument(doc._id));
  const rejectBtn = card.querySelector('.reject-btn');
  if (rejectBtn) rejectBtn.addEventListener('click', () => rejectDocument(doc._id));
}