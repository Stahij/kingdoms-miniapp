const STORAGE_KEY = 'kingdoms-miniapp-save-v1';
const GRID_SIZE = 9;
const RESOURCE_ICONS = {
  wood: '🌲',
  stone: '🪨',
  food: '🌾',
  gold: '🪙',
};

const BUILDINGS = {
  keep: {
    name: 'Крепость',
    icon: '🏰',
    cost: {},
    description: 'Центр поселения. Не требует строительства.',
    income: {},
    kind: 'keep',
  },
  lumberMill: {
    name: 'Лесопилка',
    icon: '🪵',
    cost: { wood: 30, stone: 12 },
    description: 'Производит дерево.',
    income: { wood: 3 },
    kind: 'production',
  },
  quarry: {
    name: 'Каменоломня',
    icon: '🪨',
    cost: { wood: 22, stone: 8 },
    description: 'Производит камень.',
    income: { stone: 3 },
    kind: 'production',
  },
  farm: {
    name: 'Ферма',
    icon: '🌾',
    cost: { wood: 28, stone: 12, gold: 10 },
    description: 'Производит еду.',
    income: { food: 4 },
    kind: 'production',
  },
  barracks: {
    name: 'Казармы',
    icon: '🛡️',
    cost: { wood: 36, stone: 24, gold: 18 },
    description: 'Содержит защиту и военный потенциал.',
    income: {},
    kind: 'military',
  },
};

const app = {
  state: null,
  selectedType: null,
  tickHandle: null,
};

const els = {
  menuScreen: document.getElementById('menuScreen'),
  gameScreen: document.getElementById('gameScreen'),
  playerName: document.getElementById('playerName'),
  menuStatus: document.getElementById('menuStatus'),
  createGameBtn: document.getElementById('createGameBtn'),
  enterGameBtn: document.getElementById('enterGameBtn'),
  loadSaveBtn: document.getElementById('loadSaveBtn'),
  backToMenuBtn: document.getElementById('backToMenuBtn'),
  rulerName: document.getElementById('rulerName'),
  woodValue: document.getElementById('woodValue'),
  stoneValue: document.getElementById('stoneValue'),
  foodValue: document.getElementById('foodValue'),
  goldValue: document.getElementById('goldValue'),
  mapGrid: document.getElementById('mapGrid'),
  buildingsList: document.getElementById('buildingsList'),
  gameLog: document.getElementById('gameLog'),
  harvestBtn: document.getElementById('harvestBtn'),
  statusText: document.getElementById('statusText'),
  newGameBtn: document.getElementById('newGameBtn'),
};

function cleanName(raw) {
  return String(raw || 'Правитель').trim().slice(0, 20) || 'Правитель';
}

function makeResourceMap() {
  const map = {};
  const nodes = [
    ['wood', 12],
    ['stone', 10],
    ['food', 8],
    ['gold', 6],
  ];

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      map[`${x}_${y}`] = { resource: null };
    }
  }

  for (const [type, count] of nodes) {
    for (let i = 0; i < count; i += 1) {
      let x = Math.floor(Math.random() * GRID_SIZE);
      let y = Math.floor(Math.random() * GRID_SIZE);
      const key = `${x}_${y}`;
      if (key === '4_4') {
        i -= 1;
        continue;
      }
      if (!map[key].resource) {
        map[key].resource = type;
      } else {
        i -= 1;
      }
    }
  }

  return map;
}

function createDefaultState(name) {
  const rulerName = cleanName(name);
  const state = {
    rulerName,
    resources: {
      wood: 120,
      stone: 90,
      food: 150,
      gold: 85,
    },
    buildings: {
      '4_4': { type: 'keep', level: 1 },
    },
    map: makeResourceMap(),
    log: [
      `Поселение "${rulerName}" создано. Центральная крепость готова.`,
      'Нажмите на клетку с ресурсом, чтобы добывать дерево, камень, еду и золото.',
      'Выберите постройку в списке слева и постройте её на свободной клетке.',
    ],
  };

  return state;
}

function addLog(text) {
  if (!app.state) return;
  app.state.log.unshift(text);
  app.state.log = app.state.log.slice(0, 12);
}

function readStorage(key) {
  try { return window.localStorage.getItem(key); }
  catch (error) { console.warn('Локальное хранилище недоступно:', error); return null; }
}

function writeStorage(key, value) {
  try { window.localStorage.setItem(key, value); return true; }
  catch (error) {
    console.warn('Не удалось сохранить игру:', error);
    if (els.menuStatus) els.menuStatus.textContent = 'Браузер не разрешил сохранение. Проверьте настройки сайта и свободное место.';
    return false;
  }
}

function saveGame() {
  if (!app.state) return;
  writeStorage(STORAGE_KEY, JSON.stringify(app.state));
}

function backupUnreadableSave(raw) {
  if (raw && !readStorage(STORAGE_KEY + '-backup')) writeStorage(STORAGE_KEY + '-backup', raw);
}

function normalizeSavedState(parsed) {
  if (!parsed || typeof parsed !== 'object' || !parsed.resources ||
      typeof parsed.resources !== 'object' || !parsed.buildings ||
      typeof parsed.buildings !== 'object' || !parsed.map ||
      typeof parsed.map !== 'object') return null;

  const resourceTypes = new Set(['wood', 'stone', 'food', 'gold']);
  const defaults = { wood: 120, stone: 90, food: 150, gold: 85 };
  const resources = {};
  for (const type of resourceTypes) {
    const value = Number(parsed.resources[type]);
    resources[type] = Number.isFinite(value) && value >= 0 ? value : defaults[type];
  }

  const map = {};
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const key = `${x}_${y}`;
      const cell = parsed.map[key];
      map[key] = { resource: cell && resourceTypes.has(cell.resource) ? cell.resource : null };
    }
  }

  const buildings = {};
  for (const [key, value] of Object.entries(parsed.buildings)) {
    if (!/^\\d+_\\d+$/.test(key) || !value || !BUILDINGS[value.type]) continue;
    const [x, y] = key.split('_').map(Number);
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) continue;
    buildings[key] = { type: value.type, level: Math.max(1, Number(value.level) || 1) };
  }
  if (!Object.values(buildings).some((building) => building.type === 'keep')) {
    buildings['4_4'] = { type: 'keep', level: 1 };
  }
  const log = Array.isArray(parsed.log)
    ? parsed.log.filter((line) => typeof line === 'string').slice(0, 12)
    : ['Сохранение восстановлено с исправлением недостающих данных.'];
  return { rulerName: cleanName(parsed.rulerName), resources, buildings, map, log };
}

function loadSavedState() {
  const raw = readStorage(STORAGE_KEY);
  if (!raw) return null;
  try {
    const normalized = normalizeSavedState(JSON.parse(raw));
    if (!normalized) { backupUnreadableSave(raw); return null; }
    return normalized;
  } catch (error) {
    console.warn('Не удалось загрузить сохранение:', error);
    backupUnreadableSave(raw);
    return null;
  }
}

function startProductionTick() {
  clearInterval(app.tickHandle);
  app.tickHandle = setInterval(() => {
    if (!app.state) return;

    const entries = Object.entries(app.state.buildings);
    for (const [, building] of entries) {
      if (!building || !building.type) continue;
      const config = BUILDINGS[building.type];
      if (!config || !config.income) continue;

      Object.entries(config.income).forEach(([resource, amount]) => {
        app.state.resources[resource] = (app.state.resources[resource] || 0) + Number(amount);
      });
    }

    renderResources();
    saveGame();
  }, 5000);
}

function formatCost(cost) {
  return Object.entries(cost)
    .map(([resource, amount]) => `${amount} ${resource === 'wood' ? 'дерева' : resource === 'stone' ? 'камня' : resource === 'food' ? 'еды' : 'золота'}`)
    .join(', ') || 'без затрат';
}

function canAfford(cost) {
  return Object.entries(cost).every(([resource, amount]) => (app.state.resources[resource] || 0) >= amount);
}

function payCost(cost) {
  Object.entries(cost).forEach(([resource, amount]) => {
    app.state.resources[resource] = (app.state.resources[resource] || 0) - amount;
  });
}

function renderResources() {
  els.woodValue.textContent = Math.floor(app.state.resources.wood || 0);
  els.stoneValue.textContent = Math.floor(app.state.resources.stone || 0);
  els.foodValue.textContent = Math.floor(app.state.resources.food || 0);
  els.goldValue.textContent = Math.floor(app.state.resources.gold || 0);
}

function renderBuildButtons() {
  const keys = Object.keys(BUILDINGS);
  els.buildingsList.innerHTML = '';

  keys.forEach((type) => {
    if (type === 'keep') return;

    const config = BUILDINGS[type];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'building-option';
    if (app.selectedType === type) {
      button.classList.add('selected');
    }

    const costText = Object.entries(config.cost).length
      ? Object.entries(config.cost)
          .map(([resource, value]) => `${RESOURCE_ICONS[resource]} ${value}`)
          .join(' ')
      : 'Бесплатно';

    button.innerHTML = `
      <span class="meta">
        <span class="building-name">${config.icon} ${config.name}</span>
        <span class="building-cost">${costText}</span>
      </span>
      <span class="building-icon">${config.icon}</span>
    `;

    button.addEventListener('click', () => {
      app.selectedType = app.selectedType === type ? null : type;
      renderBuildButtons();
      setStatus(`Выбрано: ${config.name}`);
    });

    els.buildingsList.appendChild(button);
  });
}

function setStatus(text) {
  els.statusText.textContent = text;
}

function renderMap() {
  if (!app.state || !app.state.buildings || !app.state.map) return;
  els.mapGrid.innerHTML = '';

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const key = `${x}_${y}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tile';

      const building = app.state.buildings[key];
      const resourceCell = app.state.map[key] || {};
      const hasResource = resourceCell.resource;

      if (building) {
        button.classList.add('occupied');
        const icon = BUILDINGS[building.type]?.icon || '🏚️';
        button.textContent = icon;
      } else if (hasResource) {
        const icon = RESOURCE_ICONS[resourceCell.resource];
        button.textContent = icon;
        button.classList.add('resource-node');
        const shortName = resourceCell.resource === 'wood' ? 'д' : resourceCell.resource === 'stone' ? 'к' : resourceCell.resource === 'food' ? 'е' : 'з';
        const tiny = document.createElement('span');
        tiny.className = 'tiny';
        tiny.textContent = shortName;
        button.appendChild(tiny);
      } else {
        button.textContent = '·';
      }

      if (app.selectedType) {
        button.classList.add('selected');
      }

      button.addEventListener('click', () => handleCellClick(x, y));
      els.mapGrid.appendChild(button);
    }
  }
}

function handleCellClick(x, y) {
  const key = `${x}_${y}`;
  const building = app.state.buildings[key];
  const resource = app.state.map[key]?.resource;

  if (app.selectedType) {
    buildBuilding(app.selectedType, x, y);
    return;
  }

  if (building) {
    const info = BUILDINGS[building.type];
    addLog(`${info.name} уже стоит здесь. Подсказка: ${info.description}`);
    renderLog();
    return;
  }

  if (resource) {
    gatherResource(x, y);
    return;
  }

  addLog(`Клетка ${x + 1}:${y + 1} пустая. Выберите здание для строительства.`);
  renderLog();
}

function gatherResource(x, y) {
  const key = `${x}_${y}`;
  const type = app.state.map[key].resource;
  const amount = 2 + Math.floor(Math.random() * 4);

  if (!type) {
    addLog('На этой клетке не осталось ресурсов.');
    renderLog();
    return;
  }

  app.state.resources[type] = (app.state.resources[type] || 0) + amount;
  app.state.map[key].resource = null;
  addLog(`Добыто ${amount} ${type === 'wood' ? 'дерева' : type === 'stone' ? 'камня' : type === 'food' ? 'еды' : 'золота'} в клетке ${x + 1}:${y + 1}.`);

  setStatus('Ресурсы добыты');
  renderAll();
  saveGame();
}

function buildBuilding(type, x, y) {
  const key = `${x}_${y}`;
  const config = BUILDINGS[type];

  if (!config) {
    addLog('Такой тип постройки не существует.');
    renderLog();
    return;
  }

  if (app.state.buildings[key]) {
    addLog(`Клетка ${x + 1}:${y + 1} уже занята. Выберите другую.`);
    app.selectedType = null;
    renderAll();
    return;
  }

  if (!canAfford(config.cost)) {
    addLog(`Недостаточно ресурсов для ${config.name}. Нужно: ${formatCost(config.cost)}.`);
    renderLog();
    return;
  }

  payCost(config.cost);
  app.state.buildings[key] = { type, level: 1 };
  app.selectedType = null;
  addLog(`Построена ${config.name} на клетке ${x + 1}:${y + 1}. ${config.description}`);
  renderAll();
  saveGame();
}

function renderLog() {
  if (!app.state) return;
  if (!Array.isArray(app.state.log)) app.state.log = [];
  els.gameLog.innerHTML = '';
  app.state.log.forEach((line) => {
    const item = document.createElement('li');
    item.textContent = line;
    els.gameLog.appendChild(item);
  });
}

function renderAll() {
  if (!app.state || !app.state.resources || !app.state.buildings || !app.state.map) return;
  renderResources();
  renderBuildButtons();
  renderMap();
  renderLog();
  els.rulerName.textContent = cleanName(app.state.rulerName);
}

function showGame() {
  els.menuScreen.classList.add('hidden');
  els.gameScreen.classList.remove('hidden');
}

function showMenu() {
  els.gameScreen.classList.add('hidden');
  els.menuScreen.classList.remove('hidden');
}

function startNewGame(name) {
  app.state = createDefaultState(name);
  app.selectedType = null;
  setStatus('Новая партия');
  showGame();
  renderAll();
  saveGame();
  startProductionTick();
}

function continueOrCreateGame() {
  const name = cleanName(els.playerName.value);
  const saved = loadSavedState();

  if (saved) {
    app.state = saved;
    app.selectedType = null;
    setStatus('Сохранение загружено');
    addLog('Сохранение успешно восстановлено.');
    showGame();
    renderAll();
    saveGame();
    startProductionTick();
    return;
  }

  startNewGame(name);
}

function resetToMenu() {
  clearInterval(app.tickHandle);
  showMenu();
  els.menuStatus.textContent = 'Вы вернулись в главное меню.';
}

els.createGameBtn.addEventListener('click', () => {
  startNewGame(els.playerName.value);
});

els.enterGameBtn.addEventListener('click', () => {
  continueOrCreateGame();
});

els.loadSaveBtn.addEventListener('click', () => {
  const saved = loadSavedState();
  if (!saved) {
    els.menuStatus.textContent = 'Сохранение не найдено. Сначала создайте новую партию.';
    return;
  }

  app.state = saved;
  app.selectedType = null;
  setStatus('Сохранение загружено');
  showGame();
  renderAll();
  saveGame();
  startProductionTick();
});

els.backToMenuBtn.addEventListener('click', () => {
  resetToMenu();
});

els.harvestBtn.addEventListener('click', () => {
  if (!app.state) return;
  const candidates = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const key = `${x}_${y}`;
      if (app.state.map[key]?.resource) {
        candidates.push({ x, y, resource: app.state.map[key].resource });
      }
    }
  }

  if (!candidates.length) {
    addLog('На карте больше нет ресурсов.');
    renderLog();
    return;
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const amount = 3 + Math.floor(Math.random() * 3);
  app.state.resources[pick.resource] = (app.state.resources[pick.resource] || 0) + amount;
  app.state.map[`${pick.x}_${pick.y}`].resource = null;
  addLog(`Собрано ${amount} ${pick.resource === 'wood' ? 'дерева' : pick.resource === 'stone' ? 'камня' : pick.resource === 'food' ? 'еды' : 'золота'} с ближайшего участка.`);
  setStatus('Ресурсы собраны');
  renderAll();
  saveGame();
});

els.newGameBtn.addEventListener('click', () => {
  const name = cleanName(els.playerName.value);
  startNewGame(name);
  els.menuStatus.textContent = 'Начата новая партия.';
});

window.addEventListener('DOMContentLoaded', () => {
  els.playerName.value = 'Правитель';
  const saved = loadSavedState();
  if (saved) {
    app.state = saved;
    app.selectedType = null;
    showGame();
    renderAll();
    setStatus('Сохранение восстановлено');
    addLog('Игра автоматически восстановлена после обновления страницы.');
    saveGame();
    startProductionTick();
  } else {
    const raw = readStorage(STORAGE_KEY);
    els.menuStatus.textContent = raw
      ? 'Сохранение повреждено или устарело. Исходные данные сохранены в резервной копии; можно начать новую партию.'
      : 'Создайте новую партию, чтобы начать игру.';
  }
});
