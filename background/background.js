// Подключаем кроссбраузерную обертку (в MV3 для фоновых скриптов нужно использовать importScripts, если не используем module, но мы используем module, так что просто обращаемся к глобальному browser)
// В Chrome MV3 с type: "module", importScripts не работает, но так как мы подключили polyfill глобально, он доступен.

const storage = (browser.storage && browser.storage.session) ? browser.storage.session : browser.storage.local;

// Слушаем установку (для инициализации)
browser.runtime.onInstalled.addListener(() => {
  console.log("Universal Media Timer installed.");
});

// Слушаем сообщения от попапа
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "START_TIMER") {
    startTimer(message.tabId, message.minutes);
  } else if (message.action === "CANCEL_TIMER") {
    cancelTimer(message.tabId);
  } else if (message.action === "GET_STATE") {
    getState(message.tabId).then(sendResponse);
    return true; // Важно для асинхронного ответа
  } else if (message.action === "RESUME_MEDIA") {
    // Пользователь нажал "Продолжить" в тосте
    browser.tabs.sendMessage(message.tabId, { action: "RESUME_ALL" });
  }
});

// Ставим таймер
async function startTimer(tabId, minutes) {
  const alarmName = `timer_${tabId}`;
  const endsAt = Date.now() + minutes * 60 * 1000;

  // Сохраняем состояние
  await storage.set({ [alarmName]: { tabId, endsAt, minutes } });

  // Ставим alarm
  browser.alarms.create(alarmName, { when: endsAt });
  console.log(`Timer started for tab ${tabId} for ${minutes} minutes.`);
}

// Отменяем таймер
async function cancelTimer(tabId) {
  const alarmName = `timer_${tabId}`;
  await browser.alarms.clear(alarmName);
  await storage.remove(alarmName);
  console.log(`Timer canceled for tab ${tabId}.`);
}

// Получаем состояние для попапа
async function getState(tabId) {
  const alarmName = `timer_${tabId}`;
  const data = await storage.get(alarmName);
  const timer = data[alarmName];
  
  if (!timer) return { active: false };
  
  const remaining = timer.endsAt - Date.now();
  if (remaining <= 0) return { active: false };
  
  return { active: true, remaining, endsAt: timer.endsAt };
}

// Срабатывание таймера
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith("timer_")) {
    const tabId = parseInt(alarm.name.split("_")[1], 10);
    
    // Отправляем команду на паузу в контент-скрипт
    try {
      await browser.tabs.sendMessage(tabId, { action: "PAUSE_ALL" });
    } catch (e) {
      console.log("Tab not found or content script not ready", e);
    }

    // Очищаем состояние
    await storage.remove(alarm.name);
  }
});

// Проверка «просроченных» таймеров при старте Service Worker
// (Защита от того, что браузер был закрыт, а таймер истек)
async function checkExpiredTimers() {
  const allData = await storage.get(null);
  const now = Date.now();
  
  for (const key in allData) {
    if (key.startsWith("timer_")) {
      const timer = allData[key];
      if (timer.endsAt < now) {
        // Таймер истек, пока браузер был закрыт. Просто удаляем.
        console.log(`Cleaning up expired timer for tab ${timer.tabId}`);
        await storage.remove(key);
        await browser.alarms.clear(key);
      } else {
        // Таймер еще идет, пересоздаем alarm (на случай перезапуска)
        browser.alarms.create(key, { when: timer.endsAt });
      }
    }
  }
}

// Запускаем проверку при старте
checkExpiredTimers();

// Очистка при закрытии вкладки
browser.tabs.onRemoved.addListener(async (tabId) => {
  cancelTimer(tabId);
});