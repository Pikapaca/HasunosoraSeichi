const PLACES_DATA_PATH = "./data/places-index.json";
const HOMEPAGE_ITEM_LIMIT = 6;
const SEARCH_RESULT_LIMIT = 10;

let allPlaces = [];


/* =========================
   获取 HTML 元素
========================= */

const latestContainer =
  document.querySelector("#latest-places");

const popularContainer =
  document.querySelector("#popular-places");

const foodContainer =
  document.querySelector("#food-places");

const shufflePopularButton =
  document.querySelector("#shuffle-popular");

const shuffleFoodButton =
  document.querySelector("#shuffle-food");

const searchInput =
  document.querySelector("#site-search-input");

const searchResults =
  document.querySelector("#search-results");


/* =========================
   页面初始化
========================= */

document.addEventListener("DOMContentLoaded", () => {
  setupMobileMenu();
  setupShuffleButtons();
  setupSearch();
  loadPlaces();
});


/* =========================
   读取地点索引
========================= */

async function loadPlaces() {
  try {
    const response = await fetch(PLACES_DATA_PATH);

    if (!response.ok) {
      throw new Error(
        `places-index.json 读取失败：${response.status}`
      );
    }

    const data = await response.json();

    allPlaces = Array.isArray(data)
      ? data
      : data.places;

    if (!Array.isArray(allPlaces)) {
      throw new Error(
        "places-index.json 中缺少 places 数组。"
      );
    }

    allPlaces = allPlaces.filter(isValidPlace);

    renderHomepage();
  } catch (error) {
    console.error(error);

    showError(
      latestContainer,
      "最新圣地读取失败。"
    );

    showError(
      popularContainer,
      "热门地点读取失败。"
    );

    showError(
      foodContainer,
      "美食圣地读取失败。"
    );
  }
}


/* =========================
   主页地点板块
========================= */

function renderHomepage() {
  renderLatestPlaces();
  renderPopularPlaces();
  renderFoodPlaces();
}


/**
 * 按 updatedAt 从新到旧显示。
 */
function renderLatestPlaces() {
  const latestPlaces = [...allPlaces]
    .sort((placeA, placeB) => {
      return (
        getDateNumber(placeB.updatedAt) -
        getDateNumber(placeA.updatedAt)
      );
    })
    .slice(0, HOMEPAGE_ITEM_LIMIT);

  renderPlaceLinks(
    latestContainer,
    latestPlaces
  );
}


/**
 * 从普通地点中随机显示。
 */
function renderPopularPlaces() {
  const randomPlaces = getRandomItems(
    candidates,
    HOMEPAGE_ITEM_LIMIT
  );

  renderPlaceLinks(
    popularContainer,
    randomPlaces
  );
}


/**
 * 从餐饮类别中随机显示。
 */
function renderFoodPlaces() {
  const candidates = allPlaces.filter(
    (place) => place.isFood === true
  );

  const randomPlaces = getRandomItems(
    candidates,
    HOMEPAGE_ITEM_LIMIT
  );

  renderPlaceLinks(
    foodContainer,
    randomPlaces
  );
}
}


/**
 * 在主页板块中生成地点名称链接。
 */
function renderPlaceLinks(container, places) {
  if (!container) {
    return;
  }

  if (places.length === 0) {
    container.innerHTML = `
      <p class="status-message">
        暂无可显示的地点。
      </p>
    `;

    return;
  }

  container.innerHTML = places
    .map(createHomepagePlaceLink)
    .join("");
}


function createHomepagePlaceLink(place) {
  return `
    <a
      class="homepage-place-link"
      href="${createPlaceUrl(place)}"
    >
      ${escapeHtml(place.name)}
    </a>
  `;
}


/* =========================
   侧边栏搜索
========================= */

function setupSearch() {
  if (!searchInput || !searchResults) {
    return;
  }

  searchInput.addEventListener("input", () => {
    const keyword = normalizeText(
      searchInput.value
    );

    if (!keyword) {
      hideSearchResults();
      return;
    }

    const matchedPlaces = allPlaces
      .filter((place) => {
        const chineseName = normalizeText(
          place.name
        );

        const japaneseName = normalizeText(
          place.nameJa || ""
        );

        return (
          chineseName.includes(keyword) ||
          japaneseName.includes(keyword)
        );
      })
      .slice(0, SEARCH_RESULT_LIMIT);

    renderSearchResults(matchedPlaces);
  });

  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim()) {
      searchInput.dispatchEvent(
        new Event("input")
      );
    }
  });

  searchInput.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        hideSearchResults();
        searchInput.blur();
      }
    }
  );

  document.addEventListener("click", (event) => {
    const searchArea =
      event.target.closest(".site-search");

    if (!searchArea) {
      hideSearchResults();
    }
  });
}


/**
 * 生成搜索结果。
 */
function renderSearchResults(places) {
  if (!searchResults) {
    return;
  }

  if (places.length === 0) {
    searchResults.innerHTML = `
      <p class="search-empty">
        没有找到相关地点
      </p>
    `;

    searchResults.hidden = false;
    return;
  }

  searchResults.innerHTML = places
    .map(createSearchResultItem)
    .join("");

  searchResults.hidden = false;
}


/**
 * 单条搜索结果。
 */
function createSearchResultItem(place) {
  const japaneseName = place.nameJa
    ? `
      <span class="search-result-ja">
        ${escapeHtml(place.nameJa)}
      </span>
    `
    : "";

  return `
    <a
      class="search-result-item"
      href="${createPlaceUrl(place)}"
    >
      <span class="search-result-name">
        ${escapeHtml(place.name)}
      </span>

      ${japaneseName}

      <span class="search-result-meta">
        ${escapeHtml(place.category || "")}
      </span>
    </a>
  `;
}


function hideSearchResults() {
  if (!searchResults) {
    return;
  }

  searchResults.hidden = true;
  searchResults.innerHTML = "";
}


/**
 * 忽略英文字母大小写和首尾空格。
 */
function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase();
}


/* =========================
   地点链接
========================= */

/**
 * 生成：
 * ./places/kanazawa/?id=kanazawa-station
 */
function createPlaceUrl(place) {
  const prefecture = encodeURIComponent(place.prefecture);
  const city = encodeURIComponent(place.city);
  const id = encodeURIComponent(place.id);

  return `./places/${prefecture}/detail.html?city=${city}&id=${id}`;
}


/* =========================
   数据工具
========================= */

function isValidPlace(place) {
  return Boolean(
    place &&
    place.id &&
    place.name &&
    place.prefecture &&
    place.city
  );
}


function getDateNumber(dateString) {
  const dateNumber =
    new Date(dateString).getTime();

  if (Number.isNaN(dateNumber)) {
    return 0;
  }

  return dateNumber;
}


function getRandomItems(array, count) {
  const copiedArray = [...array];

  for (
    let index = copiedArray.length - 1;
    index > 0;
    index--
  ) {
    const randomIndex = Math.floor(
      Math.random() * (index + 1)
    );

    [
      copiedArray[index],
      copiedArray[randomIndex]
    ] = [
      copiedArray[randomIndex],
      copiedArray[index]
    ];
  }

  return copiedArray.slice(0, count);
}


/* =========================
   按钮
========================= */

function setupShuffleButtons() {
  if (shufflePopularButton) {
    shufflePopularButton.addEventListener(
      "click",
      renderPopularPlaces
    );
  }

  if (shuffleFoodButton) {
    shuffleFoodButton.addEventListener(
      "click",
      renderFoodPlaces
    );
  }
}


/* =========================
   手机端侧边栏
========================= */

function setupMobileMenu() {
  const menuButton =
    document.querySelector("#mobile-menu-button");

  const sidebar =
    document.querySelector("#sidebar");

  const overlay =
    document.querySelector("#sidebar-overlay");

  if (!menuButton || !sidebar || !overlay) {
    return;
  }

  function openSidebar() {
    sidebar.classList.add("open");
    overlay.hidden = false;

    menuButton.setAttribute(
      "aria-expanded",
      "true"
    );

    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.hidden = true;

    menuButton.setAttribute(
      "aria-expanded",
      "false"
    );

    document.body.style.overflow = "";
  }

  menuButton.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  overlay.addEventListener(
    "click",
    closeSidebar
  );

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) {
      closeSidebar();
    }
  });
}


/* =========================
   错误及安全处理
========================= */

function showError(container, message) {
  if (!container) {
    return;
  }

  container.innerHTML = `
    <p class="status-message error">
      ${escapeHtml(message)}
    </p>
  `;
}


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}