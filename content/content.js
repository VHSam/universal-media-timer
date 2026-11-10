browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "PAUSE_ALL") {
    const count = pauseAllMedia();
    if (window.top === window) {
      if (count > 0) showToast();
    } else {
      if (count > 0) window.top.postMessage({ action: "SHOW_UMT_TOAST" }, "*");
    }
  } else if (message.action === "RESUME_ALL") {
    resumeAllMedia();
    removeToast();
  }
});

window.addEventListener("message", (event) => {
  if (event.data && event.data.action === "SHOW_UMT_TOAST" && window.top === window) {
    showToast();
  }
});

// --- УМНЫЙ ПОИСК МЕДИА (Уровень 1 + Уровень 2 Shadow DOM) ---
function findMediaElements(root = document) {
  let elements = Array.from(root.querySelectorAll('video, audio'));
  const allElements = root.querySelectorAll('*');
  for (const el of allElements) {
    if (el.shadowRoot) {
      elements = elements.concat(findMediaElements(el.shadowRoot));
    }
  }
  return elements;
}

// 1. Логика паузы
function pauseAllMedia() {
  const mediaElements = findMediaElements();
  let pausedCount = 0;
  
  // Стандартные теги
  mediaElements.forEach(el => {
    if (!el.paused) {
      try {
        el.pause();
        pausedCount++;
      } catch (e) {}
    }
  });

  // --- УРОВЕНЬ 3: Клики по кнопкам ---
  
  // 1. Яндекс.Музыка (по aria-label)
  const yandexPauseBtn = document.querySelector('button[aria-label="Пауза"]');
  if (yandexPauseBtn) {
    yandexPauseBtn.click();
    pausedCount++;
  }

  // 2. VK Музыка (по data-testid)
  // Ищем кнопку по testid. Проверяем, что текст внутри "Пауза" (значит, музыка играет).
  const vkMusicBtn = document.querySelector('[data-testid="audio-player-controls-state-button"]');
  if (vkMusicBtn && vkMusicBtn.textContent.includes('Пауза')) {
    vkMusicBtn.click();
    pausedCount++;
  }

  return pausedCount;
}

// 2. Логика возобновления
function resumeAllMedia() {
  const mediaElements = findMediaElements();
  mediaElements.forEach(el => {
    try {
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => console.warn("Autoplay blocked", e));
      }
    } catch (e) {}
  });

  // --- УРОВЕНЬ 3: Клики по кнопкам (Возобновление) ---
  
  // 1. Яндекс.Музыка (вы нашли, что там "воспроизведение")
  const yandexPlayBtn = document.querySelector('button[aria-label="Воспроизведение"]');
  if (yandexPlayBtn) {
    yandexPlayBtn.click();
  }

  // 2. VK Музыка
  // Если кнопка есть и текст внутри НЕ "Пауза" (значит, стоит на паузе), кликаем.
  const vkMusicBtn = document.querySelector('[data-testid="audio-player-controls-state-button"]');
  if (vkMusicBtn && !vkMusicBtn.textContent.includes('Пауза')) {
    vkMusicBtn.click();
  }
}

// --- ТОСТ ---
function showToast() {
  if (document.getElementById('umt-toast-host')) return;
  const host = document.createElement('div');
  host.id = 'umt-toast-host';
  host.style.cssText = `position: fixed; top: 24px; left: 50%; transform: translateX(-50%); z-index: 2147483647; pointer-events: none;`;
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      .toast { background-color: #202124; color: #e8eaed; font-family: -apple-system, sans-serif; font-size: 14px; padding: 12px 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 24px; pointer-events: auto; animation: slideDown 0.3s ease-out; min-width: 320px; justify-content: space-between; }
      @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .text { font-weight: 500; }
      .actions { display: flex; align-items: center; gap: 12px; }
      .btn-resume { background: none; border: none; color: #8ab4f8; font-weight: 600; cursor: pointer; padding: 4px 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; transition: background 0.2s; border-radius: 4px; }
      .btn-resume:hover { background: rgba(138, 180, 248, 0.1); }
      .btn-close { background: none; border: none; color: #9aa0a6; cursor: pointer; font-size: 18px; line-height: 1; padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: color 0.2s, background 0.2s; }
      .btn-close:hover { color: #e8eaed; background: rgba(255,255,255,0.1); }
    </style>
    <div class="toast">
      <span class="text">Медиа на паузе</span>
      <div class="actions">
        <button class="btn-resume" id="btn-resume">Продолжить</button>
        <button class="btn-close" id="btn-close">&times;</button>
      </div>
    </div>
  `;
  shadow.getElementById('btn-resume').addEventListener('click', () => { resumeAllMedia(); removeToast(); });
  shadow.getElementById('btn-close').addEventListener('click', () => { removeToast(); });
  setTimeout(() => { removeToast(); }, 15000);
}

function removeToast() {
  const host = document.getElementById('umt-toast-host');
  if (host) host.remove();
}