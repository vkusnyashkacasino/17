// =========================
//         КОНСТАНТЫ
// =========================
const MAX_BONUSES_PER_SPIN = 4;
const BONUS_DROP_CHANCE    = 1 / 15;   
const FREE_SPINS_COUNT     = 15;
const SUPER_FREE_SPINS     = 17;
const SUPER_BONUS_COST     = 96000;
const SUPER_MULTIPLIER     = 5;

// =========================
//      ПЕРЕМЕННЫЕ И ЗВУКИ
// =========================
const symbols = [
  { name: "cherry",  img: "img/lean.png", payout: 2 },
  { name: "lemon",   img: "img/lemon.png",  payout: 3 },
  { name: "seven",   img: "img/seven.png",  payout: 10, multiplier: 1.5 },
  { name: "bell",    img: "img/bell.png",   payout: 5 },
  { name: "bar",     img: "img/bar.png",    payout: 20, multiplier: 1.5 },
  { name: "bonus",   img: "img/bonus.png",  payout: 0 }
];

let balance         = 25000;
let currentBet      = 100;
let jackpot         = 500;
let freeSpins       = 0;
let bonusTriggered  = false;
let isSpinning      = false;
let isAutoSpin      = false;
let autoSpinInterval= null;
let superMode       = false;

let superVideoPlaying = false;

const sounds = {
  spin:  new Audio("sounds/spin.mp3"),
  win:   new Audio("sounds/win.mp3"),
  lose:  new Audio("sounds/lose.mp3"),
  bonus: new Audio("sounds/bonus.mp3")
};

// =========================
//     ИНИЦИАЛИЗАЦИЯ
// =========================
const bgMusic = document.getElementById("background-music");
bgMusic.volume = 0.2;
document.addEventListener("click", () => {
  bgMusic.play().catch(() => console.warn("Фоновая музыка не стартовала"));
}, { once: true });

// =========================
//     ОБНОВЛЕНИЕ UI
// =========================
function updateBalance() {
  document.getElementById("money").textContent = `$${balance}`;
}
function updateJackpot() {
  document.getElementById("jackpot-amount").textContent = jackpot;
}
function updateFreeSpins() {
  const freeSpinsEl = document.getElementById("free-spins");

  if (freeSpins > 0) {
    const label = superMode ? `SUPER Фриспины: ${freeSpins}` : `Бесплатные вращения: ${freeSpins}`;
    freeSpinsEl.textContent = label;
    freeSpinsEl.style.display = 'block'; // показываем
  } else {
    freeSpinsEl.style.display = 'none'; // скрываем
  }

  document.body.classList.toggle("super-mode", superMode);

  // Управляем видео супер-бонуса
  const bgVideo = document.getElementById("superVideo");
  if (superMode && !superVideoPlaying) {
    if(bgVideo){
      bgVideo.style.display = "block";
      superVideoPlaying = true;
    }
  }
  if (!superMode && superVideoPlaying) {
    if(bgVideo){
      bgVideo.style.display = "none";
      superVideoPlaying = false;
    }
  }
}
function clearSlots() {
  for (let i = 1; i <= 3; i++) {
    document.getElementById(`row${i}`).innerHTML = "";
  }
}
function showResult(msg, type) {
  const el = document.getElementById("result");
  el.textContent = msg;
  el.className = "";
  setTimeout(() => el.classList.add(type), 50);
}
function showMoneyFall(text) {
  const fall = document.createElement("div");
  fall.className = "money-fall";
  fall.textContent = text;
  document.body.appendChild(fall);
  setTimeout(() => fall.remove(), 1200);
}

// =========================
//    ЛОГИКА СИМВОЛОВ
// =========================
function getRandomSymbol() {
  if (freeSpins > 0) {
    const nonBonusSymbols = symbols.filter(s => s.name !== "bonus");
    if (Math.random() < 0.4) {
      const pick = Math.random() < 0.5 ? "bar" : "seven";
      return nonBonusSymbols.find(s => s.name === pick);
    }
    return nonBonusSymbols[Math.floor(Math.random() * nonBonusSymbols.length)];
  }
  return symbols[Math.floor(Math.random() * symbols.length)];
}

// =========================
//        ФУНКЦИЯ SPIN
// =========================
function spin() {
  if (isSpinning) return;
  isSpinning = true;

  currentBet = parseInt(document.getElementById("bet-select").value, 10);

  if (balance < currentBet && freeSpins === 0) {
    showResult("Иди задепай😆", "lose");
    isSpinning = false;
    return;
  }

  if (freeSpins > 0) {
    freeSpins--;
    updateFreeSpins();
    if (freeSpins === 0) {
      superMode = false; // сброс супер-режима
      updateFreeSpins();
    }
  } else {
    balance -= currentBet;
    jackpot += Math.floor(currentBet * 0.1);
  }
  updateBalance();
  updateJackpot();

  sounds.spin.play().catch(() => {});
  clearSlots();

  const allRows = [];
  let bonusCountThisSpin = 0;

  for (let rowIdx = 1; rowIdx <= 3; rowIdx++) {
    const rowSymbols = [];
    const rowEl = document.getElementById(`row${rowIdx}`);

    for (let col = 0; col < 5; col++) {
      let symbol;
      if (freeSpins === 0 && bonusCountThisSpin < MAX_BONUSES_PER_SPIN && Math.random() < BONUS_DROP_CHANCE) {
        symbol = symbols.find(s => s.name === "bonus");
        bonusCountThisSpin++;
      } else {
        symbol = getRandomSymbol();
      }
      if (!symbol) symbol = symbols[0];

      rowSymbols.push(symbol.name);

      const slot = document.createElement("div");
      slot.classList.add("slot");
      const img = document.createElement("img");
      img.src = symbol.img;
      slot.appendChild(img);
      rowEl.appendChild(slot);
    }

    allRows.push(rowSymbols);
  }

  setTimeout(() => {
    if (bonusCountThisSpin >= 3 && !bonusTriggered) {
      bonusTriggered = true;
      freeSpins = FREE_SPINS_COUNT;
      superMode = false;
      updateFreeSpins();
      sounds.bonus.play().catch(() => {});
      showResult(`БОНУС! ${FREE_SPINS_COUNT} фриспинов!`, "bonus");
    } else {
      checkWin(allRows);
    }
    isSpinning = false;
  }, 600);
}

// =========================
//       ПРОВЕРКА WIN
// =========================
function checkWin(rows) {
  let totalWin = 0;

  rows.forEach((row, rIdx) => {
    for (let i = 0; i <= 2; i++) {
      if (row[i] && row[i] === row[i+1] && row[i] === row[i+2]) {
        const sym = symbols.find(s => s.name === row[i]);
        const baseWin = sym.payout * 100;
        const mult = sym.multiplier || 1;
        const win = baseWin * mult * (superMode ? SUPER_MULTIPLIER : 1);
        totalWin += win;

        const rowEl = document.getElementById(`row${rIdx+1}`);
        [i, i+1, i+2].forEach(c => rowEl.children[c].classList.add("win"));
      }
    }
  });

  if (totalWin > 0) {
    balance += totalWin;
    updateBalance();
    showResult(`Выигрыш: $${totalWin}`, "win");
    sounds.win.play().catch(() => {});
    showMoneyFall(`+$${totalWin}`);
  } else {
    const loseMessages = [
      "90% лудоманов сдаются перед заносом!",
      "Ну еще пару спинчиков",
      "Ну почти:(",
      "Додеп!",
      "Ну это уже рядом с заносом!",
      "Котик ушёл помурчать, жди обратно.",
      "Старина ушёл есть пицку, жди обратно.",
      "Чиловый на параше зависает, жди обратно.",
      "Слот на прогреве!",
      "Зато прогрел!",
      "Сейчас бы бонуску купить...",
      "Сильно прогрел можно и додепнуть",
      "Чтобы выдавало нужно мяукать!",
      "Чтобы выдавало нужно есть пицку",
      "Ставка была слишком маленькая для ЗАНОСА!"
    ];
    const randomLoseMsg = loseMessages[Math.floor(Math.random() * loseMessages.length)];
    showResult(randomLoseMsg, "lose");
    sounds.lose.play().catch(() => {});
  }
}

// =========================
//       BUY BONUS
// =========================
function buyBonus() {
  const cost = 15000;
  if (balance >= cost) {
    balance -= cost;
    freeSpins = FREE_SPINS_COUNT;
    bonusTriggered = true;
    superMode = false;
    updateBalance();
    updateFreeSpins();
    sounds.bonus.play().catch(() => {});
    showResult(`Куплен бонус: ${FREE_SPINS_COUNT} фриспинов`, "bonus");
  } else {
    showResult("Не хватает на вкусняху!", "lose");
  }
}

// =========================
//     SUPER BONUS
// =========================
function buySuperBonus() {
  if (balance >= SUPER_BONUS_COST) {
    balance -= SUPER_BONUS_COST;
    freeSpins = SUPER_FREE_SPINS;
    superMode = true;
    bonusTriggered = true;
    updateBalance();
    updateFreeSpins();
    sounds.bonus.play().catch(() => {});
    showResult(`SUPER БОНУС! ${SUPER_FREE_SPINS} фриспинов с x${SUPER_MULTIPLIER}!`, "bonus");
  } else {
    showResult("не хватает на чизбушку", "lose");
  }
}

// =========================
//      EVENT LISTENERS
// =========================
document.getElementById("spin").addEventListener("click", spin);
document.getElementById("buy-bonus").addEventListener("click", buyBonus);
document.getElementById("buy-super-bonus").addEventListener("click", buySuperBonus);

document.getElementById("bet-select").addEventListener("change", () => {
  currentBet = parseInt(document.getElementById("bet-select").value, 10);
});

document.getElementById("auto-spin").addEventListener("click", () => {
  isAutoSpin = !isAutoSpin;
  const btn = document.getElementById("auto-spin");
  btn.textContent = `AutoЛудка: ${isAutoSpin ? "ВКЛ" : "ВЫКЛ"}`;

  if (isAutoSpin) {
    autoSpinInterval = setInterval(() => {
      if (!isSpinning) spin();
    }, 1500);
  } else {
    clearInterval(autoSpinInterval);
  }
});

// =========================
//     ИНИЦИАЛИЗАЦИЯ UI
// =========================
updateBalance();
updateJackpot();
updateFreeSpins();

// Пример: если победила строка row1
document.getElementById('row1').classList.add('win-white');
// если победила строка row2
document.getElementById('row2').classList.add('win-blue');
// если победила строка row3
document.getElementById('row3').classList.add('win-red');