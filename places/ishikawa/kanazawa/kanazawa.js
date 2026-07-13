const KANAZAWA_DATA_PATH =
  "../../../data/places/kanazawa.json";

const PLACES_INDEX_PATH =
  "../../../data/places-index.json";

const ITEMS_PER_BATCH = 30;
const SEARCH_RESULT_LIMIT = 10;


/* =========================
   地点数据
========================= */

let kanazawaPlaces = [];
let filteredPlaces = [];
let allIndexPlaces = [];

let visibleCount = ITEMS_PER_BATCH;
let indexPlacesLoaded = false;


/* =========================
   巡礼区域名称
========================= */

/*
 * 如果 kanazawa.json 中包含 guideAreas，
 * 会优先使用 JSON 中的名称。
 *
 * 下面这些名称作为备用。
 */
const guideAreaLabels = {
  "kanazawa-station":
    "金泽站（站内及周边）",

  "musashigatsuji-omicho":
    "武藏辻・近江町市场区域",

  "oyama-kanazawa-castle":
    "尾山神社、金泽城及兼六园周边",

  "korinbo-katamachi":
    "香林坊・片町区域",

  "ishibiki-kodatsuno":
    "石引・小立野区域",

  "nishichaya-teramachi":
    "西茶屋街・寺町区域",

  "owari-hashiba-higashichaya":
    "尾张町・桥场町・东茶屋街区域",

  "utatsuyama":
    "卯辰山区域",

  "kanazawa-other":
    "金泽市内其他"
};

let guideAreaOrder = [];


/* =========================
   获取页面元素
========================= */

const placeList =
  document.querySelector(
    "#kanazawa-place-list"
  );

const resultCount =
  document.querySelector(
    "#result-count"
  );

const loadMoreButton =
  document.querySelector(
    "#load-more-button"
  );


/* 金泽页面筛选器 */

const keywordFilter =
  document.querySelector(
    "#filter-keyword"
  );

const guideAreaFilter =
  document.querySelector(
    "#filter-guide-area"
  );

const categoryFilter =
  document.querySelector(
    "#filter-category"
  );

const sourceFilter =
  document.querySelector(
    "#filter-source"
  );

const characterFilter =
  document.querySelector(
    "#filter-character"
  );

const openTodayFilter =
  document.querySelector(
    "#filter-open-today"
  );

const resetFiltersButton =
  document.querySelector(
    "#reset-filters"
  );


/* 全站搜索 */

const searchInput =
  document.querySelector(
    "#site-search-input"
  );

const searchResults =
  document.querySelector(
    "#search-results"
  );


/* =========================
   页面初始化
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupMobileMenu();
    setupGlobalSearch();
    setupLocalFilters();
    setupLoadMore();

    loadPlaceIndex();
    loadKanazawaPlaces();
  }
);


/* =========================
   读取金泽完整地点数据
========================= */

async function loadKanazawaPlaces() {
  try {
    const response = await fetch(
      KANAZAWA_DATA_PATH
    );

    if (!response.ok) {
      throw new Error(
        `kanazawa.json 读取失败：${response.status}`
      );
    }

    const data = await response.json();

    /*
     * 支持两种格式：
     *
     * [
     *   {...},
     *   {...}
     * ]
     *
     * 或：
     *
     * {
     *   "guideAreas": [...],
     *   "places": [...]
     * }
     */
    kanazawaPlaces = Array.isArray(data)
      ? data
      : data.places;

    if (!Array.isArray(kanazawaPlaces)) {
      throw new Error(
        "kanazawa.json 中没有有效的地点数组。"
      );
    }

    /*
     * 如果 JSON 里写了 guideAreas，
     * 使用里面的名称和顺序。
     */
    if (
      !Array.isArray(data) &&
      Array.isArray(data.guideAreas)
    ) {
      registerGuideAreas(
        data.guideAreas
      );
    }

    kanazawaPlaces =
      kanazawaPlaces.filter(
        isValidKanazawaPlace
      );

    buildFilterOptions();
    applyFilters();
  } catch (error) {
    console.error(error);

    if (resultCount) {
      resultCount.textContent =
        "地点数据读取失败";
    }

    if (placeList) {
      placeList.innerHTML = `
        <p class="status-message error">
          无法读取金泽地点数据。
          请检查 kanazawa.json 的路径和格式。
        </p>
      `;
    }

    if (loadMoreButton) {
      loadMoreButton.hidden = true;
    }
  }
}


/**
 * 读取 JSON 中的巡礼区域名称。
 */
function registerGuideAreas(guideAreas) {
  const sortedAreas = [...guideAreas]
    .filter((area) => {
      return (
        area &&
        area.id &&
        area.name
      );
    })
    .sort((areaA, areaB) => {
      return (
        Number(areaA.order || 0) -
        Number(areaB.order || 0)
      );
    });

  guideAreaOrder = sortedAreas.map(
    (area) => area.id
  );

  sortedAreas.forEach((area) => {
    guideAreaLabels[area.id] =
      area.name;
  });
}


/* =========================
   读取全站搜索索引
========================= */

async function loadPlaceIndex() {
  try {
    const response = await fetch(
      PLACES_INDEX_PATH
    );

    if (!response.ok) {
      throw new Error(
        `places-index.json 读取失败：${response.status}`
      );
    }

    const data = await response.json();

    allIndexPlaces = Array.isArray(data)
      ? data
      : data.places;

    if (!Array.isArray(allIndexPlaces)) {
      throw new Error(
        "places-index.json 中没有有效地点数组。"
      );
    }

    allIndexPlaces =
      allIndexPlaces.filter(
        isValidIndexPlace
      );

    indexPlacesLoaded = true;

    /*
     * 数据加载前用户已经输入内容时，
     * 加载后重新搜索。
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

    indexPlacesLoaded = true;
    allIndexPlaces = [];
  }
}


/* =========================
   生成筛选选项
========================= */

function buildFilterOptions() {
  const guideAreas =
    getUniqueValues(
      kanazawaPlaces.map(
        (place) => place.guideArea
      )
    );

  const categories =
    getUniqueValues(
      kanazawaPlaces.map(
        (place) => place.category
      )
    );

  const sources =
    getUniqueValues(
      kanazawaPlaces.flatMap(
        (place) =>
          toStringArray(place.sources)
      )
    );

  const characters =
    getUniqueValues(
      kanazawaPlaces.flatMap(
        (place) =>
          toStringArray(place.characters)
      )
    );


  /*
   * 巡礼区域按照设定顺序排列。
   */
  guideAreas.sort(
    compareGuideAreas
  );

  categories.sort(
    compareChineseText
  );

  sources.sort(
    compareChineseText
  );

  characters.sort(
    compareChineseText
  );


  fillSelectOptions(
    guideAreaFilter,
    guideAreas,
    "全部区域",
    getGuideAreaLabel
  );

  fillSelectOptions(
    categoryFilter,
    categories,
    "全部类别"
  );

  fillSelectOptions(
    sourceFilter,
    sources,
    "全部出处"
  );

  fillSelectOptions(
    characterFilter,
    characters,
    "全部角色"
  );
}


/**
 * 向 select 写入选项。
 */
function fillSelectOptions(
  selectElement,
  values,
  emptyLabel,
  labelFunction = null
) {
  if (!selectElement) {
    return;
  }

  selectElement.innerHTML = "";

  const emptyOption =
    document.createElement("option");

  emptyOption.value = "";
  emptyOption.textContent =
    emptyLabel;

  selectElement.appendChild(
    emptyOption
  );


  values.forEach((value) => {
    const option =
      document.createElement("option");

    option.value = value;

    option.textContent =
      labelFunction
        ? labelFunction(value)
        : value;

    selectElement.appendChild(
      option
    );
  });
}


/* =========================
   筛选事件
========================= */

function setupLocalFilters() {
  const selectFilters = [
    guideAreaFilter,
    categoryFilter,
    sourceFilter,
    characterFilter,
    openTodayFilter
  ];

  selectFilters.forEach((element) => {
    if (!element) {
      return;
    }

    element.addEventListener(
      "change",
      applyFilters
    );
  });


  if (keywordFilter) {
    keywordFilter.addEventListener(
      "input",
      debounce(
        applyFilters,
        120
      )
    );
  }


  if (resetFiltersButton) {
    resetFiltersButton.addEventListener(
      "click",
      resetFilters
    );
  }
}


/**
 * 执行全部筛选。
 */
function applyFilters() {
  const keyword = normalizeText(
    keywordFilter
      ? keywordFilter.value
      : ""
  );

  const selectedGuideArea =
    guideAreaFilter
      ? guideAreaFilter.value
      : "";

  const selectedCategory =
    categoryFilter
      ? categoryFilter.value
      : "";

  const selectedSource =
    sourceFilter
      ? sourceFilter.value
      : "";

  const selectedCharacter =
    characterFilter
      ? characterFilter.value
      : "";

  const requireOpenToday =
    openTodayFilter
      ? openTodayFilter.checked
      : false;


  filteredPlaces =
    kanazawaPlaces.filter((place) => {
      const keywordMatched =
        !keyword ||
        doesPlaceMatchKeyword(
          place,
          keyword
        );

      const guideAreaMatched =
        !selectedGuideArea ||
        place.guideArea ===
          selectedGuideArea;

      const categoryMatched =
        !selectedCategory ||
        place.category ===
          selectedCategory;

      const sourceMatched =
        !selectedSource ||
        toStringArray(
          place.sources
        ).includes(
          selectedSource
        );

      const characterMatched =
        !selectedCharacter ||
        toStringArray(
          place.characters
        ).includes(
          selectedCharacter
        );

      const openTodayMatched =
        !requireOpenToday ||
        isOpenToday(place);

      return (
        keywordMatched &&
        guideAreaMatched &&
        categoryMatched &&
        sourceMatched &&
        characterMatched &&
        openTodayMatched
      );
    });


  visibleCount =
    ITEMS_PER_BATCH;

  renderPlaces();
}


/**
 * 清除全部筛选。
 */
function resetFilters() {
  if (keywordFilter) {
    keywordFilter.value = "";
  }

  if (guideAreaFilter) {
    guideAreaFilter.value = "";
  }

  if (categoryFilter) {
    categoryFilter.value = "";
  }

  if (sourceFilter) {
    sourceFilter.value = "";
  }

  if (characterFilter) {
    characterFilter.value = "";
  }

  if (openTodayFilter) {
    openTodayFilter.checked = false;
  }

  applyFilters();
}


/* =========================
   页面内关键词匹配
========================= */

function doesPlaceMatchKeyword(
  place,
  keyword
) {
  const searchableValues = [
    place.name,
    place.nameJa,
    place.address,
    place.introduction,
    ...toStringArray(
      place.sources
    ),
    ...toStringArray(
      place.characters
    ),
    ...toStringArray(
      place.other
    )
  ];

  return searchableValues.some(
    (value) => {
      return normalizeText(
        value
      ).includes(keyword);
    }
  );
}


/* =========================
   渲染地点列表
========================= */

function renderPlaces() {
  if (!placeList || !resultCount) {
    return;
  }

  const totalCount =
    filteredPlaces.length;

  resultCount.textContent =
    `共 ${totalCount} 个地点`;


  if (totalCount === 0) {
    placeList.innerHTML = `
      <p class="status-message">
        没有符合当前筛选条件的地点。
      </p>
    `;

    if (loadMoreButton) {
      loadMoreButton.hidden = true;
    }

    return;
  }


  const visiblePlaces =
    filteredPlaces.slice(
      0,
      visibleCount
    );

  placeList.innerHTML =
    visiblePlaces
      .map(createPlaceCard)
      .join("");


  if (loadMoreButton) {
    loadMoreButton.hidden =
      visibleCount >= totalCount;
  }
}


/**
 * 生成一个地点卡片。
 */
function createPlaceCard(place) {
  const guideAreaTag =
    place.guideArea
      ? `
        <span class="place-tag">
          ${escapeHtml(
            getGuideAreaLabel(
              place.guideArea
            )
          )}
        </span>
      `
      : "";

  const categoryTag =
    place.category
      ? `
        <span class="place-tag category">
          ${escapeHtml(
            place.category
          )}
        </span>
      `
      : "";

  const japaneseName =
    place.nameJa
      ? `
        <p class="place-card-name-ja">
          ${escapeHtml(
            place.nameJa
          )}
        </p>
      `
      : "";

  const sourceRow =
    createInformationRow(
      "出处",
      toStringArray(
        place.sources
      ).join("、")
    );

  const characterRow =
    createInformationRow(
      "角色",
      toStringArray(
        place.characters
      ).join("、")
    );

  const detailUrl =
    createDetailUrl(place);

  return `
    <article class="kanazawa-place-card">
      <div class="place-card-tags">
        ${guideAreaTag}
        ${categoryTag}
      </div>

      <h2 class="place-card-title">
        <a href="${detailUrl}">
          ${escapeHtml(place.name)}
        </a>
      </h2>

      ${japaneseName}

      <div class="place-card-information">
        ${sourceRow}
        ${characterRow}
      </div>

      <div class="place-card-footer">
        <a
          class="place-detail-link"
          href="${detailUrl}"
        >
          查看详细信息
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  `;
}


/**
 * 生成出处或角色信息。
 */
function createInformationRow(
  label,
  value
) {
  if (!value) {
    return "";
  }

  return `
    <div class="place-information-row">
      <span class="place-information-label">
        ${escapeHtml(label)}
      </span>

      <span class="place-information-value">
        ${escapeHtml(value)}
      </span>
    </div>
  `;
}


/**
 * 生成地点详情页链接。
 */
function createDetailUrl(place) {
  return (
    "./detail.html?id=" +
    encodeURIComponent(place.id)
  );
}


/* =========================
   加载更多
========================= */

function setupLoadMore() {
  if (!loadMoreButton) {
    return;
  }

  loadMoreButton.addEventListener(
    "click",
    () => {
      visibleCount +=
        ITEMS_PER_BATCH;

      renderPlaces();
    }
  );
}


/* =========================
   今日营业判断
========================= */

/*
 * closedDays 可以写成：
 *
 * ["tuesday"]
 *
 * ["周二"]
 *
 * ["星期二"]
 *
 * ["火曜日"]
 *
 * 没有 closedDays 时，
 * 会视为今天可以显示。
 */
function isOpenToday(place) {
  const closedDays =
    toStringArray(
      place.closedDays
    );

  if (closedDays.length === 0) {
    return true;
  }

  const normalizedClosedDays =
    closedDays.map(normalizeText);


  const alwaysOpenWords = [
    "全年无休",
    "年中无休",
    "年中無休",
    "无休",
    "無休"
  ];

  const isAlwaysOpen =
    normalizedClosedDays.some(
      (value) => {
        return alwaysOpenWords.some(
          (word) =>
            value.includes(
              normalizeText(word)
            )
        );
      }
    );

  if (isAlwaysOpen) {
    return true;
  }


  const todayIndex =
    new Date().getDay();

  const weekdayAliases = [
    [
      "sunday",
      "sun",
      "星期日",
      "星期天",
      "周日",
      "周天",
      "日曜日",
      "日曜"
    ],
    [
      "monday",
      "mon",
      "星期一",
      "周一",
      "月曜日",
      "月曜"
    ],
    [
      "tuesday",
      "tue",
      "星期二",
      "周二",
      "火曜日",
      "火曜"
    ],
    [
      "wednesday",
      "wed",
      "星期三",
      "周三",
      "水曜日",
      "水曜"
    ],
    [
      "thursday",
      "thu",
      "星期四",
      "周四",
      "木曜日",
      "木曜"
    ],
    [
      "friday",
      "fri",
      "星期五",
      "周五",
      "金曜日",
      "金曜"
    ],
    [
      "saturday",
      "sat",
      "星期六",
      "周六",
      "土曜日",
      "土曜"
    ]
  ];


  const todayAliases =
    weekdayAliases[todayIndex]
      .map(normalizeText);


  const closedToday =
    normalizedClosedDays.some(
      (closedDay) => {
        return todayAliases.some(
          (alias) => {
            return (
              closedDay === alias ||
              closedDay.includes(alias)
            );
          }
        );
      }
    );

  return !closedToday;
}


/* =========================
   全站侧边栏搜索
========================= */

function setupGlobalSearch() {
  if (!searchInput || !searchResults) {
    return;
  }


  searchInput.addEventListener(
    "input",
    () => {
      const keyword = normalizeText(
        searchInput.value
      );

      if (!keyword) {
        hideSearchResults();
        return;
      }

      if (!indexPlacesLoaded) {
        renderSearchMessage(
          "正在读取地点数据……"
        );

        return;
      }

      if (
        allIndexPlaces.length === 0
      ) {
        renderSearchMessage(
          "没有可搜索的地点数据"
        );

        return;
      }


      const matchedPlaces =
        allIndexPlaces
          .filter((place) => {
            const chineseName =
              normalizeText(
                place.name
              );

            const japaneseName =
              normalizeText(
                place.nameJa
              );

            return (
              chineseName.includes(
                keyword
              ) ||
              japaneseName.includes(
                keyword
              )
            );
          })
          .slice(
            0,
            SEARCH_RESULT_LIMIT
          );


      renderGlobalSearchResults(
        matchedPlaces
      );
    }
  );


  searchInput.addEventListener(
    "focus",
    () => {
      if (
        searchInput.value.trim()
      ) {
        searchInput.dispatchEvent(
          new Event("input")
        );
      }
    }
  );


  searchInput.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        hideSearchResults();
        searchInput.blur();
      }
    }
  );


  document.addEventListener(
    "click",
    (event) => {
      const clickedInsideSearch =
        event.target.closest(
          ".site-search"
        );

      if (!clickedInsideSearch) {
        hideSearchResults();
      }
    }
  );
}


/**
 * 显示全站搜索结果。
 */
function renderGlobalSearchResults(
  places
) {
  if (!searchResults) {
    return;
  }

  if (places.length === 0) {
    renderSearchMessage(
      "没有找到相关地点"
    );

    return;
  }

  searchResults.innerHTML =
    places
      .map(
        createGlobalSearchItem
      )
      .join("");

  searchResults.hidden = false;
}


/**
 * 生成一条全站搜索结果。
 */
function createGlobalSearchItem(place) {
  const japaneseName =
    place.nameJa
      ? `
        <span class="search-result-ja">
          ${escapeHtml(
            place.nameJa
          )}
        </span>
      `
      : "";

  return `
    <a
      class="search-result-item"
      href="${createGlobalPlaceUrl(place)}"
    >
      <span class="search-result-name">
        ${escapeHtml(place.name)}
      </span>

      ${japaneseName}
    </a>
  `;
}


/**
 * 从当前金泽页面生成全站地点链接。
 */
function createGlobalPlaceUrl(place) {
  const prefecture =
    encodeURIComponent(
      place.prefecture
    );

  const city =
    encodeURIComponent(
      place.city
    );

  const id =
    encodeURIComponent(
      place.id
    );

  return (
    "../../../places/" +
    `${prefecture}/${city}/` +
    `detail.html?id=${id}`
  );
}


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


function hideSearchResults() {
  if (!searchResults) {
    return;
  }

  searchResults.hidden = true;
  searchResults.innerHTML = "";
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
    document.querySelector(
      "#sidebar"
    );

  const overlay =
    document.querySelector(
      "#sidebar-overlay"
    );

  if (
    !menuButton ||
    !sidebar ||
    !overlay
  ) {
    return;
  }


  function openSidebar() {
    sidebar.classList.add(
      "open"
    );

    overlay.hidden = false;

    menuButton.setAttribute(
      "aria-expanded",
      "true"
    );

    document.body.style.overflow =
      "hidden";
  }


  function closeSidebar() {
    sidebar.classList.remove(
      "open"
    );

    overlay.hidden = true;

    menuButton.setAttribute(
      "aria-expanded",
      "false"
    );

    document.body.style.overflow =
      "";
  }


  menuButton.addEventListener(
    "click",
    () => {
      const isOpen =
        sidebar.classList.contains(
          "open"
        );

      if (isOpen) {
        closeSidebar();
      } else {
        openSidebar();
      }
    }
  );


  overlay.addEventListener(
    "click",
    closeSidebar
  );


  sidebar
    .querySelectorAll(
      ".sidebar-nav a"
    )
    .forEach((link) => {
      link.addEventListener(
        "click",
        closeSidebar
      );
    });


  window.addEventListener(
    "resize",
    () => {
      if (
        window.innerWidth > 760
      ) {
        closeSidebar();
      }
    }
  );


  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        sidebar.classList.contains(
          "open"
        )
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

function isValidKanazawaPlace(place) {
  return Boolean(
    place &&
    place.id &&
    place.name
  );
}


function isValidIndexPlace(place) {
  return Boolean(
    place &&
    place.id &&
    place.name &&
    place.prefecture &&
    place.city
  );
}


/* =========================
   巡礼区域工具
========================= */

function getGuideAreaLabel(areaId) {
  return (
    guideAreaLabels[areaId] ||
    areaId ||
    "未分类区域"
  );
}


function compareGuideAreas(
  areaA,
  areaB
) {
  const indexA =
    guideAreaOrder.indexOf(areaA);

  const indexB =
    guideAreaOrder.indexOf(areaB);

  if (
    indexA !== -1 &&
    indexB !== -1
  ) {
    return indexA - indexB;
  }

  if (indexA !== -1) {
    return -1;
  }

  if (indexB !== -1) {
    return 1;
  }

  return compareChineseText(
    getGuideAreaLabel(areaA),
    getGuideAreaLabel(areaB)
  );
}


/* =========================
   通用工具
========================= */

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => {
        return (
          item !== null &&
          item !== undefined &&
          String(item).trim() !== ""
        );
      })
      .map((item) =>
        String(item)
      );
  }

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return [];
  }

  return [
    String(value)
  ];
}


function getUniqueValues(values) {
  return [
    ...new Set(
      values.filter((value) => {
        return (
          value !== null &&
          value !== undefined &&
          String(value).trim() !== ""
        );
      })
    )
  ];
}


function compareChineseText(
  valueA,
  valueB
) {
  return String(valueA).localeCompare(
    String(valueB),
    "zh-CN"
  );
}


function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase();
}


function debounce(
  callback,
  delay
) {
  let timerId;

  return (...argumentsList) => {
    clearTimeout(timerId);

    timerId = setTimeout(
      () => {
        callback(
          ...argumentsList
        );
      },
      delay
    );
  };
}


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}