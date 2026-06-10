const STORAGE_KEY = "tonight_reception_v1";

const BOX_FEE = 10000;
const ENTRY_FEE = 1000;
const DRINK_FEE = 500;
const CASH_DENOMINATIONS = [
  10000,
  5000,
  1000,
  500,
  100,
  50,
  10
];

// 設定値のゲッター関数
function getEntryFee() {
  return state.settings?.entryFee || 1000;
}

function getDrinkFee() {
  return state.settings?.drinkFee || 500;
}

function getBoxFee() {
  return state.settings?.boxFee || 10000;
}

const screen = document.getElementById("app");
const backBtn = document.getElementById("backBtn");

let pageHistory = [];

let state = loadState();

function createInitialState() {
  return {
    initialized: false,

    startCash: 0,

    startCashBreakdown: {},

    drinkTickets: 0,

    // 🆕 設定値
    settings: {
      eventName: "もうミスらないtonight!",
      entryFee: 1000,
      drinkFee: 500,
      boxFee: 10000,
      settlementMethod: "fixed", // "fixed" または "percentage"
      settlementValue: 10000, // 固定額または%
      settlementThreshold: 0 // 閾値（0 = 常に精算）
    },

    totals: {
      general: 0,
      tmp: 0,
      grossEntrance: 0,
      totalDiscount: 0
    },

    receptionHistory: [],

    currentReception: null
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return createInitialState();
  }

  try {
    const parsed = JSON.parse(raw);

    parsed.totals = {
      general: 0,
      tmp: 0,
      grossEntrance: 0,
      totalDiscount: 0,
      ...(parsed.totals || {})
    };

    parsed.receptionHistory =
      parsed.receptionHistory || [];

    parsed.startCashBreakdown =
      parsed.startCashBreakdown || {};

    // デフォルト設定値でマージ
    parsed.settings = {
      eventName: "もうミスらないtonight!",
      entryFee: 1000,
      drinkFee: 500,
      boxFee: 10000,
      settlementMethod: "fixed",
      settlementValue: 10000,
      settlementThreshold: 0,
      ...(parsed.settings || {})
    };

    return parsed;
  } catch {
    return createInitialState();
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );
}

function navigate(renderFunc) {
  pageHistory.push(renderFunc);

  renderFunc();

  updateBackButton();
}

function back() {
  if (pageHistory.length <= 1) {
    return;
  }

  pageHistory.pop();

  const previous =
    pageHistory[pageHistory.length - 1];

  previous();

  updateBackButton();
}

function updateBackButton() {
  if (pageHistory.length <= 1) {
    backBtn.classList.add("hidden");
  } else {
    backBtn.classList.remove("hidden");
  }
}

backBtn.addEventListener(
  "click",
  back
);

function tallyString(count) {

  let result = "";

  const groups = Math.floor(count / 5);

  for (let i = 0; i < groups; i++) {
    result += "||||/ ";
  }

  result += "|".repeat(count % 5);

  return result;
}

function getTotalPeople() {

  return (
    state.totals.general +
    state.totals.tmp
  );
}

function getLastReception() {

  if (
    state.receptionHistory.length === 0
  ) {
    return null;
  }

  return state.receptionHistory[0];
}

function formatMoney(value) {

  return value.toLocaleString("ja-JP");
}

function formatSignedMoney(value) {

  const sign =
    value >= 0
      ? "+"
      : "-";

  return `${sign}¥${formatMoney(Math.abs(value))}`;
}

function getReceptionTotal() {

  return state.receptionHistory
    .reduce(
      (sum, reception) =>
        sum + reception.totalAmount,
      0
    );
}

function getDiscountCounts(receptions) {

  const counts = {
    500: 0,
    1000: 0
  };

  receptions.forEach(
    reception => {

      (reception.guests || [])
        .forEach(
          guest => {

            if (
              guest.discount === 500 ||
              guest.discount === 1000
            ) {
              counts[guest.discount]++;
            }
          }
        );
    }
  );

  return counts;
}

function renderDiscountCounts(counts) {

  if (
    counts[500] === 0 &&
    counts[1000] === 0
  ) {
    return `
      <div class="sub-text">
        割引なし
      </div>
    `;
  }

  return `
    <div class="discount-counts">
      <div>
        <span>¥500OFF</span>
        <strong>${counts[500]}人</strong>
      </div>
      <div>
        <span>¥1,000OFF</span>
        <strong>${counts[1000]}人</strong>
      </div>
    </div>
  `;
}

function renderCashBreakdown(breakdown) {

  const hasBreakdown =
    CASH_DENOMINATIONS
      .some(
        value =>
          Number(breakdown[value] || 0) > 0
      );

  if (!hasBreakdown) {
    return `
      <div class="sub-text">
        金種別枚数は保存されていません
      </div>
    `;
  }

  return CASH_DENOMINATIONS
    .map(
      value => {

        const count =
          Number(
            breakdown[value] || 0
          );

        return `
          <div class="row compact-row">
            <span>
              ${formatMoney(value)}円
            </span>
            <strong>
              ${count}枚
            </strong>
          </div>
        `;
      }
    )
    .join("");
}

function renderSettings() {

  const s = state.settings;

  screen.innerHTML = `

  <div class="card">

    <div class="card-title">
      設定
    </div>

    <div class="form-row">
      <label>イベント名</label>
      <input
        type="text"
        id="eventNameInput"
        value="${s.eventName}"
        placeholder="イベント名を入力"
      />
    </div>

    <div class="form-row">
      <label>入場料（¥）</label>
      <input
        type="number"
        id="entryFeeInput"
        value="${s.entryFee}"
        min="0"
      />
    </div>

    <div class="form-row">
      <label>ワンドリンク代（¥）</label>
      <input
        type="number"
        id="drinkFeeInput"
        value="${s.drinkFee}"
        min="0"
      />
    </div>

    <div class="form-row">
      <label>箱代（¥）</label>
      <input
        type="number"
        id="boxFeeInput"
        value="${s.boxFee}"
        min="0"
      />
    </div>

    <div class="section-label">
      精算方法の設定
    </div>

    <div class="form-row">
      <label>
        <input
          type="radio"
          name="settlementMethod"
          value="fixed"
          ${s.settlementMethod === 'fixed' ? 'checked' : ''}
        />
        固定額精算
      </label>
    </div>

    <div class="form-row">
      <label>精算額（¥）</label>
      <input
        type="number"
        id="settlementValueInput"
        value="${s.settlementValue}"
        min="0"
      />
      <small style="color: var(--sub); margin-top: 4px; display: block;">
        ${s.settlementMethod === 'fixed' 
          ? '毎回この金額を精算します' 
          : '収入のこのパーセンテージを精算します'}
      </small>
    </div>

    <div class="form-row">
      <label>
        <input
          type="radio"
          name="settlementMethod"
          value="percentage"
          ${s.settlementMethod === 'percentage' ? 'checked' : ''}
        />
        パーセンテージ精算
      </label>
    </div>

    <div class="form-row">
      <label>精算パーセンテージ（％）</label>
      <input
        type="number"
        id="settlementPercentInput"
        value="${s.settlementMethod === 'percentage' ? s.settlementValue : 20}"
        min="0"
        max="100"
      />
      <small style="color: var(--sub); margin-top: 4px; display: block;">
        収入がこの金額を超えた場合のみ精算
      </small>
    </div>

    <div class="form-row">
      <label>精算閾値（¥）</label>
      <input
        type="number"
        id="settlementThresholdInput"
        value="${s.settlementThreshold}"
        min="0"
      />
      <small style="color: var(--sub); margin-top: 4px; display: block;">
        0 = 常に精算
      </small>
    </div>

  </div>

  <button
    class="btn btn-primary btn-large"
    id="saveSettingsBtn"
  >
    設定を保存
  </button>

  `;

  document
    .querySelectorAll(
      'input[name="settlementMethod"]'
    )
    .forEach(radio => {
      radio.addEventListener(
        'change',
        () => {
          const methodType = document
            .querySelector(
              'input[name="settlementMethod"]:checked'
            )
            .value;
          
          const valueInput = document
            .getElementById(
              methodType === 'fixed'
                ? 'settlementValueInput'
                : 'settlementPercentInput'
            );
          
          const description = document
            .querySelectorAll(
              'small'
            )[0];
          
          if (methodType === 'fixed') {
            description.textContent = 
              '毎回この金額を精算します';
          } else {
            description.textContent = 
              '収入のこのパーセンテージを精算します';
          }
        }
      );
    });

  document
    .getElementById(
      'saveSettingsBtn'
    )
    .addEventListener(
      'click',
      () => {
        state.settings.eventName =
          document
            .getElementById(
              'eventNameInput'
            )
            .value || 'イベント';

        state.settings.entryFee =
          parseInt(
            document
              .getElementById(
                'entryFeeInput'
              )
              .value
          ) || 1000;

        state.settings.drinkFee =
          parseInt(
            document
              .getElementById(
                'drinkFeeInput'
              )
              .value
          ) || 500;

        state.settings.boxFee =
          parseInt(
            document
              .getElementById(
                'boxFeeInput'
              )
              .value
          ) || 10000;

        state.settings.settlementMethod =
          document
            .querySelector(
              'input[name="settlementMethod"]:checked'
            )
            .value;

        if (
          state.settings.settlementMethod ===
          'fixed'
        ) {
          state.settings.settlementValue =
            parseInt(
              document
                .getElementById(
                  'settlementValueInput'
                )
                .value
            ) || 10000;
        } else {
          state.settings.settlementValue =
            parseInt(
              document
                .getElementById(
                  'settlementPercentInput'
                )
                .value
            ) || 20;
        }

        state.settings.settlementThreshold =
          parseInt(
            document
              .getElementById(
                'settlementThresholdInput'
              )
              .value
          ) || 0;

        saveState();

        alert(
          '設定を保存しました'
        );

        navigate(renderHome);
      }
    );
}

function renderSetup() {

  screen.innerHTML = `
  
  <div class="card">

    <div class="card-title">
      会計準備
    </div>

    ${renderCashInputs()}

    <div class="row">
      <label>
        ドリンクチケット枚数
      </label>

      <input
        id="ticketCount"
        type="number"
        value="${
          state.drinkTickets
        }"
      >
    </div>

    <button
      class="btn btn-primary btn-large"
      id="startEventBtn"
    >
      受付開始
    </button>

  </div>
  `;

  document
    .getElementById("startEventBtn")
    .addEventListener(
      "click",
      startEvent
    );
}

function renderCashInputs(breakdown = {}) {

  return CASH_DENOMINATIONS
    .map(
      value => {

        const count =
          Number(
            breakdown[value] || 0
          );

        return `
      <div class="row">

        <label>
          ${value.toLocaleString()}円
        </label>

        <input
          type="number"
          min="0"
          value="${count}"
          data-cash="${value}"
        >

      </div>
    `;
      }
    )
    .join("");
}

function readCashInputState() {

  let total = 0;
  const startCashBreakdown = {};

  document
    .querySelectorAll("[data-cash]")
    .forEach(input => {

      const value =
        Number(
          input.dataset.cash
        );

      const count =
        Number(
          input.value || 0
        );

      total += value * count;
      startCashBreakdown[value] = count;
    });

  return {
    total,
    startCashBreakdown
  };
}

function startEvent() {

  const cashState =
    readCashInputState();

  state.startCash = cashState.total;
  state.startCashBreakdown =
    cashState.startCashBreakdown;

  state.drinkTickets =
    Number(
      document.getElementById(
        "ticketCount"
      ).value
    );

  state.initialized = true;

  saveState();

  navigate(renderHome);
}

function renderEditStartCash() {

  screen.innerHTML = `

  <div class="card">

    <div class="card-title">
      初期金庫額を編集
    </div>

    ${renderCashInputs(
      state.startCashBreakdown
    )}

    <button
      class="btn btn-primary btn-large"
      id="saveStartCashBtn"
    >
      保存
    </button>

  </div>
  `;

  document
    .getElementById(
      "saveStartCashBtn"
    )
    .onclick = () => {

      const cashState =
        readCashInputState();

      state.startCash =
        cashState.total;

      state.startCashBreakdown =
        cashState.startCashBreakdown;

      saveState();

      navigate(renderHome);
    };
}

function renderEditDrinkTickets() {

  screen.innerHTML = `

  <div class="card">

    <div class="card-title">
      ドリチケ枚数を編集
    </div>

    <div class="row">
      <label>
        ドリンクチケット残数
      </label>

      <input
        id="editTicketCount"
        type="number"
        min="0"
        value="${state.drinkTickets}"
      >
    </div>

    <button
      class="btn btn-primary btn-large"
      id="saveDrinkTicketsBtn"
    >
      保存
    </button>

  </div>
  `;

  document
    .getElementById(
      "saveDrinkTicketsBtn"
    )
    .onclick = () => {

      state.drinkTickets =
        Number(
          document
            .getElementById(
              "editTicketCount"
            )
            .value ||
            0
        );

      saveState();

      navigate(renderHome);
    };
}

function renderHome() {

  const last =
    getLastReception();

  const totalDiscountCounts =
    getDiscountCounts(
      state.receptionHistory
    );

  screen.innerHTML = `
  
  <div class="card">

    <div class="card-title">
      来場状況
    </div>

    <div class="stats-grid">

      <div class="stat">

        <div class="stat-label">
          一般
        </div>

        <div class="stat-value">
          ${state.totals.general}
        </div>

        <div class="tally">
          ${tallyString(
            state.totals.general
          )}
        </div>

      </div>

      <div class="stat">

        <div class="stat-label">
          TMP
        </div>

        <div class="stat-value">
          ${state.totals.tmp}
        </div>

        <div class="tally">
          ${tallyString(
            state.totals.tmp
          )}
        </div>

      </div>

      <div class="stat">

        <div class="stat-label">
          合計
        </div>

        <div class="stat-value">
          ${getTotalPeople()}
        </div>

      </div>

    </div>

    <div class="discount-count-block">
      <div class="section-label">
        うち割引入場人数
      </div>
      ${renderDiscountCounts(
        totalDiscountCounts
      )}
    </div>

  </div>

  <div class="card">

    <div class="card-title">
      直近受付
    </div>

    ${
      last
        ? `
        <div>
          ${last.timestamp}
        </div>

        <div>
          一般 ${last.general}名
        </div>

        <div>
          TMP ${last.tmp}名
        </div>

        <div class="discount-count-block">
          <div class="section-label">
            うち割引入場人数
          </div>
          ${renderDiscountCounts(
            getDiscountCounts([last])
          )}
        </div>
      `
        : "まだ受付履歴はありません"
    }

  </div>

  <button
    class="btn btn-primary btn-large"
    id="newReceptionBtn"
  >
    新規受付
  </button>

  <br><br>

  <button
    class="btn btn-secondary btn-large"
    id="historyBtn"
  >
    履歴
  </button>

  <br><br>

  <button
    class="btn btn-secondary btn-large"
    id="resultBtn"
  >
    リザルト(精算画面へ)
  </button>

  <br><br>

  <button
    class="btn btn-secondary btn-large"
    id="settingsBtn"
  >
    ⚙️ 設定
  </button>

  <br><br>
  <br><br>
  <br><br>

  <div class="card drink-ticket-card">

    <div class="card-title">
      ドリチケ残数
    </div>

    <div class="ticket-count">
      ${state.drinkTickets}
      <span>枚</span>
    </div>

    <button
      class="btn btn-secondary"
      id="editDrinkTicketsBtn"
    >
      ドリチケ枚数を編集
    </button>

  </div>

  <div class="card">

    <div class="card-title">
      初期金庫額
    </div>

    <div class="row">

      <span>
        合計
      </span>

      <strong>
        ¥${formatMoney(state.startCash)}
      </strong>

    </div>

    ${renderCashBreakdown(
      state.startCashBreakdown
    )}

    <br>

    <button
      class="btn btn-secondary"
      id="editStartCashBtn"
    >
      初期金庫額を編集
    </button>

  </div>


  <br><br>

  <button
    class="btn btn-danger btn-large"
    id="clearEventBtn"
  >
    イベントデータを一括削除
  </button>
  `;

  document
    .getElementById(
      "newReceptionBtn"
    )
    .addEventListener(
      "click",
      () => navigate(
        renderReceptionInput
      )
    );

  document
    .getElementById(
      "historyBtn"
    )
    .addEventListener(
      "click",
      () => navigate(
        renderHistory
      )
    );

  document
    .getElementById(
      "resultBtn"
    )
    .addEventListener(
      "click",
      () => navigate(
        renderResult
      )
    );

  document
    .getElementById(
      "settingsBtn"
    )
    .addEventListener(
      "click",
      () => navigate(
        renderSettings
      )
    );

  document
    .getElementById(
      "editStartCashBtn"
    )
    .addEventListener(
      "click",
      () => navigate(
        renderEditStartCash
      )
    );

  document
    .getElementById(
      "editDrinkTicketsBtn"
    )
    .addEventListener(
      "click",
      () => navigate(
        renderEditDrinkTickets
      )
    );

  document
    .getElementById(
      "clearEventBtn"
    )
    .addEventListener(
      "click",
      clearEventData
    );
}

function renderReceptionInput() {

  screen.innerHTML = `

  <div class="card reception-card">

    <div class="card-title">
      新規受付
    </div>

    <div class="reception-counter-list">

      <div class="counter-row">

        <div class="counter-label">
          <span>一般</span>
          <small>通常来場者</small>
        </div>

        <div class="counter">

          <button
            class="counter-btn"
            id="generalMinus"
          >
            −
          </button>

          <div
            class="counter-value"
            id="generalCount"
          >
            0
          </div>

          <button
            class="counter-btn"
            id="generalPlus"
          >
            +
          </button>

        </div>

      </div>

      <div class="counter-row">

        <div class="counter-label">
          <span>TMP</span>
          <small>関係者・招待</small>
        </div>

        <div class="counter">

          <button
            class="counter-btn"
            id="tmpMinus"
          >
            −
          </button>

          <div
            class="counter-value"
            id="tmpCount"
          >
            0
          </div>

          <button
            class="counter-btn"
            id="tmpPlus"
          >
            +
          </button>

        </div>

      </div>

    </div>

    <div class="reception-total">
      <span>合計</span>
      <strong id="receptionTotalCount">0名</strong>
    </div>

    <div id="tmpNamesContainer" style="display:none; margin-top:16px; padding-top:16px; border-top:1px solid var(--border);">
      <div class="section-label">
        TMPメンバーは名前を記録
      </div>
      <div id="tmpNamesList" style="display:grid; gap:8px; margin-bottom:8px;">
      </div>
      
    </div>

    <button
      class="btn btn-primary btn-large"
      id="goDiscount"
    >
      次へ
    </button>

  </div>
  `;

  let general = 0;
  let tmp = 0;
  let tmpNames = [];

  const refresh = () => {

    document.getElementById(
      "generalCount"
    ).textContent = general;

    document.getElementById(
      "tmpCount"
    ).textContent = tmp;

    document.getElementById(
      "receptionTotalCount"
    ).textContent =
      `${general + tmp}名`;

    // TMP名入力欄の表示制御
    const container = document.getElementById(
      "tmpNamesContainer"
    );
    if (tmp > 0) {
      container.style.display = "block";
      updateTmpNamesList();
    } else {
      container.style.display = "none";
      tmpNames = [];
    }
  };

  const updateTmpNamesList = () => {
    const listContainer = document.getElementById(
      "tmpNamesList"
    );
    listContainer.innerHTML = tmpNames
      .map((name, index) => `
        <div style="display:flex; gap:8px; align-items:center;">
          <input 
            type="text" 
            value="${name}" 
            placeholder="名前を入力"
            data-index="${index}"
            class="tmp-name-input"
            style="flex:1; padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px;"
          >
          <button 
            class="tmp-name-delete"
            data-index="${index}"
            style="width:40px; height:40px; padding:0; border:1px solid var(--danger); background:white; color:var(--danger); border-radius:8px; font-weight:bold; cursor:pointer;"
          >
            削
          </button>
        </div>
      `)
      .join("");

    // 名前入力フィールドの変更イベント
    document.querySelectorAll(".tmp-name-input").forEach(input => {
      input.addEventListener("change", (e) => {
        const index = parseInt(e.target.dataset.index);
        tmpNames[index] = e.target.value;
      });
    });

    // 削除ボタンのイベント
    document.querySelectorAll(".tmp-name-delete").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        tmpNames.splice(index, 1);
        tmp--;
        refresh();
      });
    });
  };

  refresh();

  document
    .getElementById("generalPlus")
    .onclick = () => {
      general++;
      refresh();
    };

  document
    .getElementById("generalMinus")
    .onclick = () => {
      if (general > 0) {
        general--;
        refresh();
      }
    };

  document
    .getElementById("tmpPlus")
    .onclick = () => {
      tmp++;
      tmpNames.push("");
      refresh();
    };

  document
    .getElementById("tmpMinus")
    .onclick = () => {
      if (tmp > 0) {
        tmp--;
        tmpNames.pop();
        refresh();
      }
    };

  document
    .getElementById("goDiscount")
    .onclick = () => {

      const total =
        general + tmp;

      if (total === 0) {

        alert(
          "人数を入力してください"
        );

        return;
      }

      // TMP客の名前入力チェック
      if (tmp > 0) {
        const emptyNames = tmpNames.filter(
          name => !name || name.trim() === ""
        );
        
        if (emptyNames.length > 0) {
          alert(
            "TMPメンバーの名前を全て入力してください"
          );
          return;
        }
      }

      state.currentReception = {

        general,
        tmp,

        guests: []
      };

      for (
        let i = 0;
        i < general;
        i++
      ) {

        state.currentReception
          .guests.push({

          type: "general",

          discount: 0

        });
      }

      for (
        let i = 0;
        i < tmp;
        i++
      ) {

        state.currentReception
          .guests.push({

          type: "tmp",

          discount: 0,

          name: tmpNames[i] || ""

        });
      }

      navigate(
        renderDiscountScreen
      );
    };
}

function renderDiscountScreen() {

  const guests =
    state.currentReception.guests;

  let html = `

  <div class="card">

    <div class="card-title">
      割引設定
    </div>
  `;

  guests.forEach(
    (guest,index) => {

      html += `

      <div class="discount-card">

        <div class="discount-card-header">

          <strong>

            ${
              guest.type === "tmp"
                ? guest.name || "TMP来場者"
                : `来場者 ${index + 1}`
            }

          </strong>

          <span class="guest-type">

            ${
              guest.type ===
              "general"
                ? "一般"
                : "TMP"
            }

          </span>

        </div>

        <div
          class="discount-options"
        >

          <div
            class="discount-option"
          >

            <button
              class="${guest.discount === 0 ? "active" : ""}"
              onclick="
              setDiscount(
              ${index},
              0
              )"
            >

              通常

            </button>

          </div>

          <div
            class="discount-option"
          >

            <button
              class="${guest.discount === 500 ? "active" : ""}"
              onclick="
              setDiscount(
              ${index},
              500
              )"
            >

              -500

            </button>

          </div>

          <div
            class="discount-option"
          >

            <button
              class="${guest.discount === 1000 ? "active" : ""}"
              onclick="
              setDiscount(
              ${index},
              1000
              )"
            >

              -1000

            </button>

          </div>

        </div>

        <div class="discount-current">

          現在:
          ¥${guest.discount}

        </div>

      </div>
      `;
    }
  );

  html += `

    <button
      class="
      btn
      btn-primary
      btn-large
      "
      id="proceedPayment"
    >

      会計へ

    </button>

  </div>
  `;

  screen.innerHTML = html;

  document
    .getElementById(
      "proceedPayment"
    )
    .onclick = () =>
      navigate(
        renderPaymentScreen
      );
}

function setDiscount(
  index,
  discount
) {

  state
    .currentReception
    .guests[index]
    .discount = discount;

  renderDiscountScreen();
}

function renderPaymentScreen() {

  const guests =
    state.currentReception.guests;

  let total = 0;

  guests.forEach(
    guest => {

      total +=

        getEntryFee() +

        getDrinkFee() -

        guest.discount;
    }
  );

  state.currentReception
    .totalAmount = total;

  screen.innerHTML = `

  <div class="card payment-card">

    <div class="card-title">
      お支払い金額
    </div>

    <div
      class="money-display"
    >

      <div class="amount">

        ¥${formatMoney(
          total
        )}

      </div>

    </div>

    <div class="form-row">

      <label>

        預かり金額

      </label>

      <input
        id="paidAmount"
        type="number"
      >

    </div>

    <button
      class="
      btn
      btn-primary
      btn-large
      "
      id="calcChangeBtn"
    >

      次へ

    </button>

  </div>
  `;

  document
    .getElementById(
      "calcChangeBtn"
    )
    .onclick = () => {

      const paid = Number(
        document
          .getElementById(
            "paidAmount"
          )
          .value
      );

      if (
        paid < total
      ) {

        alert(
          "預かり金額不足"
        );

        return;
      }

      state.currentReception
        .paidAmount = paid;

      state.currentReception
        .change =
          paid - total;

      navigate(
        renderChecklist
      );
    };
}

function renderChecklist() {

  const reception =
    state.currentReception;

  screen.innerHTML = `

  <div class="card checklist-card">

    <div class="card-title">
      受付確認
    </div>

    <div class="money-display">

      <div class="label">
        お釣り
      </div>

      <div class="amount">

        ¥${formatMoney(
          reception.change
        )}

      </div>

    </div>

    <div class="checklist">

      <label>

        <input
          type="checkbox"
          id="checkTicket"
        >

        <span>ドリンクチケットを渡した</span>

      </label>

      <label>

        <input
          type="checkbox"
          id="checkMoney"
        >

        <span>お金を受け取った</span>

      </label>

      <label>

        <input
          type="checkbox"
          id="checkChange"
        >

        <span>お釣りを渡した</span>

      </label>

    </div>

    <br>

    <button
      class="
      btn
      btn-primary
      btn-large
      "
      id="completeReceptionBtn"
    >

      受付完了

    </button>

  </div>
  `;

  document
    .getElementById(
      "completeReceptionBtn"
    )
    .onclick =
      completeReception;
}

function completeReception() {

  const ticket =
    document.getElementById(
      "checkTicket"
    ).checked;

  const money =
    document.getElementById(
      "checkMoney"
    ).checked;

  const change =
    document.getElementById(
      "checkChange"
    ).checked;

  if (
    !ticket ||
    !money ||
    !change
  ) {

    alert(
      "全項目確認してください"
    );

    return;
  }

  const reception =
    state.currentReception;

  const grossEntrance =
    reception.guests.length *
    (getEntryFee() + getDrinkFee());

  const totalDiscount =
    reception.guests.reduce(
      (sum, guest) =>
        sum + guest.discount,
      0
    );

  const timestamp =
    new Date()
      .toLocaleString(
        "ja-JP"
      );

  const historyEntry = {

    id:
      Date.now(),

    timestamp,

    general:
      reception.general,

    tmp:
      reception.tmp,

    guests:
      structuredClone(
        reception.guests
      ),

    totalAmount:
      reception.totalAmount,

    grossEntrance,

    totalDiscount,

    paidAmount:
      reception.paidAmount,

    change:
      reception.change
  };

  state.receptionHistory
    .unshift(
      historyEntry
    );

  state.totals.general +=
    reception.general;

  state.totals.tmp +=
    reception.tmp;

  state.totals.grossEntrance +=
    grossEntrance;

  state.totals.totalDiscount +=
    totalDiscount;

  state.drinkTickets -=

    (
      reception.general +
      reception.tmp
    );

  saveState();

  renderSuccessScreen();
}

function renderSuccessScreen() {
  
  backBtn.classList.add('hidden');
  const latest =
    state.receptionHistory[0];

  screen.innerHTML = `

  <div class="success-screen">

    <div class="success-icon">
      ✓
    </div>

    <div class="success-text">
      受付完了
    </div>

    <div class="success-subtext">
      3秒後にホームへ戻ります
    </div>

    <div class="success-summary">

      <div>
        <span>受付時刻</span>
        <strong>${latest.timestamp}</strong>
      </div>

      <div>
        <span>一般</span>
        <strong>${latest.general}名</strong>
      </div>

      <div>
        <span>TMP</span>
        <strong>${latest.tmp}名</strong>
      </div>

      <div>
        <span>支払い金額</span>
        <strong>¥${formatMoney(latest.totalAmount)}</strong>
      </div>

    </div>

  </div>
  `;

  setTimeout(
    () => {

      state.currentReception =
        null;

      navigate(
        renderHome
      );

    },
    3000
  );
}

function renderHistory() {

  let html = `

  <div class="card">

    <div class="card-title">

      受付履歴

    </div>
  `;

  if (
    state.receptionHistory
      .length === 0
  ) {

    html += `
      履歴はありません
    `;
  } else {

    html += `

      <button
        class="
        btn
        btn-danger
        "
        id="clearReceptionHistoryBtn"
      >

        受付履歴を一括削除

      </button>

      <br><br>
    `;
  }

  state.receptionHistory
    .forEach(
      entry => {

        const discountCounts =
          getDiscountCounts([entry]);

        html += `

        <div
          class="
          history-item
          "
        >

          <div
            class="
            history-time
            "
          >

            ${
              entry.timestamp
            }

          </div>

          <div>

            一般
            ${
              entry.general
            }名

          </div>

          <div>

            TMP
            ${
              entry.tmp
            }名

          </div>

          <div>

            ¥${formatMoney(
              entry.totalAmount
            )}

          </div>

          <div class="discount-count-block">
            <div class="section-label">
              うち割引入場人数
            </div>
            ${renderDiscountCounts(
              discountCounts
            )}
          </div>

          ${entry.tmp > 0 ? `
            <div class="discount-count-block">
              <div class="section-label">
                TMPメンバー受付済
              </div>
              <div style="background:#fafafa; padding:12px; border-radius:12px; border:1px solid var(--border);">
                ${(entry.guests || [])
                  .filter(g => g.type === "tmp")
                  .map(g => `
                    <div style="padding:8px 0; border-bottom:1px solid var(--border);">
                      <span style="font-weight:600;">${g.name || "名前未記入"}</span>
                    </div>
                  `)
                  .join("")}
              </div>
            </div>
          ` : ""}

          <br>

          <button
            class="
            btn
            btn-secondary
            "
            onclick="
            deleteHistory(
            ${
              entry.id
            }
            )
            "
          >

            削除

          </button>

        </div>
        `;
      }
    );

  html += `
  </div>
  `;

  screen.innerHTML = html;

  const clearEventBtn =
    document.getElementById(
      "clearEventBtn"
    );

  if (clearEventBtn) {

    clearEventBtn.onclick =
      clearEventData;
  }

  const clearReceptionHistoryBtn =
    document.getElementById(
      "clearReceptionHistoryBtn"
    );

  if (clearReceptionHistoryBtn) {

    clearReceptionHistoryBtn.onclick =
      clearReceptionHistory;
  }
}

function deleteHistory(id) {

  const target =
    state.receptionHistory
      .find(
        x =>
          x.id === id
      );

  if (!target) return;

  if (
    !confirm(
      "削除しますか？"
    )
  ) {
    return;
  }

  state.totals.general -=
    target.general;

  state.totals.tmp -=
    target.tmp;

  state.totals.grossEntrance -=
    target.grossEntrance ||
    (
      (target.general + target.tmp) *
      (getEntryFee() + getDrinkFee())
    );

  state.totals.totalDiscount -=
    target.totalDiscount ||
    0;

  state.drinkTickets +=

    target.general +
    target.tmp;

  state.receptionHistory =

    state.receptionHistory
      .filter(
        x =>
          x.id !== id
      );

  saveState();

  renderHistory();
}
function clearReceptionHistory() {

  if (
    !confirm(
      "受付履歴をすべて削除しますか？"
    )
  ) {
    return;
  }

  const totalPeople =
    state.totals.general +
    state.totals.tmp;

  state.drinkTickets += totalPeople;

  state.receptionHistory = [];

  state.totals = {
    general: 0,
    tmp: 0,
    grossEntrance: 0,
    totalDiscount: 0
  };

  saveState();

  renderHistory();
}

function clearEventData() {

  if (
    !confirm(
      "イベントデータをすべて削除しますか？\n受付履歴、初期金庫額、ドリチケ枚数も削除されます。"
    )
  ) {
    return;
  }

  state = createInitialState();
  saveState();

  pageHistory = [];
  navigate(renderSetup);
}

function renderResult() {

  const people =

    state.totals.general +

    state.totals.tmp;

  // TMP来場者一覧を集計
  const allTmpGuests = state.receptionHistory
    .flatMap(r => 
      (r.guests || [])
        .filter(g => g.type === "tmp")
        .map(g => ({ name: g.name, timestamp: r.timestamp }))
    );

  const grossEntrance =
    state.receptionHistory
      .reduce(
        (sum, r) =>
          sum +
          (
            r.grossEntrance ||
            (
              (r.general + r.tmp) *
              (getEntryFee() + getDrinkFee())
            )
          ),
        0
      );

  const totalDiscount =
    state.receptionHistory
      .reduce(
        (sum, r) =>
          sum +
          (
            r.totalDiscount ||
            0
          ),
        0
      );

  const discountCounts =
    getDiscountCounts(
      state.receptionHistory
    );

  const entranceIncome =

    grossEntrance -

    totalDiscount;

  const drinkTicketAmount =

    people *

    getDrinkFee();

  const profitTargetIncome =

    entranceIncome -

    drinkTicketAmount;

  const profit =

    profitTargetIncome -

    getBoxFee();

  const theoreticalCash =

    state.startCash +

    getReceptionTotal();

  const cashIncrease =
    theoreticalCash -
    state.startCash;

  screen.innerHTML = `

  <div class="card">

    <div class="card-title">

      イベント結果

    </div>

    <div class="stats-grid">

      <div class="stat">

        <div class="stat-label">
          一般
        </div>

        <div class="stat-value">
          ${state.totals.general}
        </div>

      </div>

      <div class="stat">

        <div class="stat-label">
          TMP
        </div>

        <div class="stat-value">
          ${state.totals.tmp}
        </div>

      </div>

      <div class="stat">

        <div class="stat-label">
          合計
        </div>

        <div class="stat-value">
          ${people}
        </div>

      </div>

    </div>
    <div class="discount-count-block">
      <div class="section-label">
        うち割引入場人数
      </div>
      ${renderDiscountCounts(
        discountCounts
      )}
    </div>

    <div class="discount-count-block row">

      <span class="section-label">
        総割引額
      </span>

      <strong>

        ¥${formatMoney(
          totalDiscount
        )}

      </strong>

    </div>

  </div>

 <div class="card">
  ${allTmpGuests.length > 0 ? `
    <div class="discount-count-block">
      <div class="section-label">
        受付済TMPメンバー（${allTmpGuests.length}名）
      </div>

      <div style="
        background:#fafafa;
        padding:12px;
        border-radius:12px;
        border:1px solid var(--border);
        max-height:300px;
        overflow-y:auto;
      ">
        ${allTmpGuests
          .map((guest, idx) => `
            <div style="
              padding:10px 0;
              border-bottom:1px solid var(--border);
              display:flex;
              justify-content:space-between;
              align-items:center;
            ">
              <span style="font-weight:600;">${guest.name}</span>
              <span style="font-size:12px; color:var(--sub);">
                ${guest.timestamp}
              </span>
            </div>
          `)
          .join("")}
      </div>
    </div>
  ` : ""}
</div>

  <div class="card" style="text-align: center; padding: 40px 20px; background:blue; color: white; border-radius: 20px;">
    <div style="font-size: 14px; font-weight: 700; opacity: 0.8; margin-bottom: 16px;">
      精算額
    </div>
    <div style="font-size: 64px; font-weight: 900; margin-bottom: 8px; line-height: 1;">
      ¥${formatMoney(drinkTicketAmount + getBoxFee())}
    </div>
    <div style="font-size: 13px; opacity: 0.8; line-height: 1.6;">
      <div>1D(ドリチケ)分：¥${formatMoney(drinkTicketAmount)}</div>
      <div style="margin-top: 8px;">箱代：¥${formatMoney(getBoxFee())}</div>
    </div>
  </div>

  <div class="card">
  <div class="stat">

    <div class="row">

      <span>
        入場料+1Dの総額
      </span>

      <strong>

        ¥${formatMoney(
          entranceIncome
        )}

      </strong>

    </div>


    <div class="row">

      <span class="highlight-blue">
        1D(ドリチケ)分
      </span>

      <strong class="highlight-blue">

        ¥${formatMoney(
          drinkTicketAmount
        )}

      </strong>

    </div>

    <div class="row">

      <span>
        利益対象収入
      </span>

      <strong>

        ¥${formatMoney(
          profitTargetIncome
        )}

      </strong>

    </div>

    <div class="row">

      <span class="highlight-blue">
        箱代
      </span>

      <strong class="highlight-blue">

        -¥10,000

      </strong>

    </div>

    <div class="row">

      <span class="highlight-red">
        利益
      </span>

      <strong class="highlight-red">

        ¥${formatMoney(
          profit
        )}

      </strong>

    </div>
    </div>

  </div>


  <div class="card">

    <div class="row">

      <span>
        受付終了時・精算前の金庫額
      </span>

      <strong>

        ¥${formatMoney(
          theoreticalCash
        )}
        (${formatSignedMoney(
          cashIncrease
        )})

      </strong>

    </div>

<div class="row">

      <span>
        精算後の金庫額
      </span>

      <strong>

        ¥${formatMoney(
          theoreticalCash - drinkTicketAmount - 10000
        )}
        (${formatSignedMoney(
          cashIncrease - drinkTicketAmount - 10000
        )})

      </strong>

    </div>

  </div>

  <button
    class="
    btn
    btn-secondary
    btn-large
    "
    id="cashCheckBtn"
  >

    金庫照合

  </button>

  <br><br>

  <button
    class="
    btn
    btn-danger
    btn-large
    "
    id="clearEventBtn"
  >

    イベントデータを一括削除

  </button>

  `;

  document
    .getElementById(
      "cashCheckBtn"
    )
    .onclick =
      () =>
      navigate(
        renderCashCheck
      );

  document
    .getElementById(
      "clearEventBtn"
    )
    .onclick =
      clearEventData;
}

function renderCashCheck() {

  screen.innerHTML = `

  <div class="card">

    <div class="card-title">

      金庫照合

    </div>

      10000円
      <input
      id="c10000"
      type="number">

      5000円
      <input
      id="c5000"
      type="number">

      1000円
      <input
      id="c1000"
      type="number">

      500円
      <input
      id="c500"
      type="number">

      100円
      <input
      id="c100"
      type="number">

      50円
      <input
      id="c50"
      type="number">

      10円
      <input
      id="c10"
      type="number">

      <br><br>

      <button
      id="calcCashBtn"
      class="
      btn
      btn-primary
      btn-large
      ">
      照合
      </button>

  </div>
  `;

  document
    .getElementById(
      "calcCashBtn"
    )
    .onclick =
      calculateCashCheck;
}

function calculateCashCheck() {

  const bills = [
    10000,
    5000,
    1000,
    500,
    100,
    50,
    10
  ];

  const actualCash =
    bills.reduce(
      (sum, value) =>
        sum +
        value *
        Number(
          document
            .getElementById(
              `c${value}`
            )
            .value ||
            0
        ),
      0
    );

    const people =
    state.totals.general +
    state.totals.tmp;

  const drinkTicketAmount =
    people * getDrinkFee();

  const theoreticalCash =
    state.startCash +
    state.receptionHistory
      .reduce(
        (sum, r) =>
          sum + r.totalAmount,
        0
      );

  const diff =
    actualCash - theoreticalCash + drinkTicketAmount + getBoxFee();

  alert(
    `実金庫額: ¥${formatMoney(actualCash)}\n` +
    `理論金庫額: ¥${formatMoney(theoreticalCash - drinkTicketAmount - 10000)}\n` +
    `差額: ¥${formatMoney(diff)}`
  );
}

if (
  state.initialized
) {

  navigate(
    renderHome
  );

} else {

  navigate(
    renderSetup
  );
}
