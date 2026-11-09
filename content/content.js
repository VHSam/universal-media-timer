// Слушаем команды от background.js
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "PAUSE_ALL") {
    const count = pauseAllMedia();
    if (count > 0) {
      showToast();
    }
  } else if (message.action === "RESUME_ALL") {
    resumeAllMedia();
    removeToast(); // Закрываем тост после возобновления
  }
});

// 1. Логика паузы/воспроизведения
function pauseAllMedia() {
  const mediaElements = document.querySelectorAll('video, audio');
  let pausedCount = 0;
  mediaElements.forEach(el => {
    if (!el.paused) {
      try {
        el.pause();
        pausedCount++;
      } catch (e) {
        console.warn("Could not pause media", e);
      }
    }
  });
  return pausedCount;
}

function resumeAllMedia() {
  const mediaElements = document.querySelectorAll('video, audio');
  mediaElements.forEach(el => {
    try {
      // Autoplay policy может блокировать, поэтому ловим ошибку
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => console.warn("Autoplay blocked", e));
      }
    } catch (e) {
      console.warn("Could not resume media", e);
    }
  });
}

// 2. Логика Тоста (Shadow DOM, сверху по центру)
let toastElement = null;

function showToast() {
  // Показываем тост только в главном фрейме, чтобы не дублировать
  if (window.top !== window) return;
  
  // Если тост уже есть, не создаем дубликат
  if (document.getElementById('umt-toast-host')) {
    return;
  }

  // Создаем хоста для Shadow DOM
  const host = document.createElement('div');
  host.id = 'umt-toast-host';
  // Стили для позиционирования хоста (сверху по центру)
  host.style.cssText = `
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    pointer-events: none;
  `;
  
  document.body.appendChild(host);

  // Создаем Shadow Root
  const shadow = host.attachShadow({ mode: 'open' });

  // Внутренний HTML тоста
  shadow.innerHTML = `
    <style>
      .toast {
        background-color: #202124; /* Темный фон как на вашем скрине */
        color: #e8eaed;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 24px;
        pointer-events: auto; /* Возвращаем клики самому тосту */
        animation: slideDown 0.3s ease-out;
        min-width: 320px;
        justify-content: space-between;
      }
      @keyframes slideDown {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .text {
        font-weight: 500;
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .btn-resume {
        background: none;
        border: none;
        color: #8ab4f8; /* Светло-синий акцент */
        font-weight: 600;
        cursor: pointer;
        padding: 4px 8px;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        transition: background 0.2s;
        border-radius: 4px;
      }
      .btn-resume:hover {
        background: rgba(138, 180, 248, 0.1);
      }
      .btn-close {
        background: none;
        border: none;
        color: #9aa0a6;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        padding: 4px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s, background 0.2s;
      }
      .btn-close:hover {
        color: #e8eaed;
        background: rgba(255,255,255,0.1);
      }
    </style>
    <div class="toast" id="toast">
      <span class="text">Медиа на паузе</span>
      <div class="actions">
        <button class="btn-resume" id="btn-resume">Продолжить</button>
        <button class="btn-close" id="btn-close" aria-label="Закрыть">&times;</button>
      </div>
    </div>
  `;

  // Добавляем обработчики событий
  shadow.getElementById('btn-resume').addEventListener('click', () => {
    resumeAllMedia();
    removeToast();
  });

  shadow.getElementById('btn-close').addEventListener('click', () => {
    removeToast();
  });

  // Авто-скрытие через 5 секунд
  setTimeout(() => {
    removeToast();
  }, 15000);
}

function removeToast() {
  const host = document.getElementById('umt-toast-host');
  if (host) {
    host.remove();
  }
}