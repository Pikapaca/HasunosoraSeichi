const PLACES_DATA_PATH =
  "../data/places-index.json";

const SEARCH_RESULT_LIMIT = 10;

let allPlaces = [];
let placesLoaded = false;


/* =========================
   获取页面元素
========================= */

const searchInput =
  document.querySelector("#site-search-input");

const searchResults =
  document.querySelector("#search-results");


/* =========================
   页面初始化
========================= */

document.addEventListener("DOMContentLoaded", () => {
  setupMobileMenu();
  setupRegionToggles();
  setupSearch();
  loadPlaceIndex();
});


/* =========================
   读取地点索引
========================= */

async function loadPlaceIndex() {
  try {
    const response = await fetch(
      PLACES_DATA_PATH
    );

    if (!response.ok) {
      throw new Error(
        `places-index.json 读取失败：${response.status}`
      );
    }

    const data = await response.json();

    /*
     * 同时支持两种 JSON 格式：
     *
     * [
     *   {...},
     *   {...}
     * ]
     *
     * 或者：
     *
     * {
     *   "places": [
     *     {...},
     *     {...}
     *   ]
     * }
     */
    allPlaces = Array.isArray(data)
      ? data
      : data.places;

    if (!Array.isArray(allPlaces)) {
      throw new Error(
        "places-index.json 中没有有效的地点数组。"
      );
    }

    allPlaces = allPlaces.filter(
      isValidIndexItem
    );

    placesLoaded = true;

    /*
     * 如果用户在数据加载完成前已经输入文字，
     * 数据加载后自动重新搜索。
     */
    if (
      searchInput &&
      searchInput.value.trim()
    ) {
      searchInput.dispatchEvent(
        new Event("input")
      );
    }
  } catch (error) {
    console.error(error);

    placesLoaded = true;

    if (
      searchInput &&
      searchInput.value.trim()
    ) {
      renderSearchMessage(
        "地点数据读取失败"
      );
    }
  }
}


/* =========================
   地区展开菜单
========================= */

function setupRegionToggles() {
  const toggleButtons =
    document.querySelectorAll(
      "[data-region-toggle]"
    );

  toggleButtons.forEach((button) => {
    const panelId =
      button.getAttribute("aria-controls");

    const panel =
      document.getElementById(panelId);

    if (!panel) {
      return;
    }

    /*
     * 根据 HTML 中的 aria-expanded
     * 决定初始展开状态。
     */
    const initiallyExpanded =
      button.getAttribute(
        "aria-expanded"
      ) === "true";

    panel.hidden = !initiallyExpanded;

    button.addEventListener("click", () => {
      const currentlyExpanded =
        button.getAttribute(
          "aria-expanded"
        ) === "true";

      button.setAttribute(
        "aria-expanded",
        String(!currentlyExpanded)
      );

      panel.hidden = currentlyExpanded;
    });
  });
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

    if (!placesLoaded) {
      renderSearchMessage(
        "正在读取地点数据……"
      );

      return;
    }

    if (allPlaces.length === 0) {
      renderSearchMessage(
        "没有可搜索的地点数据"
      );

      return;
    }

    const matchedPlaces = allPlaces
      .filter((place) => {
        const chineseName =
          normalizeText(place.name);

        const japaneseName =
          normalizeText(place.nameJa);

        return (
          chineseName.includes(keyword) ||
          japaneseName.includes(keyword)
        );
      })
      .slice(0, SEARCH_RESULT_LIMIT);

    renderSearchResults(matchedPlaces);
  });


  /*
   * 搜索框重新取得焦点时，
   * 重新显示已有关键词的搜索结果。
   */
  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim()) {
      searchInput.dispatchEvent(
        new Event("input")
      );
    }
  });


  /*
   * 按 Escape 关闭搜索结果。
   */
  searchInput.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        hideSearchResults();
        searchInput.blur();
      }
    }
  );


  /*
   * 点击搜索区域外时关闭结果。
   */
  document.addEventListener("click", (event) => {
    const clickedInsideSearch =
      event.target.closest(".site-search");

    if (!clickedInsideSearch) {
      hideSearchResults();
    }
  });
}


/**
 * 显示搜索结果。
 */
function renderSearchResults(places) {
  if (!searchResults) {
    return;
  }

  if (places.length === 0) {
    renderSearchMessage(
      "没有找到相关地点"
    );

    return;
  }

  searchResults.innerHTML = places
    .map(createSearchResultItem)
    .join("");

  searchResults.hidden = false;
}


/**
 * 生成单条搜索结果。
 */
function createSearchResultItem(place) {
  const japaneseNameHtml = place.nameJa
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

      ${japaneseNameHtml}
    </a>
  `;
}


/**
 * 显示搜索提示。
 */
function renderSearchMessage(message) {
  if (!searchResults) {
    return;
  }

  searchResults.innerHTML = `
    <p class="search-empty">
      ${escapeHtml(message)}
    </p>
  `;

  searchResults.hidden = false;
}


/**
 * 隐藏搜索结果。
 */
function hideSearchResults() {
  if (!searchResults) {
    return;
  }

  searchResults.hidden = true;
  searchResults.innerHTML = "";
}


/* =========================
   生成地点详情页链接
========================= */

/**
 * 当前页面位于：
 *
 * places/index.html
 *
 * 生成的地址示例：
 *
 * ./ishikawa/kanazawa/detail.html?id=kanazawa-station
 */
function createPlaceUrl(place) {
  const prefecture =
    encodeURIComponent(place.prefecture);

  const city =
    encodeURIComponent(place.city);

  const id =
    encodeURIComponent(place.id);

  return (
    `./${prefecture}/${city}/` +
    `detail.html?id=${id}`
  );
}


/* =========================
   手机端侧边栏
========================= */

function setupMobileMenu() {
  const menuButton =
    document.querySelector(
      "#mobile-menu-button"
    );

  const sidebar =
    document.querySelector("#sidebar");

  const overlay =
    document.querySelector(
      "#sidebar-overlay"
    );

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

    document.body.style.overflow =
      "hidden";
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
    const sidebarIsOpen =
      sidebar.classList.contains("open");

    if (sidebarIsOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });


  overlay.addEventListener(
    "click",
    closeSidebar
  );


  /*
   * 点击侧边栏导航链接后，
   * 自动关闭手机菜单。
   */
  sidebar
    .querySelectorAll(".sidebar-nav a")
    .forEach((link) => {
      link.addEventListener(
        "click",
        closeSidebar
      );
    });


  /*
   * 页面变回桌面宽度时，
   * 清除手机菜单状态。
   */
  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) {
      closeSidebar();
    }
  });


  /*
   * 手机菜单打开时，
   * 按 Escape 可以关闭。
   */
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        sidebar.classList.contains("open")
      ) {
        closeSidebar();
        menuButton.focus();
      }
    }
  );
}


/* =========================
   数据检查
========================= */

/**
 * places-index.json 的每个地点必须包含：
 *
 * id
 * name
 * prefecture
 * city
 *
 * nameJa 和 updatedAt 可以省略。
 */
function isValidIndexItem(place) {
  return Boolean(
    place &&
    place.id &&
    place.name &&
    place.prefecture &&
    place.city
  );
}


/* =========================
   通用工具
========================= */

/**
 * 搜索时删除首尾空格，
 * 并忽略英文字母大小写。
 */
function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase();
}


/**
 * 防止 JSON 中的文字被浏览器
 * 当作 HTML 标签执行。
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}