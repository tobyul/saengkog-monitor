"use strict";

const API_BASE = "https://reib.duckdns.org:60892";

const DISPLAY = 20;

let currentQuery = "생곡소각장";
let currentSort = "date";
let currentPage = 1;
let currentDays = 30;
let totalResults = 0;

/* =========================================
DOM
========================================= */

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const clearButton = document.getElementById("clearButton");
const sortSelect = document.getElementById("sortSelect");
const periodButtons = document.getElementById("periodButtons");

const resultCount = document.getElementById("resultCount");
const searchPeriod = document.getElementById("searchPeriod");
const searchStatus = document.getElementById("searchStatus");

const newsResults = document.getElementById("newsResults");

const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const pageInfo = document.getElementById("pageInfo");

/* =========================================
API 호출
========================================= */

async function apiFetch(path) {

const url =
    API_BASE.replace(/\/$/, "") + path;

console.log("API 요청:", url);

const response = await fetch(url);

if (!response.ok) {

    let message = "";

    try {

        const data = await response.json();

        message =
            data.message ||
            data.error ||
            "";

    }
    catch (e) {
    }

    throw new Error(
        "API 오류 " +
        response.status +
        (message ? ": " + message : "")
    );
}

return await response.json();

}

/* =========================================
HTML Escape
========================================= */

function escapeHtml(value) {

if (
    value === null ||
    value === undefined
) {
    return "";
}

return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

/* =========================================
네이버 뉴스 제목/설명 처리
========================================= */

function safeNaverHtml(value) {

if (!value) {
    return "";
}

const temp =
    document.createElement("div");

temp.innerHTML = value;

const plainText =
    temp.textContent || "";

let result =
    escapeHtml(plainText);

const boldWords =
    Array.from(
        temp.querySelectorAll("b")
    )
    .map(function(item) {
        return item.textContent || "";
    })
    .filter(Boolean);

boldWords.forEach(function(word) {

    const escaped =
        escapeHtml(word);

    result =
        result
            .split(escaped)
            .join(
                "<b>" +
                escaped +
                "</b>"
            );
});

return result;

}

/* =========================================
URL 처리
========================================= */

function safeUrl(value) {

if (!value) {
    return "#";
}

const url =
    String(value).trim();

if (
    !url.startsWith("http://") &&
    !url.startsWith("https://")
) {
    return "#";
}

return escapeHtml(url);

}

/* =========================================
검색 기간 날짜
========================================= */

function formatPeriodDate(value) {

if (!value) {
    return "";
}

const date =
    new Date(value);

if (
    Number.isNaN(
        date.getTime()
    )
) {
    return String(value);
}

const year =
    date.getFullYear();

const month =
    String(
        date.getMonth() + 1
    ).padStart(2, "0");

const day =
    String(
        date.getDate()
    ).padStart(2, "0");

return (
    year +
    "." +
    month +
    "." +
    day
);

}

/* =========================================
뉴스 발행일
========================================= */

function formatDate(value) {

if (!value) {
    return "";
}

const date =
    new Date(value);

if (
    Number.isNaN(
        date.getTime()
    )
) {
    return value;
}

const year =
    date.getFullYear();

const month =
    String(
        date.getMonth() + 1
    ).padStart(2, "0");

const day =
    String(
        date.getDate()
    ).padStart(2, "0");

const hour =
    String(
        date.getHours()
    ).padStart(2, "0");

const minute =
    String(
        date.getMinutes()
    ).padStart(2, "0");

return (
    year +
    "." +
    month +
    "." +
    day +
    " " +
    hour +
    ":" +
    minute
);

}

/* =========================================
뉴스 검색
========================================= */

async function searchNews() {

if (!searchInput) {
    return;
}

currentQuery =
    searchInput.value.trim();

if (!currentQuery) {

    searchInput.focus();

    return;
}

if (sortSelect) {

    currentSort =
        sortSelect.value;
}

currentPage = 1;

await loadNews();

}

/* =========================================
뉴스 조회
========================================= */

async function loadNews() {

if (!newsResults) {

    console.error(
        "newsResults 요소를 찾을 수 없습니다."
    );

    return;
}

newsResults.innerHTML =
    '<div class="loading-box">' +
    '뉴스를 검색하는 중입니다...' +
    '</div>';

if (searchStatus) {

    searchStatus.textContent =
        "검색 중...";
}

if (searchPeriod) {

    searchPeriod.textContent =
        "검색 기간 확인 중...";
}

try {

    const start =
        ((currentPage - 1) * DISPLAY) + 1;

    const query =
        encodeURIComponent(
            currentQuery
        );

    const apiPath =
        "/api/news" +
        "?query=" +
        query +
        "&display=" +
        DISPLAY +
        "&start=" +
        start +
        "&sort=" +
        currentSort +
        "&days=" +
        currentDays;

    console.log(
        "뉴스 API 요청:",
        API_BASE + apiPath
    );

    const data =
        await apiFetch(apiPath);

    console.log(
        "뉴스 API 응답:",
        data
    );

    if (!data.success) {

        throw new Error(
            data.message ||
            data.error ||
            "뉴스 API 응답 오류"
        );
    }


    /* API data 확인 */

    const result =
        data.data || {};

    console.log(
        "뉴스 검색 결과:",
        result
    );


    /* 뉴스 목록 */

    const items =
        Array.isArray(result.items)
            ? result.items
            : [];


    console.log(
        "뉴스 개수:",
        items.length
    );


    /* 전체 결과 수 */

    totalResults =
        Number(
            result.total || 0
        );


    /* 결과 건수 */

    if (resultCount) {

        resultCount.textContent =
            totalResults.toLocaleString(
                "ko-KR"
            );
    }


    /* 검색 기간 */

    if (
        searchPeriod &&
        result.startDate &&
        result.endDate
    ) {

        searchPeriod.textContent =
            formatPeriodDate(
                result.startDate
            ) +
            " ~ " +
            formatPeriodDate(
                result.endDate
            );
    }
    else if (searchPeriod) {

        searchPeriod.textContent =
            "최근 " +
            currentDays +
            "일";
    }


    /* 검색 상태 */

    if (searchStatus) {

        searchStatus.textContent =
            "\"" +
            currentQuery +
            "\" 검색";
    }


    /* 뉴스 출력 */

    renderNews(items);


    /* 페이지네이션 */

    updatePagination();

}
catch (error) {

    console.error(
        "뉴스 검색 오류:",
        error
    );

    newsResults.innerHTML =
        '<div class="error-box">' +
        '뉴스를 불러오지 못했습니다.' +
        '<br>' +
        '<small>' +
        escapeHtml(
            error.message
        ) +
        '</small>' +
        '</div>';

    if (searchStatus) {

        searchStatus.textContent =
            "검색 오류";
    }

    if (resultCount) {

        resultCount.textContent =
            "-";
    }

    if (searchPeriod) {

        searchPeriod.textContent =
            "검색 기간을 확인할 수 없습니다.";
    }

    totalResults = 0;

    updatePagination();
}

}

/* =========================================
뉴스 목록 출력
========================================= */

function renderNews(items) {

if (!newsResults) {

    console.error(
        "newsResults 요소가 없습니다."
    );

    return;
}


if (
    !items ||
    items.length === 0
) {

    newsResults.innerHTML =
        '<div class="empty-box">' +
        '검색 결과가 없습니다.' +
        '</div>';

    return;
}


let html = "";


items.forEach(function(item) {

    if (!item) {
        return;
    }


    const title =
        safeNaverHtml(
            item.title
        );


    const description =
        safeNaverHtml(
            item.description
        );


    const link =
        safeUrl(
            item.link ||
            item.originallink
        );


    const pubDate =
        formatDate(
            item.pubDate
        );


    html +=
        '<a ' +
        'href="' +
        link +
        '" ' +
        'target="_blank" ' +
        'rel="noopener noreferrer" ' +
        'class="news-result-item">' +

        '<div class="news-result-title">' +
        title +
        '</div>' +

        '<div class="news-result-meta">' +
        '<span>' +
        pubDate +
        '</span>' +
        '</div>' +

        '<div class="news-result-description">' +
        description +
        '</div>' +

        '</a>';
});


newsResults.innerHTML =
    html;

}

/* =========================================
페이지네이션
========================================= */

function updatePagination() {

const totalPages =
    Math.ceil(
        totalResults /
        DISPLAY
    );


if (pageInfo) {

    pageInfo.textContent =
        currentPage +
        " / " +
        Math.max(
            totalPages,
            1
        );
}


if (prevButton) {

    prevButton.disabled =
        currentPage <= 1;
}


const maxPage =
    Math.min(
        totalPages,
        50
    );


if (nextButton) {

    nextButton.disabled =
        currentPage >= maxPage;
}

}

/* =========================================
검색 버튼
========================================= */

if (searchButton) {

searchButton.addEventListener(
    "click",
    searchNews
);

}

/* =========================================
Enter 검색
========================================= */

if (searchInput) {

searchInput.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key ===
            "Enter"
        ) {

            searchNews();
        }
    }
);

}

/* =========================================
정렬 변경
========================================= */

if (sortSelect) {

sortSelect.addEventListener(
    "change",
    function() {

        currentSort =
            this.value;

        currentPage = 1;

        loadNews();
    }
);

}

/* =========================================
기간 변경
========================================= */

if (periodButtons) {

periodButtons.addEventListener(
    "click",
    function(event) {

        const button =
            event.target.closest(".period-btn");

        if (!button) {
            return;
        }

        periodButtons
            .querySelectorAll(".period-btn")
            .forEach(function(b) {
                b.classList.remove("active");
            });

        button.classList.add("active");

        currentDays =
            Number(button.dataset.days);

        currentPage = 1;

        loadNews();
    }
);

}

/* =========================================
검색어 삭제
========================================= */

if (clearButton) {

clearButton.addEventListener(
    "click",
    function() {

        if (!searchInput) {
            return;
        }

        searchInput.value = "";

        searchInput.focus();
    }
);

}

/* =========================================
이전 페이지
========================================= */

if (prevButton) {

prevButton.addEventListener(
    "click",
    function() {

        if (
            currentPage <= 1
        ) {
            return;
        }

        currentPage--;

        loadNews();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }
);

}

/* =========================================
다음 페이지
========================================= */

if (nextButton) {

nextButton.addEventListener(
    "click",
    function() {

        const maxPage =
            Math.min(
                Math.ceil(
                    totalResults /
                    DISPLAY
                ),
                50
            );


        if (
            currentPage >=
            maxPage
        ) {
            return;
        }


        currentPage++;

        loadNews();


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }
);

}

/* =========================================
페이지 초기화
========================================= */

function initializeNewsPage() {

console.log(
    "뉴스 페이지 초기화"
);


if (
    searchInput &&
    searchInput.value.trim()
) {

    currentQuery =
        searchInput.value.trim();
}


if (sortSelect) {

    currentSort =
        sortSelect.value;
}


console.log(
    "검색어:",
    currentQuery
);


console.log(
    "정렬:",
    currentSort
);


loadNews();

}

/* =========================================
최초 실행
========================================= */

if (
document.readyState ===
"loading"
) {

document.addEventListener(
    "DOMContentLoaded",
    initializeNewsPage
);

}
else {

initializeNewsPage();

}