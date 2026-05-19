import { el } from '../core/dom.js';
import { setStatus } from './status.js';

/**
 * Loader state tracking
 */
const loaderState = {
  overlay: null,
  spinner: null,
  message: null,
  isVisible: false,
};

/**
 * Initialize loader DOM elements (called once at page load)
 */
export function initLoader() {
  // Create overlay container
  loaderState.overlay = document.createElement('div');
  loaderState.overlay.id = 'loading-overlay';
  loaderState.overlay.setAttribute('aria-live', 'polite');
  loaderState.overlay.setAttribute('aria-label', 'Loading application');
  loaderState.overlay.innerHTML = `
    <div class="loader-content">
      <div class="loader-spinner">
        <div class="spinner"></div>
      </div>
      <div class="loader-text">
        <p id="loader-message" class="loader-message">Initializing...</p>
        <p id="loader-detail" class="loader-detail"></p>
      </div>
    </div>
  `;
  
  document.body.appendChild(loaderState.overlay);
  loaderState.spinner = loaderState.overlay.querySelector('.spinner');
  loaderState.message = loaderState.overlay.querySelector('#loader-message');
  loaderState.detail = loaderState.overlay.querySelector('#loader-detail');
}

/**
 * Show the loader overlay
 */
export function showLoader(message = 'Loading...') {
  if (!loaderState.overlay) initLoader();
  
  loaderState.overlay.classList.add('visible');
  loaderState.isVisible = true;
  if (loaderState.message) {
    loaderState.message.textContent = message;
  }
}

/**
 * Update loader message and optional detail text
 */
export function updateLoader(message, detail = '') {
  if (loaderState.message) {
    loaderState.message.textContent = message;
  }
  if (loaderState.detail) {
    loaderState.detail.textContent = detail;
  }
}

/**
 * Hide the loader overlay
 */
export function hideLoader() {
  if (loaderState.overlay) {
    loaderState.overlay.classList.remove('visible');
    loaderState.isVisible = false;
  }
}

/**
 * Check if loader is currently visible
 */
export function isLoaderVisible() {
  return loaderState.isVisible;
}
