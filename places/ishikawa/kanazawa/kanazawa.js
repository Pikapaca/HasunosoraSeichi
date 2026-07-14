const KANAZAWA_DATA_PATH =
  "../../../data/places/kanazawa.json";

const PLACES_INDEX_PATH =
  "../../../data/places-index.json";

const ITEMS_PER_BATCH = 30;
const SEARCH_RESULT_LIMIT = 10;


/* =========================
   数据
========================= */

let kanazawaPlaces = [];
let filteredPlaces = [];
let allIndexPlaces = [];

let visibleCount = ITEMS_PER_BATCH;
let indexPlacesLoaded = false;


/* =========================
   巡礼区域名称
========================= */

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


/* 页面内筛选器 */

const keywordFilter =
  document.querySelector(
    "#filter-keyword"
  );

const guideAreaFilter =
  document.querySelector(
    "#filter-guide-area"
  );

/*
 * 巡礼区域自定义单选下拉框。
 */
const guideAreaSingleSelect =
  document.querySelector(
    "#filter-guide-area-custom"
  );

const guideAreaSingleButton =
  document.querySelector(
    "#filter-guide-area-button"
  );

const guideAreaSingleText =
  document.querySelector(
    "#filter-guide-area-text"
  );

const guideAreaSinglePanel =
  document.querySelector(
    "#filter-guide-area-panel"
  );

const guideAreaSingleOptions =
  document.querySelector(
    "#filter-guide-area-options"
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
   初始化
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupMobileMenu();
    setupGlobalSearch();
    setupLocalFilters();
    setupGuideAreaSingleSelect();
    setupLoadMore();

    loadPlaceIndex();
    loadKanazawaPlaces();
  }
);

/* =========================
   读取金泽地点数据
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

    const data =
      await response.json();

    /*
     * 支持两种 JSON 格式：
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
    kanazawaPlaces =
      Array.isArray(data)
        ? data
        : data.places;

    if (
      !Array.isArray(
        kanazawaPlaces
      )
    ) {
      throw new Error(
        "kanazawa.json 中没有有效的地点数组。"
      );
    }

    if (
      !Array.isArray(data) &&
      Array.isArray(
        data.guideAreas
      )
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
    console.error(
      "金泽页面实际错误：",
      error
    );

    if (resultCount) {
      resultCount.textContent =
        `错误：${error.name} - ${error.message}`;
    }

    if (placeList) {
      placeList.innerHTML = `
        <p class="status-message error">
          ${escapeHtml(error.name)}：
          ${escapeHtml(error.message)}
        </p>
      `;
    }

    if (loadMoreButton) {
      loadMoreButton.hidden = true;
    }
  }
}


/* =========================
   巡礼区域注册
========================= */

function registerGuideAreas(
  guideAreas
) {
  const sortedAreas =
    [...guideAreas]
      .filter((area) => {
        return (
          area &&
          area.id &&
          area.name
        );
      })
      .sort(
        (areaA, areaB) => {
          return (
            Number(
              areaA.order || 0
            ) -
            Number(
              areaB.order || 0
            )
          );
        }
      );

  guideAreaOrder =
    sortedAreas.map(
      (area) => area.id
    );

  sortedAreas.forEach(
    (area) => {
      guideAreaLabels[
        area.id
      ] = area.name;
    }
  );
}


/* =========================
   读取全站地点索引
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

    const data =
      await response.json();

    allIndexPlaces =
      Array.isArray(data)
        ? data
        : data.places;

    if (
      !Array.isArray(
        allIndexPlaces
      )
    ) {
      throw new Error(
        "places-index.json 中没有有效地点数组。"
      );
    }

    allIndexPlaces =
      allIndexPlaces.filter(
        isValidIndexPlace
      );

    indexPlacesLoaded = true;

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

    allIndexPlaces = [];
    indexPlacesLoaded = true;
  }
}


/* =========================
   生成筛选选项
========================= */

function buildFilterOptions() {
  const guideAreas =
    getUniqueValues(
      kanazawaPlaces.map(
        (place) =>
          place.guideArea
      )
    );

  /*
   * category 同时支持：
   *
   * "category": "车站"
   *
   * 以及：
   *
   * "category": ["车站", "交通设施"]
   */
  const categories =
    getUniqueValues(
      kanazawaPlaces.flatMap(
        (place) =>
          toStringArray(
            place.category
          )
      )
    );

  const sources =
    getUniqueValues(
      kanazawaPlaces.flatMap(
        (place) =>
          toStringArray(
            place.sources
          )
      )
    );

  const characters =
    getUniqueValues(
      kanazawaPlaces.flatMap(
        (place) =>
          toStringArray(
            place.characters
          )
      )
    );

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


  /*
   * 巡礼区域继续使用单选。
   */
  fillSelectOptions(
    guideAreaFilter,
    guideAreas,
    "全部区域",
    getGuideAreaLabel
  );

buildGuideAreaSingleSelectOptions();

  /*
   * 以下三项改为复选框多选。
   */
  fillCheckboxOptions(
    categoryFilter,
    categories,
    "category"
  );

  fillCheckboxOptions(
    sourceFilter,
    sources,
    "source"
  );

  fillCheckboxOptions(
    characterFilter,
    characters,
    "character"
  );
}


/**
 * 生成单选下拉菜单选项。
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
    document.createElement(
      "option"
    );

  emptyOption.value = "";

  emptyOption.textContent =
    emptyLabel;

  selectElement.appendChild(
    emptyOption
  );

  values.forEach((value) => {
    const option =
      document.createElement(
        "option"
      );

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
   巡礼区域自定义单选下拉框
========================= */

/**
 * 设置巡礼区域单选下拉框的打开、关闭事件。
 */
function setupGuideAreaSingleSelect() {
  if (
    !guideAreaFilter ||
    !guideAreaSingleSelect ||
    !guideAreaSingleButton ||
    !guideAreaSinglePanel
  ) {
    return;
  }


  guideAreaSingleButton.addEventListener(
    "click",
    () => {
      const isOpen =
        guideAreaSingleSelect.classList
          .contains("open");

      if (isOpen) {
        closeGuideAreaSingleSelect();
      } else {
        openGuideAreaSingleSelect();
      }
    }
  );


  /*
   * 原生 select 的值发生变化时，
   * 同步按钮文字和选中状态。
   */
  guideAreaFilter.addEventListener(
    "change",
    syncGuideAreaSingleSelect
  );


  /*
   * 点击下拉框外部时关闭。
   */
  document.addEventListener(
    "click",
    (event) => {
      if (
        !guideAreaSingleSelect.contains(
          event.target
        )
      ) {
        closeGuideAreaSingleSelect();
      }
    }
  );


  /*
   * 按 Escape 时关闭。
   */
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        closeGuideAreaSingleSelect();
      }
    }
  );
}


/**
 * 根据原生 select 中的 option，
 * 生成自定义单选选项。
 */
function buildGuideAreaSingleSelectOptions() {
  if (
    !guideAreaFilter ||
    !guideAreaSingleOptions
  ) {
    return;
  }

  guideAreaSingleOptions.innerHTML = "";

  Array.from(
    guideAreaFilter.options
  ).forEach((option) => {
    const optionButton =
      document.createElement("button");

    optionButton.type = "button";

    optionButton.className =
      "single-select-option";

    optionButton.dataset.value =
      option.value;

    optionButton.textContent =
      option.textContent;

    optionButton.setAttribute(
      "role",
      "option"
    );


    optionButton.addEventListener(
      "click",
      () => {
        /*
         * 将自定义选项的值同步给
         * 原来的 select。
         */
        guideAreaFilter.value =
          option.value;

        /*
         * 触发现有的 change 事件，
         * 因此原来的 applyFilters()
         * 会继续正常执行。
         */
        guideAreaFilter.dispatchEvent(
          new Event(
            "change",
            {
              bubbles: true
            }
          )
        );

        closeGuideAreaSingleSelect();

        guideAreaSingleButton.focus();
      }
    );


    guideAreaSingleOptions.appendChild(
      optionButton
    );
  });


  syncGuideAreaSingleSelect();
}


/**
 * 根据当前选中的区域，
 * 更新按钮文字和选项样式。
 */
function syncGuideAreaSingleSelect() {
  if (
    !guideAreaFilter ||
    !guideAreaSingleSelect ||
    !guideAreaSingleText ||
    !guideAreaSingleOptions
  ) {
    return;
  }

  const selectedOption =
    guideAreaFilter.options[
      guideAreaFilter.selectedIndex
    ];

  guideAreaSingleText.textContent =
    selectedOption
      ? selectedOption.textContent
      : "全部区域";


  /*
   * 选择“全部区域”时不使用强调文字；
   * 选择具体区域时使用主题色。
   */
  guideAreaSingleSelect.classList.toggle(
    "has-selection",
    Boolean(guideAreaFilter.value)
  );


  guideAreaSingleOptions
    .querySelectorAll(
      ".single-select-option"
    )
    .forEach((optionButton) => {
      const isSelected =
        optionButton.dataset.value ===
        guideAreaFilter.value;

      optionButton.classList.toggle(
        "is-selected",
        isSelected
      );

      optionButton.setAttribute(
        "aria-selected",
        String(isSelected)
      );
    });
}


/**
 * 打开巡礼区域单选框。
 */
function openGuideAreaSingleSelect() {
  if (
    !guideAreaSingleSelect ||
    !guideAreaSingleButton ||
    !guideAreaSinglePanel
  ) {
    return;
  }

  guideAreaSingleSelect.classList.add(
    "open"
  );

  guideAreaSinglePanel.hidden = false;

  guideAreaSingleButton.setAttribute(
    "aria-expanded",
    "true"
  );
}


/**
 * 关闭巡礼区域单选框。
 */
function closeGuideAreaSingleSelect() {
  if (
    !guideAreaSingleSelect ||
    !guideAreaSingleButton ||
    !guideAreaSinglePanel
  ) {
    return;
  }

  guideAreaSingleSelect.classList.remove(
    "open"
  );

  guideAreaSinglePanel.hidden = true;

  guideAreaSingleButton.setAttribute(
    "aria-expanded",
    "false"
  );
}

/**
 * 向下拉多选框生成复选项。
 */
function fillCheckboxOptions(
  container,
  values,
  groupName
) {
  if (!container) {
    return;
  }

  const optionsContainer =
    container.querySelector(
      "[data-multi-options]"
    );

  if (!optionsContainer) {
    return;
  }

  optionsContainer.innerHTML = "";

  if (values.length === 0) {
    const emptyMessage =
      document.createElement("p");

    emptyMessage.className =
      "multi-filter-empty";

    emptyMessage.textContent =
      "暂无选项";

    optionsContainer.appendChild(
      emptyMessage
    );

    updateMultiSelectLabel(
      container
    );

    return;
  }

  values.forEach(
    (value, index) => {
      const inputId =
        `filter-${groupName}-option-${index}`;

      const label =
        document.createElement(
          "label"
        );

      label.className =
        "multi-filter-option";

      label.htmlFor =
        inputId;

      const input =
        document.createElement(
          "input"
        );

      input.type =
        "checkbox";

      input.id =
        inputId;

      input.value =
        value;

      const checkboxMark =
        document.createElement(
          "span"
        );

      checkboxMark.className =
        "multi-filter-checkbox";

      checkboxMark.setAttribute(
        "aria-hidden",
        "true"
      );

      const text =
        document.createElement(
          "span"
        );

      text.className =
        "multi-filter-option-text";

      text.textContent =
        value;

      label.append(
        input,
        checkboxMark,
        text
      );

      optionsContainer.appendChild(
        label
      );
    }
  );

  updateMultiSelectLabel(
    container
  );
}

/* =========================
   筛选事件
========================= */

function setupLocalFilters() {
  /*
   * 巡礼区域。
   */
  if (guideAreaFilter) {
    guideAreaFilter.addEventListener(
      "change",
      applyFilters
    );
  }


  /*
   * 今日营业。
   */
  if (openTodayFilter) {
    openTodayFilter.addEventListener(
      "change",
      applyFilters
    );
  }


  /*
   * 下拉多选筛选器。
   */
  const multipleFilters = [
    categoryFilter,
    sourceFilter,
    characterFilter
  ];

  multipleFilters.forEach(
    (container) => {
      if (!container) {
        return;
      }

      const button =
        container.querySelector(
          ".multi-select-button"
        );

      const panel =
        container.querySelector(
          ".multi-select-panel"
        );

      if (!button || !panel) {
        return;
      }


      /*
       * 点击按钮展开或收起。
       */
      button.addEventListener(
        "click",
        () => {
          const isOpen =
            !panel.hidden;

          closeAllMultiSelects(
            container
          );

          panel.hidden =
            isOpen;

          button.setAttribute(
            "aria-expanded",
            String(!isOpen)
          );

          container.classList.toggle(
            "open",
            !isOpen
          );
        }
      );


      /*
       * 勾选项目后更新文字并筛选。
       */
      container.addEventListener(
        "change",
        (event) => {
          if (
            !event.target.matches(
              'input[type="checkbox"]'
            )
          ) {
            return;
          }

          updateMultiSelectLabel(
            container
          );

          applyFilters();
        }
      );
    }
  );


  /*
   * 点击下拉框外部时收起。
   */
  document.addEventListener(
    "click",
    (event) => {
      if (
        !event.target.closest(
          ".multi-select"
        )
      ) {
        closeAllMultiSelects();
      }
    }
  );


  /*
   * 按 Escape 收起。
   */
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        closeAllMultiSelects();
      }
    }
  );


  /*
   * 关键词筛选。
   */
  if (keywordFilter) {
    keywordFilter.addEventListener(
      "input",
      debounce(
        applyFilters,
        120
      )
    );
  }


  /*
   * 清除全部筛选。
   */
  if (resetFiltersButton) {
    resetFiltersButton.addEventListener(
      "click",
      resetFilters
    );
  }
}

/**
 * 关闭全部下拉多选框。
 *
 * exceptContainer 用于保留当前
 * 正在操作的下拉框。
 */
function closeAllMultiSelects(
  exceptContainer = null
) {
  document
    .querySelectorAll(
      ".multi-select"
    )
    .forEach((container) => {
      if (
        container ===
        exceptContainer
      ) {
        return;
      }

      const button =
        container.querySelector(
          ".multi-select-button"
        );

      const panel =
        container.querySelector(
          ".multi-select-panel"
        );

      if (panel) {
        panel.hidden = true;
      }

      if (button) {
        button.setAttribute(
          "aria-expanded",
          "false"
        );
      }

      container.classList.remove(
        "open"
      );
    });
}


/**
 * 更新下拉框按钮文字。
 */
function updateMultiSelectLabel(
  container
) {
  if (!container) {
    return;
  }

  const textElement =
    container.querySelector(
      ".multi-select-text"
    );

  if (!textElement) {
    return;
  }

  const placeholder =
    container.dataset.placeholder ||
    "全部";

  const selectedValues =
    getCheckedValues(
      container
    );

  if (
    selectedValues.length === 0
  ) {
    textElement.textContent =
      placeholder;

    container.classList.remove(
      "has-selection"
    );

    return;
  }

  container.classList.add(
    "has-selection"
  );

  if (
    selectedValues.length === 1
  ) {
    textElement.textContent =
      selectedValues[0];

    return;
  }

  if (
    selectedValues.length === 2
  ) {
    textElement.textContent =
      selectedValues.join("、");

    return;
  }

  textElement.textContent =
    `已选择 ${selectedValues.length} 项`;
}

/* =========================
   执行筛选
========================= */

/*
 * 筛选规则：
 *
 * 同一组内：
 * 选中多个选项时，满足任意一个即可。
 *
 * 不同组之间：
 * 必须同时满足。
 *
 * 例如：
 *
 * 类别选择“车站”和“餐饮”，
 * 角色选择“花帆”和“梢”。
 *
 * 则地点需要：
 *
 * 类别属于车站或餐饮，
 * 并且角色包含花帆或梢。
 */
function applyFilters() {
  const keyword =
    normalizeText(
      keywordFilter
        ? keywordFilter.value
        : ""
    );

  const selectedGuideArea =
    guideAreaFilter
      ? guideAreaFilter.value
      : "";

  const selectedCategories =
    getCheckedValues(
      categoryFilter
    );

  const selectedSources =
    getCheckedValues(
      sourceFilter
    );

  const selectedCharacters =
    getCheckedValues(
      characterFilter
    );

  const requireOpenToday =
    openTodayFilter
      ? openTodayFilter.checked
      : false;


  filteredPlaces =
    kanazawaPlaces.filter(
      (place) => {
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
          matchesAnySelectedValue(
            place.category,
            selectedCategories
          );

        const sourceMatched =
          matchesAnySelectedValue(
            place.sources,
            selectedSources
          );

        const characterMatched =
          matchesAnySelectedValue(
            place.characters,
            selectedCharacters
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
      }
    );

  visibleCount =
    ITEMS_PER_BATCH;

  renderPlaces();
}


/* =========================
   清除筛选
========================= */

function resetFilters() {
  if (keywordFilter) {
    keywordFilter.value = "";
  }

if (guideAreaFilter) {
  guideAreaFilter.value = "";

  syncGuideAreaSingleSelect();
}

  clearCheckedValues(
    categoryFilter
  );

  clearCheckedValues(
    sourceFilter
  );

  clearCheckedValues(
    characterFilter
  );

  if (openTodayFilter) {
    openTodayFilter.checked =
      false;
  }

  applyFilters();
}


/* =========================
   关键词匹配
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
      place.category
    ),

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
  if (
    !placeList ||
    !resultCount
  ) {
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
      .map(
        createPlaceCard
      )
      .join("");


  if (loadMoreButton) {
    loadMoreButton.hidden =
      visibleCount >=
      totalCount;
  }
}


/* =========================
   生成地点卡片
========================= */

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


  /*
   * category 支持字符串或数组。
   */
  const categoryTags =
    toStringArray(
      place.category
    )
      .map((category) => {
        return `
          <span class="place-tag category">
            ${escapeHtml(category)}
          </span>
        `;
      })
      .join("");


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
        ${categoryTags}
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
          <span aria-hidden="true">
            →
          </span>
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
 * 生成详情页链接。
 */
function createDetailUrl(place) {
  return (
    "./detail.html?id=" +
    encodeURIComponent(
      place.id
    )
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

function isOpenToday(place) {
  const closedDays =
    toStringArray(
      place.closedDays
    );

  /*
   * 没写 closedDays 时，
   * 默认允许显示。
   */
  if (closedDays.length === 0) {
    return true;
  }

  const normalizedClosedDays =
    closedDays.map(
      normalizeText
    );


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
          (word) => {
            return value.includes(
              normalizeText(word)
            );
          }
        );
      }
    );


  if (isAlwaysOpen) {
    return true;
  }


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


  const todayIndex =
    new Date().getDay();

  const todayAliases =
    weekdayAliases[
      todayIndex
    ].map(
      normalizeText
    );


  const closedToday =
    normalizedClosedDays.some(
      (closedDay) => {
        return todayAliases.some(
          (alias) => {
            return (
              closedDay === alias ||
              closedDay.includes(
                alias
              )
            );
          }
        );
      }
    );

  return !closedToday;
}


/* =========================
   全站搜索
========================= */

function setupGlobalSearch() {
  if (
    !searchInput ||
    !searchResults
  ) {
    return;
  }


  searchInput.addEventListener(
    "input",
    () => {
      const keyword =
        normalizeText(
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

  searchResults.hidden =
    false;
}


/**
 * 生成全站搜索结果。
 */
function createGlobalSearchItem(
  place
) {
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
 * 从金泽页面生成其他地点详情页链接。
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


function renderSearchMessage(
  message
) {
  if (!searchResults) {
    return;
  }

  searchResults.innerHTML = `
    <p class="search-empty">
      ${escapeHtml(message)}
    </p>
  `;

  searchResults.hidden =
    false;
}


function hideSearchResults() {
  if (!searchResults) {
    return;
  }

  searchResults.hidden =
    true;

  searchResults.innerHTML =
    "";
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

    overlay.hidden =
      false;

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

    overlay.hidden =
      true;

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
      if (
        sidebar.classList.contains(
          "open"
        )
      ) {
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
   数据验证
========================= */

function isValidKanazawaPlace(
  place
) {
  return Boolean(
    place &&
    place.id &&
    place.name
  );
}


function isValidIndexPlace(
  place
) {
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

function getGuideAreaLabel(
  areaId
) {
  return (
    guideAreaLabels[
      areaId
    ] ||
    areaId ||
    "未分类区域"
  );
}


function compareGuideAreas(
  areaA,
  areaB
) {
  const indexA =
    guideAreaOrder.indexOf(
      areaA
    );

  const indexB =
    guideAreaOrder.indexOf(
      areaB
    );

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
   多选筛选工具
========================= */

/**
 * 获取复选框组中已选中的值。
 */
function getCheckedValues(
  container
) {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll(
      'input[type="checkbox"]:checked'
    )
  ).map((input) => {
    return input.value;
  });
}


/**
 * 清除复选框组的选择。
 */
function clearCheckedValues(
  container
) {
  if (!container) {
    return;
  }

  container
    .querySelectorAll(
      'input[type="checkbox"]'
    )
    .forEach((input) => {
      input.checked = false;
    });
    updateMultiSelectLabel(
    container
  );  

}


/**
 * 没有选择时代表全部。
 *
 * 有选择时，地点只要命中
 * 任意一个已选值即可。
 */
function matchesAnySelectedValue(
  placeValue,
  selectedValues
) {
  if (
    selectedValues.length === 0
  ) {
    return true;
  }

  return toStringArray(
    placeValue
  ).some((value) => {
    return selectedValues.includes(
      value
    );
  });
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
      .map((item) => {
        return String(item);
      });
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
  return String(
    valueA
  ).localeCompare(
    String(valueB),
    "zh-CN"
  );
}


function normalizeText(value) {
  return String(
    value || ""
  )
    .trim()
    .toLocaleLowerCase();
}


function debounce(
  callback,
  delay
) {
  let timerId;

  return (...argumentsList) => {
    clearTimeout(
      timerId
    );

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
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}