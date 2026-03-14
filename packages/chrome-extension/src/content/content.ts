import { PithEngine } from '@pith/core';

function t(key: string, subs?: string[]): string {
  if (typeof chrome !== 'undefined' && chrome.i18n?.getMessage) {
    const msg = chrome.i18n.getMessage(key, subs);
    if (msg) return msg;
  }
  const fallback: Record<string, string> = {
    badge_on: 'PITH ON',
    badge_off: 'PITH OFF',
    login_required: 'PITH: sign in required',
    noise_removed: '-$1% PITH',
    noise_output: '-$1% output',
    ver_original: 'view original',
    ver_pith: 'view PITH',
  };
  let s = fallback[key] ?? key;
  if (subs?.length) s = s.replace(/\$1/g, subs[0]);
  return s;
}

const engine = new PithEngine();
let pithEnabled = true;
let responseBoost = true;
let outputCompress = true;
let sessionToken: string | null = null;

const API_URL = import.meta.env.VITE_API_URL as string;

// Load session token
if (typeof chrome !== 'undefined' && chrome.storage?.local) {
  chrome.storage.local.get('pithSession', (result) => {
    sessionToken = result.pithSession?.accessToken ?? null;
  });
}

// Concise response instructions — ~15 tokens that save hundreds on output
const RESPONSE_HINT_QUERY = '\n[Answer in 1-3 sentences. No intro/outro. No "Great question". Skip what I already know.]';
const RESPONSE_HINT_COMPRESS = '\n[Be concise. No filler. No recap of my input. Direct answer only. Bullets over paragraphs.]';

// Load saved state
if (typeof chrome !== 'undefined' && chrome.storage?.local) {
  chrome.storage.local.get(['pithEnabled', 'responseBoost', 'outputCompress'], (result) => {
    pithEnabled = result.pithEnabled !== false;
    responseBoost = result.responseBoost !== false;
    outputCompress = result.outputCompress !== false;
  });

  // Listen for toggle from popup or shortcut
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.pithEnabled) {
      pithEnabled = changes.pithEnabled.newValue !== false;
      showBadge(pithEnabled ? t('badge_on') : t('badge_off'), pithEnabled ? '#10b981' : '#ef4444');
    }
    if (changes.responseBoost) {
      responseBoost = changes.responseBoost.newValue !== false;
    }
    if (changes.outputCompress) {
      outputCompress = changes.outputCompress.newValue !== false;
    }
    if (changes.pithSession) {
      sessionToken = changes.pithSession.newValue?.accessToken ?? null;
    }
  });
}

// Toggle via keyboard shortcut (Ctrl+Shift+L)
document.addEventListener('keydown', (e) => {
  if (e.key === 'L' && e.ctrlKey && e.shiftKey) {
    e.preventDefault();
    pithEnabled = !pithEnabled;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ pithEnabled });
    }
    showBadge(pithEnabled ? t('badge_on') : t('badge_off'), pithEnabled ? '#10b981' : '#ef4444');
  }
});

// ═══════════════════════════════════════════════════
// CLAUDE.AI: dedicated finders (React SPA, contenteditable often outside form)
// ═══════════════════════════════════════════════════

// Same order as claude-token-counter (known to work on claude.ai)
function getClaudeInput(): HTMLElement | null {
  const ce = document.querySelector('div[contenteditable="true"][data-testid]') as HTMLElement | null;
  if (ce) return ce;
  const fallback = document.querySelector(
    'div[contenteditable="true"].ProseMirror, ' +
    'div[contenteditable="true"][class*="composer"], ' +
    'div[contenteditable="true"][class*="input"], ' +
    'div[contenteditable="true"][placeholder]'
  ) as HTMLElement | null;
  if (fallback) return fallback;
  return document.querySelector('div[contenteditable="true"]') as HTMLElement | null;
}

// Token counter uses: button[aria-label*="Send"], button[data-testid*="send"]
function getClaudeSendButton(): HTMLButtonElement | null {
  const btn =
    document.querySelector('button[aria-label*="Send" i], button[aria-label*="Enviar" i]') as HTMLButtonElement | null ||
    document.querySelector('button[data-testid*="send"]') as HTMLButtonElement | null ||
    document.querySelector('form button[type="submit"]') as HTMLButtonElement | null;
  return btn && !btn.disabled ? btn : null;
}

// ═══════════════════════════════════════════════════
// CLAUDE.AI: attach to input/button when they appear (React mounts later)
// Same pattern as claude-token-counter
// ═══════════════════════════════════════════════════

function runClaudeAttach() {
  const input = getClaudeInput();
  const sendBtn = getClaudeSendButton();

  if (input && !(input as any).__pithAttached) {
    (input as any).__pithAttached = true;
    input.addEventListener('keydown', (ev: Event) => {
      if (!pithEnabled) return;
      const e = ev as KeyboardEvent;
      if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e as any).__lens) return;
      const text = (input as HTMLElement).innerText?.trim() ?? '';
      if (!text || text.length < 30 || isCodeHeavy(text)) return;
      const { output, noiseRemoved, isQuery } = engine.optimize(text);
      if (noiseRemoved < 5) return;
      e.preventDefault();
      e.stopPropagation();
      const hint = isQuery ? RESPONSE_HINT_QUERY : RESPONSE_HINT_COMPRESS;
      setContentEditableText(input as HTMLElement, responseBoost ? output + hint : output);
      if (sessionToken) logUsage(text);
      const btn = getClaudeSendButton();
      setTimeout(() => {
        if (btn && !btn.disabled) {
          (btn as any).__lens = true;
          btn.click();
          setTimeout(() => { (btn as any).__lens = false; }, 100);
        }
        showBadge(t('noise_removed', [String(noiseRemoved)]), '#10b981');
      }, 100);
    }, true);
  }

  if (sendBtn && !(sendBtn as any).__pithAttached) {
    (sendBtn as any).__pithAttached = true;
    sendBtn.addEventListener('click', (ev: Event) => {
      if (!pithEnabled || (ev as any).__lens || (sendBtn as any).__lens) return;
      const inp = getClaudeInput();
      if (!inp) return;
      const text = inp.innerText?.trim() ?? '';
      if (!text || text.length < 30 || isCodeHeavy(text)) return;
      const { output, noiseRemoved, isQuery } = engine.optimize(text);
      if (noiseRemoved < 5) return;
      ev.preventDefault();
      ev.stopPropagation();
      const hint = isQuery ? RESPONSE_HINT_QUERY : RESPONSE_HINT_COMPRESS;
      setContentEditableText(inp, responseBoost ? output + hint : output);
      if (sessionToken) logUsage(text);
      setTimeout(() => {
        (sendBtn as any).__lens = true;
        sendBtn.click();
        setTimeout(() => {
          (sendBtn as any).__lens = false;
          showBadge(t('noise_removed', [String(noiseRemoved)]), '#10b981');
        }, 150);
      }, 100);
    }, true);
  }
}

if (window.location.hostname.includes('claude.ai')) {
  const claudeObserver = new MutationObserver(() => runClaudeAttach());
  claudeObserver.observe(document.body, { childList: true, subtree: true });
  runClaudeAttach();
  // Re-run attach periodically (composer can mount late)
  let pollCount = 0;
  const pollId = setInterval(() => {
    runClaudeAttach();
    if (++pollCount >= 10) clearInterval(pollId);
  }, 1500);
  // Focus fallback: when user focuses the composer, attach to that element
  document.addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement;
    if (el?.isContentEditable && !(el as any).__pithAttached) {
      (el as any).__pithAttached = true;
      el.addEventListener('keydown', (ev: Event) => {
        if (!pithEnabled) return;
        const ke = ev as KeyboardEvent;
        if (ke.key !== 'Enter' || ke.shiftKey || ke.ctrlKey || ke.metaKey || ke.altKey) return;
        if ((ke as any).__lens) return;
        const text = el.innerText?.trim() ?? '';
        if (!text || text.length < 30 || isCodeHeavy(text)) return;
        const { output, noiseRemoved, isQuery } = engine.optimize(text);
        if (noiseRemoved < 5) return;
        ke.preventDefault();
        ke.stopPropagation();
        setContentEditableText(el, responseBoost ? output + (isQuery ? RESPONSE_HINT_QUERY : RESPONSE_HINT_COMPRESS) : output);
        if (sessionToken) logUsage(text);
        const btn = getClaudeSendButton();
        setTimeout(() => {
          if (btn && !btn.disabled) {
            (btn as any).__lens = true;
            btn.click();
            setTimeout(() => { (btn as any).__lens = false; }, 100);
          }
          showBadge(t('noise_removed', [String(noiseRemoved)]), '#10b981');
        }, 100);
      }, true);
    }
  }, true);
  // Expose debug in page context so user can run from Console
  try {
    const script = document.createElement('script');
    script.textContent = `(function(){
      window.__pithDebug = function(){
        var sel = [
          'div[contenteditable="true"][data-testid]',
          'div[contenteditable="true"].ProseMirror',
          'div[contenteditable="true"]',
          'button[aria-label*="Send"]',
          'button[data-testid*="send"]',
          'form button[type="submit"]'
        ];
        var input = document.querySelector(sel[0]) || document.querySelector(sel[1]) || document.querySelector(sel[2]);
        var btn = document.querySelector(sel[3]) || document.querySelector(sel[4]) || document.querySelector(sel[5]);
        var out = { input: input ? { tag: input.tagName, testid: input.getAttribute('data-testid'), className: input.className } : null, button: btn ? { tag: btn.tagName, disabled: btn.disabled } : null };
        console.log('PITH debug', out);
        return out;
      };
    })();`;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  } catch (_) {}
}

// ═══════════════════════════════════════════════════
// INTERCEPT: document keydown — on Claude use activeElement (focused composer)
// ═══════════════════════════════════════════════════

document.addEventListener('keydown', (e) => {
  if (!pithEnabled) return;
  if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
  if ((e as any).__lens) return;

  const isClaude = window.location.hostname.includes('claude.ai');
  let el: HTMLElement | null = document.activeElement as HTMLElement;
  if (isClaude && (!el || !el.isContentEditable)) {
    el = getClaudeInput();
  }
  if (!el) return;
  const isTextarea = el.tagName === 'TEXTAREA';
  const isContentEditable = el.isContentEditable;
  if (!isTextarea && !isContentEditable) return;

  let text = isTextarea ? (el as HTMLTextAreaElement).value : el.innerText;
  if (!text?.trim() || text.length < 30) return;
  if (isCodeHeavy(text)) return;

  const { output, noiseRemoved, isQuery } = engine.optimize(text);
  if (noiseRemoved < 5) return;

  const hint = isQuery ? RESPONSE_HINT_QUERY : RESPONSE_HINT_COMPRESS;
  const finalOutput = responseBoost ? output + hint : output;
  e.preventDefault();
  e.stopPropagation();
  if (isTextarea) setTextareaValue(el as HTMLTextAreaElement, finalOutput);
  else setContentEditableText(el as HTMLElement, finalOutput);
  if (sessionToken) logUsage(text);

  if (isClaude) {
    const btn = getClaudeSendButton();
    setTimeout(() => {
      if (btn && !btn.disabled) {
        (btn as any).__lens = true;
        btn.click();
        setTimeout(() => { (btn as any).__lens = false; }, 100);
      }
      showBadge(t('noise_removed', [String(noiseRemoved)]), '#10b981');
    }, 100);
  } else {
    requestAnimationFrame(() => {
      const syntheticEnter = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true });
      (syntheticEnter as any).__lens = true;
      el.dispatchEvent(syntheticEnter);
      el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      showBadge(t('noise_removed', [String(noiseRemoved)]), '#10b981');
    });
  }
}, true);

document.addEventListener('click', (e) => {
  if (!pithEnabled || (e as any).__lens) return;
  const target = e.target as HTMLElement;
  if (!target) return;

  const isClaude = window.location.hostname.includes('claude.ai');
  const button = target.closest(
    'button[data-testid*="send"], button[aria-label*="Send"], button[aria-label*="Enviar"], button[type="submit"]'
  ) as HTMLButtonElement | null;
  if (!button) return;
  if ((button as any).__lens) return;
  if (isClaude && getClaudeSendButton() !== button) return;

  let input: HTMLElement | null;
  if (isClaude) {
    input = getClaudeInput();
  } else {
    const container = button.closest('form') || button.parentElement?.parentElement?.parentElement;
    if (!container) return;
    input = container.querySelector('textarea, [contenteditable="true"], .ProseMirror') as HTMLElement | null;
    if (!input && container instanceof HTMLFormElement) {
      input = (container.closest('[data-testid], [role="main"], main') || document.body).querySelector('.ProseMirror, [contenteditable="true"]') as HTMLElement | null;
    }
  }
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

  if (sessionToken) logUsage(text);

  e.preventDefault();
  e.stopPropagation();

  if (isClaude) {
    setTimeout(() => {
      (button as any).__lens = true;
      button.click();
      setTimeout(() => { (button as any).__lens = false; }, 100);
      showBadge(t('noise_removed', [String(noiseRemoved)]), '#10b981');
    }, 100);
  } else {
    requestAnimationFrame(() => {
      (button as any).__lens = true;
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      showBadge(t('noise_removed', [String(noiseRemoved)]), '#10b981');
    });
  }
}, true);

// ═══════════════════════════════════════════════════
// OUTPUT COMPRESSION: Auto-compress AI responses after streaming
// ═══════════════════════════════════════════════════

const processedResponses = new WeakSet<HTMLElement>();
const debounceTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();

// Ordered from most specific to most generic per platform
const ASSISTANT_CONTAINER_SELECTORS = [
  '[data-message-author-role="assistant"]',  // ChatGPT
  '[data-testid="bot-message"]',             // Perplexity
  '.agent-turn',                             // ChatGPT fallback
  '[data-is-streaming]',                     // Claude.ai
];

const PROSE_SELECTORS = [
  '.markdown.prose',       // ChatGPT
  '.prose',                // Claude.ai, Perplexity
  '.model-response-text',  // Gemini
  '.font-claude-message',  // Claude.ai fallback
];

function findResponseElement(root: Element): HTMLElement | null {
  if (!root || !(root instanceof Element)) return null;
  // Try finding via assistant container → prose inside it
  for (const outer of ASSISTANT_CONTAINER_SELECTORS) {
    const msg = root.matches(outer) ? root : root.querySelector(outer);
    if (!msg) continue;
    for (const inner of PROSE_SELECTORS) {
      const prose = msg.querySelector(inner) as HTMLElement | null;
      if (prose && (prose.innerText?.trim().length ?? 0) > 150) return prose;
    }
  }
  // Fallback: look for any prose-like element with enough text
  for (const sel of PROSE_SELECTORS) {
    const el = root.matches(sel) ? root : root.querySelector(sel);
    if (el && (el as HTMLElement).innerText?.trim().length > 150) return el as HTMLElement;
  }
  return null;
}

function compressAIResponse(el: HTMLElement): void {
  if (processedResponses.has(el)) return;

  const text = el.innerText?.trim() ?? '';
  if (!text || text.length < 150) return;
  if (isCodeHeavy(text)) return;

  const { output, noiseRemoved } = engine.optimize(text);
  if (noiseRemoved < 10) return;

  processedResponses.add(el);

  const originalHTML = el.innerHTML;
  logUsage(text);

  // Wrapper
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-pith-output', 'true');

  // Header row: badge + toggle
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';

  const badge = document.createElement('span');
  badge.textContent = t('noise_removed', [String(noiseRemoved)]);
  badge.style.cssText = 'background:#10b981;color:#0f172a;font-size:11px;font-family:monospace;font-weight:bold;padding:2px 8px;border-radius:4px;';

  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = t('ver_original');
  toggleBtn.style.cssText = 'background:transparent;border:none;color:#64748b;font-size:11px;font-family:monospace;cursor:pointer;text-decoration:underline;padding:0;';

  // Compressed view
  const compressedDiv = document.createElement('div');
  compressedDiv.style.cssText = 'font-family:"SF Mono","Fira Code",monospace;font-size:13px;color:#10b981;line-height:1.6;white-space:pre-wrap;';
  compressedDiv.textContent = output;

  // Original view (hidden by default)
  const originalDiv = document.createElement('div');
  originalDiv.innerHTML = originalHTML;
  originalDiv.style.display = 'none';

  let showingOriginal = false;
  toggleBtn.onclick = () => {
    showingOriginal = !showingOriginal;
    compressedDiv.style.display = showingOriginal ? 'none' : 'block';
    originalDiv.style.display = showingOriginal ? 'block' : 'none';
    toggleBtn.textContent = showingOriginal ? t('ver_pith') : t('ver_original');
  };

  header.appendChild(badge);
  header.appendChild(toggleBtn);
  wrapper.appendChild(header);
  wrapper.appendChild(compressedDiv);
  wrapper.appendChild(originalDiv);

  el.innerHTML = '';
  el.appendChild(wrapper);

  showBadge(t('noise_output', [String(noiseRemoved)]), '#6366f1');
}

function scheduleResponseCompression(el: HTMLElement): void {
  const existing = debounceTimers.get(el);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    debounceTimers.delete(el);
    compressAIResponse(el);
  }, 1000); // 1s without mutations = streaming done

  debounceTimers.set(el, timer);
}

const responseObserver = new MutationObserver((mutations) => {
  if (!pithEnabled || !outputCompress) return;

  for (const mutation of mutations) {
    const target = mutation.target as Element;

    // Never re-process our own injected elements
    if ((target as HTMLElement).getAttribute?.('data-pith-output')) continue;
    if (target.closest?.('[data-pith-output]')) continue;

    // Nodes added to DOM (new message appearing)
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      const el = node as Element;
      if (el.getAttribute?.('data-pith-output')) continue;
      const container = findResponseElement(el);
      if (container && !processedResponses.has(container)) {
        scheduleResponseCompression(container);
      }
    }

    // Streaming mutations (text changing inside existing container)
    if ((mutation.type === 'characterData' || mutation.type === 'childList') && target instanceof Element) {
      const container = findResponseElement(target);
      if (container && !processedResponses.has(container)) {
        scheduleResponseCompression(container);
      }
    }
  }
});

responseObserver.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
});

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

// Set contenteditable text: execCommand + input event so ProseMirror/React sync
function setContentEditableText(el: HTMLElement, text: string) {
  el.focus();

  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);

  document.execCommand('insertText', false, text);

  // ProseMirror/React often don't sync from execCommand alone; dispatch input so they update
  el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: false, inputType: 'insertText' }));
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

// Log usage to backend (fire-and-forget)
function logUsage(originalText: string) {
  if (!API_URL) return;
  if (!sessionToken) {
    console.warn('[PITH] logUsage skipped: no session token');
    return;
  }
  fetch(`${API_URL}/v1/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
    body: JSON.stringify({ text: originalText }),
  }).then(async (res) => {
    if (res.status === 401) {
      console.warn('[PITH] token expired — clearing session');
      sessionToken = null;
      chrome.storage.local.remove('pithSession');
    }
  }).catch((err) => {
    console.warn('[PITH] logUsage error:', err);
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
