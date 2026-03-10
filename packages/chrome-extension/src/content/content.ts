import { PithEngine } from '@pith/core';

const engine = new PithEngine();
let lensEnabled = true;
let responseBoost = true;

// Concise response instructions — ~15 tokens that save hundreds on output
const RESPONSE_HINT_QUERY = '\n[Answer in 1-3 sentences. No intro/outro. No "Great question". Skip what I already know.]';
const RESPONSE_HINT_COMPRESS = '\n[Be concise. No filler. No recap of my input. Direct answer only. Bullets over paragraphs.]';

// Load saved state
if (typeof chrome !== 'undefined' && chrome.storage?.local) {
  chrome.storage.local.get(['lensEnabled', 'responseBoost'], (result) => {
    lensEnabled = result.lensEnabled !== false; // default ON
    responseBoost = result.responseBoost !== false; // default ON
  });

  // Listen for toggle from popup or shortcut
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.lensEnabled) {
      lensEnabled = changes.lensEnabled.newValue !== false;
      showBadge(lensEnabled ? 'PITH ON' : 'PITH OFF', lensEnabled ? '#10b981' : '#ef4444');
    }
    if (changes.responseBoost) {
      responseBoost = changes.responseBoost.newValue !== false;
    }
  });
}

// Toggle via keyboard shortcut (Ctrl+Shift+L)
document.addEventListener('keydown', (e) => {
  if (e.key === 'L' && e.ctrlKey && e.shiftKey) {
    e.preventDefault();
    lensEnabled = !lensEnabled;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ lensEnabled });
    }
    showBadge(lensEnabled ? 'PITH ON' : 'PITH OFF', lensEnabled ? '#10b981' : '#ef4444');
  }
});

// ═══════════════════════════════════════════════════
// INTERCEPT: Capture Enter keydown before platform handles it
// ═══════════════════════════════════════════════════

document.addEventListener('keydown', (e) => {
  if (!lensEnabled) return;
  if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;

  // Skip our own synthetic events
  if ((e as any).__lens) return;

  const el = document.activeElement as HTMLElement;
  if (!el) return;

  // Only intercept chat inputs (textarea or contenteditable)
  const isTextarea = el.tagName === 'TEXTAREA';
  const isContentEditable = el.isContentEditable;
  if (!isTextarea && !isContentEditable) return;

  // Get current text
  let text = '';
  if (isTextarea) {
    text = (el as HTMLTextAreaElement).value;
  } else {
    text = el.innerText;
  }

  // Skip empty, very short, or code-heavy inputs
  if (!text.trim() || text.length < 30) return;
  if (isCodeHeavy(text)) return;

  // Compress
  const { output, noiseRemoved, isQuery } = engine.optimize(text);

  // Not worth compressing (< 5% reduction)
  if (noiseRemoved < 5) return;

  // Append response boost hint if enabled (contextual per mode)
  const hint = isQuery ? RESPONSE_HINT_QUERY : RESPONSE_HINT_COMPRESS;
  const finalOutput = responseBoost ? output + hint : output;

  // Stop original submit
  e.preventDefault();
  e.stopPropagation();

  // Replace text in the input
  if (isTextarea) {
    setTextareaValue(el as HTMLTextAreaElement, finalOutput);
  } else {
    setContentEditableText(el as HTMLElement, finalOutput);
  }

  // Save token savings
  const tokensSaved = Math.max(0, Math.floor((text.length - finalOutput.length) / 4));
  saveTokens(tokensSaved);

  // Wait for framework to process the text change, then re-send
  requestAnimationFrame(() => {
    const syntheticEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
    });
    (syntheticEnter as any).__lens = true;
    el.dispatchEvent(syntheticEnter);

    // Also fire keyup for platforms that listen to it
    const syntheticKeyUp = new KeyboardEvent('keyup', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
    });
    (syntheticKeyUp as any).__lens = true;
    el.dispatchEvent(syntheticKeyUp);

    showBadge(`-${noiseRemoved}% PITH`, '#10b981');
  });

}, true); // capture phase — runs before platform handlers

// ═══════════════════════════════════════════════════
// ALSO INTERCEPT: Send button clicks
// ═══════════════════════════════════════════════════

document.addEventListener('click', (e) => {
  if (!lensEnabled) return;
  if ((e as any).__lens) return;

  const target = e.target as HTMLElement;
  if (!target) return;

  // Detect send buttons by common patterns
  const button = target.closest('button[data-testid*="send"], button[aria-label*="Send"], button[aria-label*="Enviar"]');
  if (!button) return;

  // Find the nearest chat input
  const container = button.closest('form') || button.parentElement?.parentElement?.parentElement;
  if (!container) return;

  const input = container.querySelector('textarea, [contenteditable="true"]') as HTMLElement;
  if (!input) return;

  const isTextarea = input.tagName === 'TEXTAREA';
  let text = isTextarea ? (input as HTMLTextAreaElement).value : input.innerText;

  if (!text.trim() || text.length < 30) return;
  if (isCodeHeavy(text)) return;

  const { output, noiseRemoved, isQuery } = engine.optimize(text);
  if (noiseRemoved < 5) return;

  // Append response boost hint if enabled (contextual per mode)
  const hint2 = isQuery ? RESPONSE_HINT_QUERY : RESPONSE_HINT_COMPRESS;
  const finalOutput = responseBoost ? output + hint2 : output;

  // Replace text (don't block the click — just change content before it sends)
  if (isTextarea) {
    setTextareaValue(input as HTMLTextAreaElement, finalOutput);
  } else {
    setContentEditableText(input as HTMLElement, finalOutput);
  }

  const tokensSaved = Math.max(0, Math.floor((text.length - finalOutput.length) / 4));
  saveTokens(tokensSaved);

  // Small delay to let the text update propagate, then re-click
  e.preventDefault();
  e.stopPropagation();

  requestAnimationFrame(() => {
    const syntheticClick = new MouseEvent('click', { bubbles: true, cancelable: true });
    (syntheticClick as any).__lens = true;
    button.dispatchEvent(syntheticClick);
    showBadge(`-${noiseRemoved}% PITH`, '#10b981');
  });

}, true);

// ═══════════════════════════════════════════════════
// TEXT REPLACEMENT HELPERS
// ═══════════════════════════════════════════════════

// Set textarea value in a way React/Vue/Angular detect
function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  )?.set;

  if (setter) {
    setter.call(textarea, value);
  } else {
    textarea.value = value;
  }

  // Dispatch events that frameworks listen to
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
}

// Set contenteditable text using execCommand (works with React, undo history)
function setContentEditableText(el: HTMLElement, text: string) {
  el.focus();

  // Select all content
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);

  // Replace using execCommand — integrates with browser undo and React
  document.execCommand('insertText', false, text);
}

// ═══════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════

// Detect if input is mostly code (skip compression)
function isCodeHeavy(text: string): boolean {
  if (text.includes('```')) return true;

  const lines = text.split('\n');
  if (lines.length < 3) return false;

  let codeLines = 0;
  for (const line of lines) {
    if (/^\s{2,}/.test(line) || /^[{}()\[\];]/.test(line.trim())) codeLines++;
  }

  return codeLines / lines.length > 0.5;
}

// Save token savings to chrome.storage
function saveTokens(tokens: number) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;

  chrome.storage.local.get(['distilledTokens'], (result) => {
    const current = result.distilledTokens || 0;
    chrome.storage.local.set({ distilledTokens: current + tokens });
  });
}

// Show a transient badge notification
function showBadge(text: string, color: string) {
  // Remove existing badge
  const existing = document.getElementById('pith-badge');
  if (existing) existing.remove();

  const badge = document.createElement('div');
  badge.id = 'pith-badge';
  badge.textContent = text;
  badge.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483647;
    background: ${color};
    color: #0f172a;
    padding: 8px 16px;
    border-radius: 8px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 13px;
    font-weight: bold;
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.3s, transform 0.3s;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    pointer-events: none;
  `;

  document.body.appendChild(badge);

  // Animate in
  requestAnimationFrame(() => {
    badge.style.opacity = '1';
    badge.style.transform = 'translateY(0)';
  });

  // Fade out
  setTimeout(() => {
    badge.style.opacity = '0';
    badge.style.transform = 'translateY(10px)';
  }, 1500);

  // Remove
  setTimeout(() => badge.remove(), 2000);
}

console.log('[PITH] Content script loaded — Ctrl+Shift+L to toggle');
