import { els } from '../utils/dom.js';
import { logHistory } from '../history/history.js';

export function openPreviewModal(title, fileUrl, docId) {
  logHistory(title, docId);
  if (!els.previewModal || !els.previewContainer || !els.previewModalTitle) return;
  els.previewModalTitle.textContent = title;
  els.previewContainer.innerHTML = '';
  els.previewModal.classList.remove('hidden');
  if (!fileUrl) {
    const pre = document.createElement('pre');
    pre.textContent = "Preview unavailable for this asset.";
    pre.style.color = '#94a3b8';
    els.previewContainer.appendChild(pre);
    return;
  }
  const lowerTitle = title.toLowerCase();
  const fileExtension = fileUrl.split('.').pop().toLowerCase().split('?')[0];
  if (lowerTitle.endsWith('.pdf') || fileExtension === 'pdf') {
    const iframe = document.createElement('iframe');
    iframe.src = fileUrl;
    iframe.style.cssText = 'width:100%;height:70vh;border:none;border-radius:8px;display:block;';
    els.previewContainer.appendChild(iframe);
  } else if (['png','jpg','jpeg','gif','webp','tiff'].includes(fileExtension) ||
             lowerTitle.endsWith('.png') || lowerTitle.endsWith('.jpg') || lowerTitle.endsWith('.jpeg')) {
    const img = document.createElement('img');
    img.src = fileUrl;
    img.style.cssText = 'max-width:100%;max-height:70vh;object-fit:contain;border-radius:8px;display:block;';
    els.previewContainer.appendChild(img);
  } else if (['txt','csv','json','md'].includes(fileExtension)) {
    const iframe = document.createElement('iframe');
    iframe.src = fileUrl;
    iframe.style.cssText = 'width:100%;height:70vh;border:none;border-radius:8px;background:#fff;display:block;';
    els.previewContainer.appendChild(iframe);
  } else {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;gap:16px;color:#94a3b8;text-align:center;';
    wrapper.innerHTML = `
      <i class="fa-solid fa-file" style="font-size:3rem;color:#64748b;"></i>
      <p style="color:#94a3b8;max-width:400px;">Preview not supported for this file type.</p>
      <a href="${fileUrl}" target="_blank" rel="noopener" style="background:var(--accent-gradient);color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:500;display:inline-flex;align-items:center;gap:8px;">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> Open in new tab
      </a>
    `;
    els.previewContainer.appendChild(wrapper);
  }
}

export function setupPreviewModal() {
  if (els.closePreviewModalBtn) {
    els.closePreviewModalBtn.addEventListener('click', () => {
      if (els.previewModal) els.previewModal.classList.add('hidden');
      if (els.previewContainer) els.previewContainer.innerHTML = '';
    });
  }
}