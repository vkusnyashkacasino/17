// =========================
//         КОНСТАНТЫ
// =========================
const MAX_BONUSES_PER_SPIN = 4;
const BONUS_DROP_CHANCE    = 1 / 15;   
const FREE_SPINS_COUNT     = 15;

// =========================
//      ПЕРЕМЕННЫЕ И ЗВУКИ
// =========================
const symbols = [
  { name: "cherry",  img: "img/cherry.png", payout: 2 },
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
  document.getElementById("free-spins").textContent = `Бесплатные вращения: ${freeSpins}`;
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
    // Исключаем бонус во время фриспинов
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
  } else {
    balance -= currentBet;
    jackpot += Math.floor(currentBet * 0.1);
  }
  updateBalance();
  updateJackpot();

  sounds.spin.play().catch(() => {/* игнор */});
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
        const mult = sym.multiplier || 1;
        totalWin += sym.payout * 100 * mult;

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
    showResult("Забавный факт: 90 процентов игроков в казино перестают играть прямо перед тем как сорвут большой куш.", "lose");
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
    updateBalance();
    updateFreeSpins();
    sounds.bonus.play().catch(() => {});
    showResult(`Куплен бонус: ${FREE_SPINS_COUNT} фриспинов`, "bonus");
  } else {
    showResult("Не хватает на вкусняху!", "lose");
  }
}

// =========================
//      EVENT LISTENERS
// =========================
document.getElementById("spin").addEventListener("click", spin);
document.getElementById("buy-bonus").addEventListener("click", buyBonus);

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