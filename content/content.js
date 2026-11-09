// Слушаем команды от background.js
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "PAUSE_ALL") {
    const count = pauseAllMedia();
    if (count > 0 || window.top === window) { // Показываем тост только в главном окне, но паузим везде
      showToast();
    }
  } else if (message.action === "RESUME_ALL") {
    resumeAllMedia();
    removeToast();
  }
});

// --- УМНЫЙ ПОИСК МЕДИА (Уровень 1 + Уровень 2 Shadow DOM) ---
function findMediaElements(root = document) {
  let elements = Array.from(root.querySelectorAll('video, audio'));
  
  // Ищем во всех элементах на странице, есть ли у них Shadow Root
  const allElements = root.querySelectorAll('*');
  for (const el of allElements) {
    if (el.shadowRoot) {
      // Если есть Shadow DOM, заходим внутрь и ищем там
      elements = elements.concat(findMediaElements(el.shadowRoot));
    }
  }
  return elements;
}

// 1. Логика паузы
function pauseAllMedia() {
  const mediaElements = findMediaElements();
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

  // TODO: Сюда мы добавим клики по кнопкам для Яндекс.Музыки и VK
  
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
    } catch (e) {
      console.warn("Could not resume media", e);
    }
  });
  
  // TODO: Сюда мы добавим клики по кнопкам для возобновления
}

// ... (Функции showToast, removeToast и стили остаются без изменений, 
// НО не забудьте поменять таймер авто-скрытия на 15000!)