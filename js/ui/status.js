import { el } from '../core/dom.js';
export function setStatus(type, title, detail) {
  el.statusCard.classList.remove("ready", "error");
  if (type) el.statusCard.classList.add(type);
  el.statusTitle.textContent = title;
  el.statusDetail.textContent = detail;
}

