"use strict";


/* =========================================================
   API 설정
========================================================= */

// app.js와 동일한 백엔드 주소를 입력하세요.

const API_BASE = "https://reib.duckdns.org:60892";


/* =========================================================
   상태
========================================================= */

let currentQuery = "생곡소각장";
let currentSort = "date";

let currentPage = 1;

const DISPLAY = 20;

let totalResults = 0;


/* =========================================================
   DOM
========================================================= */

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");

const clearButton =
    document.getElementById("clearButton");

const sortSelect =
    document.getElementById("sortSelect");

const resultCount =
    document.getElementById("resultCount");

const searchStatus =
    document.getElementById("searchStatus");

const newsResults =
    document.getElementById("newsResults");

const prevButton =
    document.getElementById("prevButton");

const nextButton =
    document.getElementById("nextButton");

const pageInfo =
    document.getElementById("pageInfo");


/* =========================================================
   API
========================================================= */

async function apiFetch(path) {

    const url =
        API_BASE.replace(/\/$/, "") +
        path;

    const response =
        await fetch(url);

    if (!response.ok) {

        let message = "";

        try {

            const data =
                await response.json();

            message =
                data.message ||
                data.error ||
                "";

        } catch (e) {
            // ignore
        }

        throw new Error(
            `API 오류 ${response.status}` +
            (message ? `: ${message}` : "")
        );
    }

    return await response.json();
}


/* =========================================================
   HTML 처리
========================================================= */

function escapeHtml(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/*
 * 네이버 결과의 <b>강조</b>는 유지하고
 * 다른 HTML은 제거합니다.
 */

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
        [...temp.querySelectorAll("b")]
            .map(item =>
                item.textContent || ""
            )
            .filter(Boolean);

    for (const word of boldWords) {

        const escaped =
            escapeHtml(word);

        result =
            result
                .split(escaped)
                .join(
                    `<b>${escaped}</b>`
                );
    }

    return result;
}


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


/* =========================================================
   날짜
========================================================= */

function formatDate(value) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
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

    return `${year}.${month}.${day} ${hour}:${minute}`;
}


/* =========================================================
   뉴스 검색
========================================================= */

async function searchNews() {

    currentQuery =
        searchInput.value.trim();

    if (!currentQuery) {

        searchInput.focus();

        return;
    }

    currentSort =
        sortSelect.value;

    currentPage = 1;

    await loadNews();
}


/* =========================================================
   뉴스 로딩
========================================================= */

async function loadNews() {

    newsResults.innerHTML = `
        <div class="loading-box">
            뉴스를 검색하는 중입니다...
        </div>
    `;

    searchStatus.textContent =
        "검색 중...";


    try {

        const start =
            ((currentPage - 1) * DISPLAY) + 1;

        const query =
            encodeURIComponent(
                currentQuery
            );

        const data =
            await apiFetch(
                `/api/news?query=${query}` +
                `&display=${DISPLAY}` +
                `&start=${start}` +
                `&sort=${currentSort}`
            );


        if (!data.success) {

            throw new Error(
                data.message ||
                "뉴스 API 응답 오류"
            );
        }


        const result =
            data.data || {};

        const items =
            result.items || [];


        totalResults =
            Number(
                result.total || 0
            );


        resultCount.textContent =
            totalResults.toLocaleString(
                "ko-KR"
            );


        searchStatus.textContent =
            `"${currentQuery}" 검색`;


        renderNews(items);

        updatePagination();

    } catch (error) {

        console.error(error);

        newsResults.innerHTML = `
            <div class="error-box">
                뉴스를 불러오지 못했습니다.
                <br>
                <small>
                    ${escapeHtml(error.message)}
                </small>
            </div>
        `;

        searchStatus.textContent =
            "검색 오류";

        resultCount.textContent = "-";
    }
}


/* =========================================================
   뉴스 출력
========================================================= */

function renderNews(items) {

    if (!items.length) {

        newsResults.innerHTML = `
            <div class="empty-box">
                검색 결과가 없습니다.
            </div>
        `;

        return;
    }


    newsResults.innerHTML =
        items.map(item => {

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

            return `
                <a
                    href="${link}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="news-result-item"
                >

                    <div class="news-result-title">
                        ${title}
                    </div>

                    <div class="news-result-meta">

                        <span>
                            ${formatDate(
                                item.pubDate
                            )}
                        </span>

                    </div>

                    <div class="news-result-description">
                        ${description}
                    </div>

                </a>
            `;

        }).join("");
}


/* =========================================================
   페이지네이션
========================================================= */

function updatePagination() {

    const totalPages =
        Math.ceil(
            totalResults / DISPLAY
        );

    pageInfo.textContent =
        `${currentPage} / ${Math.max(
            totalPages,
            1
        )}`;


    prevButton.disabled =
        currentPage <= 1;


    /*
     * NAVER Search API의 start 최대값이
     * 1000이므로 실제 접근 가능한 페이지는
     * 50페이지 정도입니다.
     */

    const maxPage =
        Math.min(
            totalPages,
            50
        );

    nextButton.disabled =
        currentPage >= maxPage;
}


/* =========================================================
   이벤트
========================================================= */

searchButton.addEventListener(
    "click",
    searchNews
);


searchInput.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {
            searchNews();
        }
    }
);


sortSelect.addEventListener(
    "change",
    function() {

        currentSort =
            this.value;

        currentPage = 1;

        loadNews();
    }
);


clearButton.addEventListener(
    "click",
    function() {

        searchInput.value = "";

        searchInput.focus();
    }
);


prevButton.addEventListener(
    "click",
    function() {

        if (currentPage <= 1) {
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


nextButton.addEventListener(
    "click",
    function() {

        const maxPage =
            Math.min(
                Math.ceil(
                    totalResults / DISPLAY
                ),
                50
            );

        if (currentPage >= maxPage) {
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


/* =========================================================
   초기 실행
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadNews();

    }
);