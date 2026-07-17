const KANAZAWA_DATA_PATH =
  "../../../data/places/kanazawa.json";

const PLACES_INDEX_PATH =
  "../../../data/places-index.json";

const SEARCH_RESULT_LIMIT = 10;


/* =========================
   数据
========================= */

let allIndexPlaces = [];
let indexPlacesLoaded = false;

const guideAreaLabels = {
  "kanazawa-station":
    "金泽站（站内及周边）",

  "musashigatsuji-omicho":
    "武藏辻・近江町市场区域",

  "oyama-kenroku":
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


/* =========================
   获取页面元素
========================= */

const detailContainer =
  document.querySelector(
    "#place-detail"
  );

const searchInput =
  document.querySelector(
    "#site-search-input"
  );

const searchResults =
  document.querySelector(
    "#search-results"
  );

const lightbox =
  document.querySelector(
    "#image-lightbox"
  );

const lightboxImage =
  document.querySelector(
    "#lightbox-image"
  );

const lightboxCaption =
  document.querySelector(
    "#lightbox-caption"
  );

const lightboxClose =
  document.querySelector(
    "#lightbox-close"
  );

let lastFocusedGalleryButton = null;


/* =========================
   页面初始化
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupMobileMenu();
    setupGlobalSearch();
    setupLightbox();

    loadPlaceIndex();
    loadPlaceDetail();
  }
);


/* =========================
   读取当前地点
========================= */

async function loadPlaceDetail() {
  const placeId =
    getPlaceIdFromUrl();

  if (!placeId) {
    renderDetailError(
      "没有指定地点",
      "当前网址中缺少地点 ID。"
    );

    return;
  }

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

    const places = Array.isArray(data)
      ? data
      : data.places;

    if (!Array.isArray(places)) {
      throw new Error(
        "kanazawa.json 中没有有效的地点数组。"
      );
    }

    if (
      !Array.isArray(data) &&
      Array.isArray(data.guideAreas)
    ) {
      registerGuideAreas(
        data.guideAreas
      );
    }

    const currentPlace =
      places.find((place) => {
        return (
          String(place.id) ===
          String(placeId)
        );
      });

    if (!currentPlace) {
      renderDetailError(
        "找不到该地点",
        `kanazawa.json 中没有 ID 为“${placeId}”的地点。`
      );

      return;
    }

    renderPlaceDetail(
      currentPlace
    );
  } catch (error) {
    console.error(error);

    renderDetailError(
      "地点资料读取失败",
      "请检查 kanazawa.json 的路径和 JSON 格式。"
    );
  }
}


/**
 * 从网址读取 id。
 */
function getPlaceIdFromUrl() {
  const parameters =
    new URLSearchParams(
      window.location.search
    );

  return parameters.get("id");
}


/**
 * 读取 JSON 中的巡礼区域名称。
 */
function registerGuideAreas(guideAreas) {
  guideAreas.forEach((area) => {
    if (
      area &&
      area.id &&
      area.name
    ) {
      guideAreaLabels[area.id] =
        area.name;
    }
  });
}


/* =========================
   生成地点详情
========================= */

function renderPlaceDetail(place) {
  if (!detailContainer) {
    return;
  }

  document.title =
    `${place.name}｜莲之空圣地部`;

  const guideAreaLabel =
    place.guideArea
      ? getGuideAreaLabel(
          place.guideArea
        )
      : "";

  const guideAreaTag =
    guideAreaLabel
      ? `
        <span class="detail-label">
          ${escapeHtml(
            guideAreaLabel
          )}
        </span>
      `
      : "";

  const categoryTag =
    place.category
      ? `
        <span class="detail-label category">
          ${escapeHtml(
            place.category
          )}
        </span>
      `
      : "";

  const japaneseName =
    place.nameJa
      ? `
        <p class="detail-title-ja">
          ${escapeHtml(
            place.nameJa
          )}
        </p>
      `
      : "";

  const updatedDate =
    place.updatedAt
      ? `
        <p class="detail-updated">
          更新于：
          ${escapeHtml(
            formatDate(
              place.updatedAt
            )
          )}
        </p>
      `
      : "";

  const navigationLink =
  createNavigationLink(
    place.navigation
  );

  const headerMeta =
  updatedDate || navigationLink
    ? `
      <div class="detail-header-meta">
        ${updatedDate}
        ${navigationLink}
      </div>
    `
    : "";

  const introductionSection =
    createIntroductionSection(
      place.introduction
    );

  const informationSection =
    createInformationSection(place);

  const sourceSection =
    createTagSection(
      "圣地出处",
      place.sources,
      "sources"
    );

  const characterSection =
    createTagSection(
      "涉及角色",
      place.characters,
      "characters"
    );

  const otherSection =
    createTagSection(
      "其他",
      place.other,
      "other"
    );

  const gallerySection =
    createGallerySection(place);

  detailContainer.innerHTML = `
    <header class="detail-header">
      <div class="detail-labels">
        ${guideAreaTag}
        ${categoryTag}
      </div>

      <h1 class="detail-title">
        ${escapeHtml(place.name)}
      </h1>

      ${japaneseName}
      ${headerMeta}
    </header>

    ${informationSection}
    ${sourceSection}
    ${characterSection}
    ${introductionSection}
    ${gallerySection}
    ${otherSection}
  `;

  bindGalleryButtons();
}


/* =========================
   地点介绍
========================= */

function createIntroductionSection(
  introduction
) {
  if (!introduction) {
    return "";
  }

  return `
    <section class="detail-section">
      <h2 class="detail-section-title">
        地点介绍
      </h2>

      <p class="detail-introduction">
        ${escapeHtmlWithLineBreaks(
          introduction
        )}
      </p>
    </section>
  `;
}


/* =========================
   基本资料
========================= */

function createInformationSection(place) {
  const rows = [
    createInformationRow(
      "地址",
      place.address
    ),

    createInformationRow(
      "营业时间",
      formatDisplayValue(
        place.businessHours
      )
    ),

    createInformationRow(
      "定休日",
      formatDisplayValue(
        place.closedDays
      )
    ), 

    createInformationRow(
  "票价",
  formatDisplayValue(
    place.admissionFee
  )
),

       createWebsiteInformationRow(
      place.website
    )
  ].filter(Boolean);

  if (rows.length === 0) {
    return "";
  }

  return `
    <section class="detail-section">
      <h2 class="detail-section-title">
        基本资料
      </h2>

      <dl class="detail-information">
        ${rows.join("")}
      </dl>
    </section>
  `;
}

function createNavigationLink(
  navigation
) {
  const destination =
    String(navigation || "").trim();

  if (!destination) {
    return "";
  }

  const url = new URL(
    "https://www.google.com/maps/dir/"
  );

  url.searchParams.set(
    "api",
    "1"
  );

  url.searchParams.set(
    "destination",
    destination
  );

  return `
    <a
      class="detail-navigation-link"
      href="${escapeAttribute(url.toString())}"
      target="_blank"
      rel="noopener noreferrer"
    >
      导航
      <span aria-hidden="true">↗</span>
    </a>
  `;
}

function createInformationRow(
  label,
  value
) {
  if (!value) {
    return "";
  }

  return `
    <div class="detail-information-row">
      <dt>
        ${escapeHtml(label)}
      </dt>

      <dd>
        ${escapeHtmlWithLineBreaks(
          value
        )}
      </dd>
    </div>
  `;
}

/**
 * 生成官方网站链接。
 */
function createWebsiteInformationRow(
  website
) {
  const websiteUrl =
    normalizeExternalUrl(website);

  if (!websiteUrl) {
    return "";
  }

  return `
    <div class="detail-information-row">
      <dt>
        网站
      </dt>

      <dd>
        <a
          class="detail-external-link"
          href="${escapeAttribute(websiteUrl)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${escapeHtml(websiteUrl)}
          <span aria-hidden="true">↗</span>
        </a>
      </dd>
    </div>
  `;
}


/**
 * 检查外部链接是否为有效的
 * HTTP 或 HTTPS 地址。
 */
function normalizeExternalUrl(value) {
  const text =
    String(value || "").trim();

  if (!text) {
    return "";
  }

  try {
    const url =
      new URL(text);

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return "";
    }

    return url.href;
  } catch (error) {
    console.warn(
      "无效的网站地址：",
      value
    );

    return "";
  }
}

/* =========================
   出处、角色及其他标签
========================= */

function createTagSection(
  title,
  values,
  className
) {
  const items =
    toStringArray(values);

  if (items.length === 0) {
    return "";
  }

  return `
    <section class="detail-section">
      <h2 class="detail-section-title">
        ${escapeHtml(title)}
      </h2>

      <ul class="detail-tag-list ${escapeAttribute(className)}">
        ${items
          .map((item) => {
            return `
              <li>
                ${escapeHtml(item)}
              </li>
            `;
          })
          .join("")}
      </ul>
    </section>
  `;
}


/* =========================
   图片区域
========================= */

function createGallerySection(place) {
  const images =
    normalizeImages(
      place.images,
      place.name
    );

  if (images.length === 0) {
    return "";
  }

  return `
    <section class="detail-section">
      <h2 class="detail-section-title">
        现场图片
      </h2>

      <div class="place-gallery">
        ${images
          .map((image, index) => {
            const imageUrl =
              resolveImagePath(
                image.src
              );

            const caption =
              image.caption || "";

            return `
              <figure class="gallery-figure">
                <button
                  class="gallery-button"
                  type="button"
                  data-gallery-image
                  data-image-src="${escapeAttribute(imageUrl)}"
                  data-image-alt="${escapeAttribute(image.alt)}"
                  data-image-caption="${escapeAttribute(caption)}"
                  aria-label="放大查看第 ${index + 1} 张图片"
                >
                  <img
                    src="${escapeAttribute(imageUrl)}"
                    alt="${escapeAttribute(image.alt)}"
                    loading="lazy"
                  >
                </button>

                ${
                  caption
                    ? `
                      <figcaption class="gallery-caption">
                        ${escapeHtml(caption)}
                      </figcaption>
                    `
                    : ""
                }
              </figure>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}


/**
 * 同时支持：
 *
 * "images": [
 *   "images/places/.../01.webp"
 * ]
 *
 * 以及：
 *
 * "images": [
 *   {
 *     "src": "...",
 *     "alt": "...",
 *     "caption": "..."
 *   }
 * ]
 */
function normalizeImages(
  images,
  placeName
) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image, index) => {
      if (
        typeof image === "string"
      ) {
        return {
          src: image,
          alt:
            `${placeName} 图片 ${index + 1}`,
          caption: ""
        };
      }

      if (
        image &&
        typeof image === "object" &&
        image.src
      ) {
        return {
          src: image.src,
          alt:
            image.alt ||
            `${placeName} 图片 ${index + 1}`,
          caption:
            image.caption || ""
        };
      }

      return null;
    })
    .filter(Boolean);
}


/**
 * JSON 中图片路径从仓库根目录开始：
 *
 * images/places/kanazawa/...
 *
 * 详情页位于三级文件夹内，
 * 因此自动加上 ../../../
 */
function resolveImagePath(path) {
  const value =
    String(path || "").trim();

  if (!value) {
    return "";
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  const cleanedPath =
    value.replace(/^\/+/, "");

  return `../../../${cleanedPath}`;
}


/* =========================
   图片放大窗口
========================= */

function setupLightbox() {
  if (
    !lightbox ||
    !lightboxImage ||
    !lightboxCaption ||
    !lightboxClose
  ) {
    return;
  }

  lightboxClose.addEventListener(
    "click",
    closeLightbox
  );

  lightbox.addEventListener(
    "click",
    (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    }
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        !lightbox.hidden
      ) {
        closeLightbox();
      }
    }
  );
}


function bindGalleryButtons() {
  const galleryButtons =
    document.querySelectorAll(
      "[data-gallery-image]"
    );

  galleryButtons.forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        openLightbox(button);
      }
    );
  });
}


function openLightbox(button) {
  if (
    !lightbox ||
    !lightboxImage ||
    !lightboxCaption
  ) {
    return;
  }

  lastFocusedGalleryButton =
    button;

  const imageSrc =
    button.dataset.imageSrc || "";

  const imageAlt =
    button.dataset.imageAlt || "";

  const imageCaption =
    button.dataset.imageCaption || "";

  lightboxImage.src =
    imageSrc;

  lightboxImage.alt =
    imageAlt;

  lightboxCaption.textContent =
    imageCaption;

  lightboxCaption.hidden =
    !imageCaption;

  lightbox.hidden = false;

  document.body.style.overflow =
    "hidden";

  if (lightboxClose) {
    lightboxClose.focus();
  }
}


function closeLightbox() {
  if (!lightbox) {
    return;
  }

  lightbox.hidden = true;

  document.body.style.overflow =
    "";

  if (lightboxImage) {
    lightboxImage.src = "";
    lightboxImage.alt = "";
  }

  if (lastFocusedGalleryButton) {
    lastFocusedGalleryButton.focus();
  }
}


/* =========================
   错误显示
========================= */

function renderDetailError(
  title,
  message
) {
  if (!detailContainer) {
    return;
  }

  document.title =
    `${title}｜莲之空圣地部`;

  detailContainer.innerHTML = `
    <section class="detail-error">
      <h1>
        ${escapeHtml(title)}
      </h1>

      <p>
        ${escapeHtml(message)}
      </p>
    </section>
  `;
}


/* =========================
   全站搜索索引
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
   侧边栏全站搜索
========================= */

function setupGlobalSearch() {
  if (!searchInput || !searchResults) {
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

      renderSearchResults(
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

  searchResults.innerHTML =
    places
      .map(createSearchResultItem)
      .join("");

  searchResults.hidden = false;
}


function createSearchResultItem(place) {
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
}


/* =========================
   数据与显示工具
========================= */

function isValidIndexPlace(place) {
  return Boolean(
    place &&
    place.id &&
    place.name &&
    place.prefecture &&
    place.city
  );
}


function getGuideAreaLabel(areaId) {
  return (
    guideAreaLabels[areaId] ||
    areaId
  );
}


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


function formatDisplayValue(value) {
  return toStringArray(value)
    .join("、");
}


function formatDate(dateString) {
  const date =
    new Date(dateString);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(dateString);
  }

  return new Intl.DateTimeFormat(
    "zh-CN",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).format(date);
}


function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase();
}


function escapeHtmlWithLineBreaks(
  value
) {
  return escapeHtml(value)
    .replaceAll(
      "\n",
      "<br>"
    );
}


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {
  return escapeHtml(value)
    .replaceAll("`", "&#096;");
}