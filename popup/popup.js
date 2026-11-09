// Храним ID текущей вкладки
let currentTabId = null;
let timerInterval = null;

// Инициализация при открытии попапа
document.addEventListener('DOMContentLoaded', async () => {
  // Получаем текущую активную вкладку
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;

  // Запрашиваем состояние таймера у фонового скрипта
  browser.runtime.sendMessage({ action: "GET_STATE", tabId: currentTabId }, (response) => {
    if (response && response.active) {
      showActiveTimer(response.remaining);
    }
  });

  // Обработчики кнопок пресетов
  document.querySelectorAll('.preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const min = parseInt(btn.dataset.min, 10);
      startTimer(min);
    });
  });

  // Обработчик кастомного ввода
  document.getElementById('btn-start-custom').addEventListener('click', () => {
    const min = parseInt(document.getElementById('custom-min').value, 10);
    if (min > 0 && min <= 600) {
      startTimer(min);
    } else {
      alert('Введите число от 1 до 600');
    }
  });

  // Обработчик отмены
  document.getElementById('btn-cancel').addEventListener('click', () => {
    browser.runtime.sendMessage({ action: "CANCEL_TIMER", tabId: currentTabId });
    hideActiveTimer();
  });
});

function startTimer(minutes) {
  browser.runtime.sendMessage({ action: "START_TIMER", tabId: currentTabId, minutes: minutes });
  showActiveTimer(minutes * 60 * 1000); // Переводим в миллисекунды для отображения
}

function showActiveTimer(remainingMs) {
  document.querySelector('.presets').classList.add('hidden');
  document.querySelector('.custom-input').classList.add('hidden');
  document.getElementById('active-timer').classList.remove('hidden');
  
  updateTimeDisplay(remainingMs);

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    remainingMs -= 1000;
    if (remainingMs <= 0) {
      clearInterval(timerInterval);
      hideActiveTimer();
    } else {
      updateTimeDisplay(remainingMs);
    }
  }, 1000);
}

function hideActiveTimer() {
  document.querySelector('.presets').classList.remove('hidden');
  document.querySelector('.custom-input').classList.remove('hidden');
  document.getElementById('active-timer').classList.add('hidden');
  if (timerInterval) clearInterval(timerInterval);
}

function updateTimeDisplay(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  document.getElementById('time-left').textContent = `${m}:${s}`;
}