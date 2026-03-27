# Scoundrel

A polished, browser-based implementation of **Scoundrel**, the solo dungeon-crawl card game.

Built as a **static portfolio project** using:

- **HTML**
- **CSS**
- **Vanilla JavaScript**

No framework, no build step, no server required.

---

## Game Overview

In Scoundrel, you descend through a dungeon represented by a deck of cards.

You must survive by managing:

- **Health** (maximum 20)
- **Weapons** (♦ 2–10)
- **Potions** (♥ 2–10)
- **Monsters** (♣ and ♠)

You win by clearing the dungeon.
You lose if your health reaches **0 or less**.

---

## Deck Setup

The game starts from a standard 52-card deck, then removes:

- Jokers
- Red face cards: **J/Q/K ♥♦**
- Red aces: **A♥, A♦**

This leaves **44 cards** total:

- **26 Monsters** → all ♣ and ♠
- **9 Weapons** → ♦ 2–10
- **9 Potions** → ♥ 2–10

The remaining deck is shuffled using **Fisher–Yates shuffle**.

---

## Rules

## 1. The Room

At the start of each turn, cards are drawn until there are **4 visible cards** in the room, unless the deck is nearly empty.

You then choose one of two options:

### Avoid the Room

- Put all 4 visible cards on the **bottom of the deck in order**
- You **cannot avoid twice in a row**

### Face the Room

- Resolve **3 of the 4 visible cards**
- Resolve them in **any order**
- The **4th card carries forward** into the next room

---

## 2. Card Resolution

### Weapon (♦)

- Equip it immediately
- Your previous weapon is discarded
- Any monsters stacked on the old weapon are discarded too
- The new weapon starts with no defeated-monster history

### Potion (♥)

- Heals by its card value
- Health is capped at **20**
- Only **one potion per room** may heal
- Extra potions in the same room are discarded with **no effect**

### Monster (♣ / ♠)

#### Bare-handed

- You take damage equal to the monster’s full value

#### With a weapon

- Damage = `monster value - weapon value`, minimum **0**
- If damage is **0**, the weapon defeats the monster
- Defeated monsters are stacked onto the weapon

#### Weapon chain rule

A weapon may only defeat monsters in a **non-increasing sequence**.

Example:

- You equip **♦7**
- You defeat a **6** → weapon history now ends at **6**
- You may later defeat **6 or less**
- You may **not** use that weapon to defeat **8** afterward

If the chain rule blocks the weapon, you take the monster’s **full value as damage**.

---

## 3. End of Game

### Win

You win when the dungeon deck and visible room are both cleared.

**Score = remaining health**

### Loss

You lose when health drops to **0 or less**.

**Score = negative sum of the remaining monster values still in the dungeon**

---

## Features

- Responsive, mobile-first layout
- Keyboard-operable card controls
- Visible focus states
- ARIA live action log
- Help / rules modal
- Flip-style reveal animation
- LocalStorage persistence across page reloads
- Optional hidden debug panel
  - Toggle with **Ctrl/Cmd + D**

---

## How to Run

Because this is a static project, you can run it directly in a browser.

### Option 1: Open the file directly

Open `index.html` in your browser.

### Option 2: Use a lightweight local server

This is optional, but useful during development.

Examples:

- VS Code Live Server
- `python -m http.server`

---

## File Responsibilities

```text
scoundrel-portfolio/
├── index.html
├── README.md
├── css/
│   └── styles.css
└── js/
    ├── main.js
    └── utils.js
```

### `index.html`

Defines the application structure:

- top HUD
- room grid
- controls
- action log
- help modal
- optional debug panel

### `css/styles.css`

Handles:

- responsive layout
- theme variables
- card visuals
- button states
- flip animation
- modal styling
- focus states
- reduced-motion support

### `js/utils.js`

Contains reusable helpers for:

- deck creation
- seeded randomness
- Fisher–Yates shuffle
- card labels / symbols
- card typing
- score helpers

### `js/main.js`

Controls all gameplay logic:

- game state model
- room drawing
- avoid logic
- weapon / potion / monster resolution
- scoring and win/loss detection
- persistence to LocalStorage
- HUD, room, and log rendering
- keyboard shortcuts and modal behavior

---

## Accessibility Notes

This project includes:

- keyboard-usable controls
- strong visible focus styling
- semantic buttons for interaction
- action log with `role="log"` and `aria-live="polite"`
- modal with `role="dialog"` and `aria-modal="true"`
- reduced-motion support via `prefers-reduced-motion`

---

## Portfolio Notes

This project is designed to demonstrate:

- front-end state modeling without frameworks
- UI system design with modern CSS
- accessible interaction design
- multi-file JavaScript organization
- translating analog game rules into deterministic browser logic
