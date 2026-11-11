// Подключаем кроссбраузерную обертку
const storage = (browser.storage && browser.storage.session) ? browser.storage.session : browser.storage.local;

browser.runtime.onInstalled.addListener(() => {
  console.log("Universal Media Timer installed.");
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "START_TIMER") {
    startTimer(message.tabId, message.minutes);
  } else if (message.action === "CANCEL_TIMER") {
    cancelTimer(message.tabId);
  } else if (message.action === "GET_STATE") {
    getState(message.tabId).then(sendResponse);
    return true;
  } else if (message.action === "RESUME_MEDIA") {
    browser.tabs.sendMessage(message.tabId, { action: "RESUME_ALL" });
  }
});

// Ставим таймер (с проверкой наличия контент-скрипта)
async function startTimer(tabId, minutes) {
  // 1. Пробуем "пингнуть" контент-скрипт
  try {
    await browser.tabs.sendMessage(tabId, { action: "PING" });
  } catch (e) {
    // 2. Если не ответил (ошибка), значит скрипта нет. Внедряем его принудительно!
    try {
      await browser.scripting.executeScript({
        target: { tabId: tabId, allFrames: true },
        files: ["content/content.js"]
      });
    } catch (err) {
      console.warn("Could not inject script into tab", err);
    }
  }

  const alarmName = `timer_${tabId}`;
  const endsAt = Date.now() + minutes * 60 * 1000;

  await storage.set({ [alarmName]: { tabId, endsAt, minutes } });
  browser.alarms.create(alarmName, { when: endsAt });
  console.log(`Timer started for tab ${tabId} for ${minutes} minutes.`);
}

async function cancelTimer(tabId) {
  const alarmName = `timer_${tabId}`;
  await browser.alarms.clear(alarmName);
  await storage.remove(alarmName);
  console.log(`Timer canceled for tab ${tabId}.`);
}

async function getState(tabId) {
  const alarmName = `timer_${tabId}`;
  const data = await storage.get(alarmName);
  const timer = data[alarmName];
  
  if (!timer) return { active: false };
  const remaining = timer.endsAt - Date.now();
  if (remaining <= 0) return { active: false };
  
  return { active: true, remaining, endsAt: timer.endsAt };
}

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith("timer_")) {
    const tabId = parseInt(alarm.name.split("_")[1], 10);
    try {
      await browser.tabs.sendMessage(tabId, { action: "PAUSE_ALL" });
    } catch (e) {
      console.log("Tab not found or content script not ready", e);
    }
    await storage.remove(alarm.name);
  }
});

// Защита от "просроченных" таймеров
async function checkExpiredTimers() {
  const allData = await storage.get(null);
  const now = Date.now();
  for (const key in allData) {
    if (key.startsWith("timer_")) {
      const timer = allData[key];
      if (timer.endsAt < now) {
        await storage.remove(key);
        await browser.alarms.clear(key);
      } else {
        browser.alarms.create(key, { when: timer.endsAt });
      }
    }
  }
}
checkExpiredTimers();

browser.tabs.onRemoved.addListener(async (tabId) => {
  cancelTimer(tabId);
});