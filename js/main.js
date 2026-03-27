import {
  MAX_HEALTH,
  STORAGE_KEY,
  clamp,
  createDeck,
  createLogEntry,
  createSeededRandom,
  fisherYatesShuffle,
  getCardLabel,
  getCardType,
  getSuitSymbol,
  getValueLabel,
  getCardArtPath,
  getCardColorClass,
  sumRemainingMonsterValues,
} from './utils.js';

const elements = {
  healthValue: document.querySelector('#health-value'),
  healthFill: document.querySelector('#health-fill'),
  weaponValue: document.querySelector('#weapon-value'),
  weaponDetails: document.querySelector('#weapon-details'),
  turnValue: document.querySelector('#turn-value'),
  deckValue: document.querySelector('#deck-value'),
  discardValue: document.querySelector('#discard-value'),
  avoidState: document.querySelector('#avoid-state'),
  roomStatus: document.querySelector('#room-status'),
  roomGrid: document.querySelector('#room-grid'),
  actionLog: document.querySelector('#action-log'),
  avoidButton: document.querySelector('#avoid-button'),
  resolveButton: document.querySelector('#resolve-button'),
  newGameButton: document.querySelector('#new-game-button'),
  restartButton: document.querySelector('#restart-button'),
  helpButton: document.querySelector('#help-button'),
  closeHelpButton: document.querySelector('#close-help-button'),
  helpModal: document.querySelector('#help-modal'),
  clearLogButton: document.querySelector('#clear-log-button'),
  debugPanel: document.querySelector('#debug-panel'),
  debugContent: document.querySelector('#debug-content'),
  endgameModal: document.querySelector('#endgame-modal'),
  endgameSummary: document.querySelector('#endgame-summary'),
  endgameNewGameButton: document.querySelector('#endgame-new-game-button'),
  endgameCloseButton: document.querySelector('#endgame-close-button'),
};

const state = {
  seed: '',
  deck: [],
  discard: [],
  room: [],
  health: MAX_HEALTH,
  turn: 1,
  lastActionWasAvoid: false,
  potionUsedThisRoom: false,
  resolvedThisRoom: 0,
  weapon: null,
  logs: [],
  status: 'playing',
  outcome: null,
  debugEnabled: false,
  selectedCardIds: [],
  endgameAcknowledged: false,
};

const saveGameState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const loadSavedState = () => {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error('Failed to parse saved game state.', error);
    return null;
  }
};

const addLog = (message) => {
  state.logs.unshift(createLogEntry(message, state.turn));
};

const getAllRemainingDungeonCards = () => [...state.room, ...state.deck];

const getRequiredSelectionsCount = () => Math.min(3, state.room.length);

const clearSelection = () => {
  state.selectedCardIds = [];
};

const updateRoomSelectionState = () => {
  const roomButtons = elements.roomGrid.querySelectorAll('.card-button');

  roomButtons.forEach((button) => {
    const cardId = button.getAttribute('data-card-id');
    const isSelected = !!cardId && state.selectedCardIds.includes(cardId);
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  });
};

const buildNewState = (seed = `seed-${Date.now()}`) => {
  const randomFn = createSeededRandom(seed);
  const dungeonDeck = fisherYatesShuffle(createDeck(), randomFn);

  Object.assign(state, {
    seed,
    deck: dungeonDeck,
    discard: [],
    room: [],
    health: MAX_HEALTH,
    turn: 1,
    lastActionWasAvoid: false,
    potionUsedThisRoom: false,
    resolvedThisRoom: 0,
    weapon: null,
    logs: [],
    status: 'playing',
    outcome: null,
    selectedCardIds: [],
    endgameAcknowledged: false,
  });

  addLog('New dungeon created.');
  drawRoom();
  saveGameState();
};

const pushToDiscard = (card) => {
  state.discard.push(card);
};

const canAvoidRoom = () => state.status === 'playing' && !state.lastActionWasAvoid && state.room.length === 4;

const describeWeapon = () => {
  if (!state.weapon) return 'None';
  return `${getSuitSymbol(state.weapon.card)}${getValueLabel(state.weapon.card.value)}`;
};

const getWeaponLastDefeatedText = () => {
  if (!state.weapon || state.weapon.lastDefeatedValue === null) return 'Last defeated: —';
  return `Last defeated: ${state.weapon.lastDefeatedValue}`;
};

const isCardPlayable = (card) => {
  if (state.status !== 'playing') return false;

  const type = getCardType(card);

  if (type === 'potion') return true;
  if (type === 'weapon') return true;

  if (!state.weapon) return true;
  if (state.weapon.lastDefeatedValue === null) return true;

  return card.value <= state.weapon.lastDefeatedValue;
};

const getMonsterResolution = (monsterCard) => {
  if (!state.weapon) {
    return {
      damage: monsterCard.value,
      defeatedByWeapon: false,
      blockedByWeaponRule: false,
    };
  }

  if (state.weapon.lastDefeatedValue !== null && monsterCard.value > state.weapon.lastDefeatedValue) {
    return {
      damage: monsterCard.value,
      defeatedByWeapon: false,
      blockedByWeaponRule: true,
    };
  }

  const damage = Math.max(monsterCard.value - state.weapon.card.value, 0);

  return {
    damage,
    defeatedByWeapon: damage === 0,
    blockedByWeaponRule: false,
  };
};

const drawRoom = () => {
  while (state.room.length < 4 && state.deck.length > 0) {
    state.room.push(state.deck.shift());
  }

  if (state.deck.length === 0 && state.room.length === 0) {
    endGame('win');
  }
};

const finishTurnIfNeeded = () => {
  if (state.status !== 'playing') return;

  if (state.health <= 0) {
    endGame('loss');
    return;
  }

  const requiredSelections = getRequiredSelectionsCount();

  if (state.resolvedThisRoom >= requiredSelections) {
    const carriedCard = state.room[0] ?? null;

    if (carriedCard) {
      addLog(`Carried ${getCardLabel(carriedCard)} into the next room.`);
    }

    state.room = carriedCard ? [carriedCard] : [];
    state.turn += 1;
    state.resolvedThisRoom = 0;
    state.potionUsedThisRoom = false;
    state.lastActionWasAvoid = false;
    clearSelection();

    drawRoom();
  }

  if (state.deck.length === 0 && state.room.length === 0) {
    endGame('win');
  }
};

const resolveWeaponCard = (card) => {
  if (state.weapon) {
    pushToDiscard(state.weapon.card);
    state.weapon.defeatedStack.forEach(pushToDiscard);
    addLog(`Dropped ${getCardLabel(state.weapon.card)} and its stack.`);
  }

  state.weapon = {
    card,
    lastDefeatedValue: null,
    defeatedStack: [],
  };

  addLog(`Equipped ${getCardLabel(card)}.`);
  pushToDiscard(card);
};

const resolvePotionCard = (card) => {
  if (state.potionUsedThisRoom) {
    pushToDiscard(card);
    addLog(`Discarded ${getCardLabel(card)}. Only 1 potion can heal per room.`);
    return;
  }

  const previousHealth = state.health;
  state.health = clamp(state.health + card.value, 0, MAX_HEALTH);
  state.potionUsedThisRoom = true;
  pushToDiscard(card);
  addLog(`Used ${getCardLabel(card)} and healed ${state.health - previousHealth}.`);
};

const resolveMonsterCard = (card) => {
  const resolution = getMonsterResolution(card);

  if (resolution.blockedByWeaponRule) {
    state.health -= card.value;
    pushToDiscard(card);
    addLog(`Could not use weapon on ${getCardLabel(card)}. Took ${card.value} damage.`);
    return;
  }

  if (resolution.defeatedByWeapon && state.weapon) {
    state.weapon.lastDefeatedValue = card.value;

    /*
      Worked example:
      - Weapon is ♦7
      - You defeat a monster worth 6 with 0 damage
      - lastDefeatedValue becomes 6
      - From then on, this weapon can only auto-defeat monsters worth 6 or less
    */
    state.weapon.defeatedStack.push(card);
    addLog(`Weapon defeated ${getCardLabel(card)} without damage.`);
    return;
  }

  state.health -= resolution.damage;
  pushToDiscard(card);

  if (state.weapon) {
    addLog(`Fought ${getCardLabel(card)} with weapon and took ${resolution.damage} damage.`);
  } else {
    addLog(`Fought ${getCardLabel(card)} bare-handed and took ${resolution.damage} damage.`);
  }
};

const resolveSelectedCards = () => {
  if (state.status !== 'playing') return;

  const requiredSelections = getRequiredSelectionsCount();

  if (state.selectedCardIds.length !== requiredSelections) return;

  const selectedCardsInOrder = [...state.selectedCardIds]
    .map((cardId) => state.room.find((card) => card.id === cardId))
    .filter(Boolean);

  for (const selectedCard of selectedCardsInOrder) {
    const selectedIndex = state.room.findIndex((card) => card.id === selectedCard.id);
    if (selectedIndex === -1) continue;

    state.room.splice(selectedIndex, 1);

    const type = getCardType(selectedCard);

    if (type === 'weapon') resolveWeaponCard(selectedCard);
    if (type === 'potion') resolvePotionCard(selectedCard);
    if (type === 'monster') resolveMonsterCard(selectedCard);

    state.resolvedThisRoom += 1;

    if (state.health <= 0) {
      endGame('loss');
      break;
    }
  }

  clearSelection();

  if (state.status === 'playing') {
    finishTurnIfNeeded();
  }

  saveGameState();
  render();
};

const toggleCardSelection = (cardId) => {
  if (state.status !== 'playing') return;

  const existingIndex = state.selectedCardIds.indexOf(cardId);
  const requiredSelections = getRequiredSelectionsCount();

  if (existingIndex >= 0) {
    state.selectedCardIds.splice(existingIndex, 1);
    saveGameState();
    updateRoomSelectionState();
    renderHud();
    renderDebug();
    return;
  }

  if (state.selectedCardIds.length >= requiredSelections) return;

  state.selectedCardIds.push(cardId);
  saveGameState();
  updateRoomSelectionState();
  renderHud();
  renderDebug();
};

const avoidRoom = () => {
  if (!canAvoidRoom()) return;

  const avoidedCards = state.room.splice(0, state.room.length);
  state.deck.push(...avoidedCards);
  state.lastActionWasAvoid = true;
  state.potionUsedThisRoom = false;
  state.resolvedThisRoom = 0;
  state.turn += 1;
  clearSelection();
  addLog(`Avoided the room and cycled ${avoidedCards.map(getCardLabel).join(', ')} to the bottom.`);
  drawRoom();
  saveGameState();
  render();
};

const setEndgameModalOpen = (isOpen) => {
  elements.endgameModal.hidden = !isOpen;
  document.body.style.overflow = isOpen || !elements.helpModal.hidden ? 'hidden' : '';
};

const endGame = (result) => {
  if (state.status === 'ended') return;

  state.status = 'ended';
  clearSelection();

  const remainingDungeonCards = getAllRemainingDungeonCards();

  if (result === 'win') {
    state.outcome = {
      result: 'win',
      score: state.health,
      summary: `You cleared the dungeon with ${state.health} health remaining. Score: ${state.health}.`,
    };
    addLog(`Victory. Final score: ${state.health}.`);
  } else {
    const remainingMonsterValue = sumRemainingMonsterValues(remainingDungeonCards);
    state.outcome = {
      result: 'loss',
      score: -remainingMonsterValue,
      summary: `You were defeated. Remaining monster total: ${remainingMonsterValue}. Score: ${-remainingMonsterValue}.`,
    };
    addLog(`Defeat. Final score: ${-remainingMonsterValue}.`);
  }

  state.endgameAcknowledged = false;
  saveGameState();
  render();
  setEndgameModalOpen(true);
};

const createCardElement = (card, index) => {
  const type = getCardType(card);
  const cardButton = document.createElement('button');
  const isPlayable = isCardPlayable(card);
  const isSelected = state.selectedCardIds.includes(card.id);
  const valueLabel = getValueLabel(card.value);
  const suitSymbol = getSuitSymbol(card);
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const actionLabel = type === 'monster' ? 'Fight' : type === 'weapon' ? 'Equip' : 'Drink';
  const artPath = getCardArtPath(card);
  const colorClass = getCardColorClass(card);
  let helpText = 'Press Enter or Space to select this card.';

  if (!isPlayable && type === 'monster') {
    helpText = 'Weapon chain blocks this monster. You can still select it and take full damage.';
  }

  if (type === 'potion' && state.potionUsedThisRoom) {
    /*
      Worked example:
      - You already drank one potion this room
      - Any additional potion selected in the same room is discarded
      - It does not heal you
    */
    helpText = 'Potion will be discarded because a potion was already used in this room.';
  }

  cardButton.type = 'button';
  cardButton.className = `card-button ${!isPlayable ? 'is-disabled' : ''} ${isSelected ? 'is-selected' : ''}`.trim();
  cardButton.dataset.index = String(index);
  cardButton.dataset.cardId = card.id;
  cardButton.setAttribute('role', 'listitem');
  cardButton.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  cardButton.setAttribute(
    'aria-label',
    `${typeLabel} card ${getCardLabel(card)}, value ${card.value}. ${helpText}`,
  );

  cardButton.innerHTML = `
    <article class="card card-${type} ${colorClass}">
      <div class="card-inner">
        <div class="card-corner card-corner-top-left">
          <span class="card-corner-value">${valueLabel}</span>
          <span class="card-corner-suit" aria-hidden="true">${suitSymbol}</span>
        </div>

        <div class="card-art-frame">
          <img class="card-art-image" src="${artPath}" alt="" loading="eager" decoding="async" />
          <div class="card-art-overlay"></div>
        </div>

        <div class="card-center-badge">
          <span class="card-center-type">${typeLabel}</span>
          <span class="card-center-action">${actionLabel}</span>
        </div>

        <div class="card-corner card-corner-bottom-right" aria-hidden="true">
          <span class="card-corner-value">${valueLabel}</span>
          <span class="card-corner-suit">${suitSymbol}</span>
        </div>
      </div>
    </article>
  `;

  const imageElement = cardButton.querySelector('.card-art-image');
  imageElement?.addEventListener('error', () => {
    const artFrame = cardButton.querySelector('.card-art-frame');

    if (!(artFrame instanceof HTMLElement)) return;

    artFrame.classList.add('is-fallback');
    artFrame.innerHTML = `
      <div class="card-fallback-symbol" aria-hidden="true">${suitSymbol}</div>
      <div class="card-fallback-meta">
        <div class="card-value card-accent-${type}">${valueLabel}</div>
        <div class="card-label">${typeLabel}</div>
        <div class="card-help">${helpText}</div>
      </div>
    `;
  });

  cardButton.addEventListener('click', () => toggleCardSelection(card.id));
  return cardButton;
};

const renderRoom = () => {
  elements.roomGrid.innerHTML = '';

  if (state.room.length === 0) {
    elements.roomGrid.innerHTML = '<p class="muted">No cards visible.</p>';
    return;
  }

  state.room.forEach((card, index) => {
    elements.roomGrid.append(createCardElement(card, index));
  });

  updateRoomSelectionState();
};

const renderLog = () => {
  elements.actionLog.innerHTML = '';

  state.logs.forEach((entry) => {
    const logItem = document.createElement('div');
    logItem.className = 'log-entry';
    logItem.innerHTML = `<strong>Turn ${entry.turn}</strong> — ${entry.message}`;
    elements.actionLog.append(logItem);
  });
};

const renderHud = () => {
  elements.healthValue.textContent = `${state.health} / ${MAX_HEALTH}`;
  elements.healthFill.style.width = `${(state.health / MAX_HEALTH) * 100}%`;
  elements.weaponValue.textContent = describeWeapon();
  elements.weaponDetails.textContent = getWeaponLastDefeatedText();
  elements.turnValue.textContent = String(state.turn);
  elements.deckValue.textContent = String(state.deck.length);
  elements.discardValue.textContent = String(state.discard.length);
  elements.avoidState.textContent = canAvoidRoom() ? 'Ready' : state.lastActionWasAvoid ? 'Blocked' : 'Unavailable';

  const roomCount = state.room.length;
  const requiredSelections = getRequiredSelectionsCount();
  const selectedCount = state.selectedCardIds.length;

  if (state.status === 'ended') {
    elements.roomStatus.textContent = 'Game over. Review the log or start a new run.';
  } else if (roomCount < 4 && state.deck.length === 0) {
    elements.roomStatus.textContent = `Final room. Choose ${requiredSelections} card${requiredSelections === 1 ? '' : 's'} and press Face Room.`;
  } else {
    elements.roomStatus.textContent = `Choose ${requiredSelections} card${requiredSelections === 1 ? '' : 's'} to face. ${selectedCount}/${requiredSelections} selected. ${state.potionUsedThisRoom ? 'Potion already used this room.' : 'One potion may heal this room.'}`;
  }

  elements.avoidButton.disabled = !canAvoidRoom();
  elements.resolveButton.disabled = state.status !== 'playing' || selectedCount !== requiredSelections;

  if (state.outcome) {
    elements.endgameSummary.textContent = state.outcome.summary;
  } else {
    elements.endgameSummary.textContent = 'The dungeon awaits.';
  }
};

const renderDebug = () => {
  elements.debugPanel.hidden = !state.debugEnabled;

  if (!state.debugEnabled) return;

  elements.debugContent.textContent = JSON.stringify(
    {
      seed: state.seed,
      room: state.room.map(getCardLabel),
      selectedCardIds: state.selectedCardIds,
      nextDeckCards: state.deck.slice(0, 10).map(getCardLabel),
      weapon: state.weapon
        ? {
            value: getCardLabel(state.weapon.card),
            lastDefeatedValue: state.weapon.lastDefeatedValue,
            stack: state.weapon.defeatedStack.map(getCardLabel),
          }
        : null,
    },
    null,
    2,
  );
};

const render = () => {
  renderHud();
  renderRoom();
  renderLog();
  renderDebug();

  if (state.status === 'ended' && !state.endgameAcknowledged) {
    setEndgameModalOpen(true);
  }
};

const restoreSavedState = () => {
  const savedState = loadSavedState();

  if (!savedState) {
    buildNewState();
    return;
  }

  Object.assign(state, { selectedCardIds: [], endgameAcknowledged: false }, savedState);
  state.selectedCardIds = Array.isArray(state.selectedCardIds) ? state.selectedCardIds : [];
  render();
};

const setHelpModalOpen = (isOpen) => {
  elements.helpModal.hidden = !isOpen;
  document.body.style.overflow = isOpen || !elements.endgameModal.hidden ? 'hidden' : '';

  if (isOpen) {
    elements.closeHelpButton.focus();
  } else {
    elements.helpButton.focus();
  }
};

const bindEvents = () => {
  elements.newGameButton.addEventListener('click', () => {
    setEndgameModalOpen(false);
    buildNewState();
    render();
  });

  elements.restartButton.addEventListener('click', () => {
    const savedState = loadSavedState();
    if (!savedState) return;
    Object.assign(state, savedState);
    state.selectedCardIds = Array.isArray(state.selectedCardIds) ? state.selectedCardIds : [];
    setEndgameModalOpen(false);
    render();
  });

  elements.resolveButton.addEventListener('click', resolveSelectedCards);
  elements.avoidButton.addEventListener('click', avoidRoom);
  elements.helpButton.addEventListener('click', () => setHelpModalOpen(true));
  elements.closeHelpButton.addEventListener('click', () => setHelpModalOpen(false));
  elements.helpModal.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.dataset.closeModal === 'true') {
      setHelpModalOpen(false);
    }
  });

  elements.endgameNewGameButton.addEventListener('click', () => {
    setEndgameModalOpen(false);
    buildNewState();
    render();
  });

  elements.endgameCloseButton.addEventListener('click', () => {
    state.endgameAcknowledged = true;
    saveGameState();
    setEndgameModalOpen(false);
  });

  elements.clearLogButton.addEventListener('click', () => {
    elements.actionLog.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      state.debugEnabled = !state.debugEnabled;
      renderDebug();
      return;
    }

    if (event.key === 'Escape' && !elements.helpModal.hidden) {
      setHelpModalOpen(false);
      return;
    }

    if (event.key === 'Escape' && !elements.endgameModal.hidden) {
      state.endgameAcknowledged = true;
      saveGameState();
      setEndgameModalOpen(false);
      return;
    }

    if (state.status !== 'playing') return;

    if (event.key.toLowerCase() === 'a' && canAvoidRoom()) {
      event.preventDefault();
      avoidRoom();
    }
  });
};

restoreSavedState();
bindEvents();
render();