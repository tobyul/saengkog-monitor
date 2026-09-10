"use strict";


/* =========================================================
   API 설정
========================================================= */

// 실제 Node.js 백엔드 주소로 변경하세요.
// 예:
// const API_BASE = "https://api.example.com";
//
// 테스트:
// const API_BASE = "http://192.168.0.100:60891";

const API_BASE = "https://reib.duckdns.org:60892";


/* =========================================================
   모니터링 키워드
========================================================= */

const KEYWORDS = [
    {
        name: "생곡소각장",
        keywords: [
            "생곡소각장",
            "생곡 소각장"
        ]
    },
    {
        name: "강서구 소각장",
        keywords: [
            "강서구 소각장",
            "부산 강서구 소각장"
        ]
    },
    {
        name: "부산 소각장",
        keywords: [
            "부산 소각장",
            "부산시 소각장"
        ]
    },
    {
        name: "생곡자원순환",
        keywords: [
            "생곡자원순환",
            "생곡 자원순환"
        ]
    },
    {
        name: "생곡자원순환복합타운",
        keywords: [
            "생곡자원순환복합타운"
        ]
    }
];


/* =========================================================
   전역 변수
========================================================= */

let trendChart = null;
let currentDays = 30;


/* =========================================================
   DOM
========================================================= */

const newsCountElement =
    document.getElementById("newsCount");

const keywordCountElement =
    document.getElementById("keywordCount");

const updatedAtElement =
    document.getElementById("updatedAt");

const keywordListElement =
    document.getElementById("keywordList");

const newsListElement =
    document.getElementById("newsList");

const trendLoadingElement =
    document.getElementById("trendLoading");


/* =========================================================
   공통 API
========================================================= */

async function apiFetch(path, options = {}) {

    const url =
        API_BASE.replace(/\/$/, "") + path;

    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    if (!response.ok) {

        let message = "";

        try {
            const data = await response.json();
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
   날짜
========================================================= */

function getLocalDateString(date) {

    const year = date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function getDateRange(days) {

    const end = new Date();

    const start = new Date();

    start.setDate(
        start.getDate() - (days - 1)
    );

    return {
        startDate: getLocalDateString(start),
        endDate: getLocalDateString(end)
    };
}


/* =========================================================
   HTML 처리
========================================================= */

function cleanText(value) {

    if (!value) {
        return "";
    }

    const temp = document.createElement("div");

    temp.innerHTML = value;

    return temp.textContent || temp.innerText || "";
}


/*
 * 네이버 검색 결과의 <b>...</b> 강조는 유지하되
 * 나머지 HTML은 제거합니다.
 */
function safeNaverHtml(value) {

    if (!value) {
        return "";
    }

    const temp =
        document.createElement("div");

    temp.innerHTML = value;

    const allowed = temp.querySelectorAll("b");

    const replacements = [];

    allowed.forEach(b => {

        const text =
            document.createTextNode(
                b.textContent || ""
            );

        const strong =
            document.createElement("b");

        strong.textContent =
            b.textContent || "";

        replacements.push({
            node: b,
            replacement: strong
        });
    });

    // 먼저 모든 텍스트로 정리
    const text =
        temp.textContent || "";

    // 강조된 단어가 없는 경우
    if (!value.includes("<b>")) {
        return escapeHtml(text);
    }

    // b 태그의 내용만 찾아서 다시 강조
    let result =
        escapeHtml(text);

    const temp2 =
        document.createElement("div");

    temp2.innerHTML = value;

    const bolds =
        [...temp2.querySelectorAll("b")]
            .map(x => x.textContent || "")
            .filter(Boolean);

    for (const word of bolds) {

        const escaped =
            escapeHtml(word);

        result =
            result.split(escaped)
                .join(`<b>${escaped}</b>`);
    }

    return result;
}


function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   날짜 포맷
========================================================= */

function formatDate(value) {

    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    const y = date.getFullYear();

    const m =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const d =
        String(date.getDate())
            .padStart(2, "0");

    const hh =
        String(date.getHours())
            .padStart(2, "0");

    const mm =
        String(date.getMinutes())
            .padStart(2, "0");

    return `${y}.${m}.${d} ${hh}:${mm}`;
}


/* =========================================================
   키워드 표시
========================================================= */

function renderKeywords() {

    keywordCountElement.textContent =
        KEYWORDS.length;

    keywordListElement.innerHTML =
        KEYWORDS.map(item => {

            return `
                <div class="keyword-card">
                    <div class="keyword-name">
                        ${escapeHtml(item.name)}
                    </div>

                    <div class="keyword-query">
                        ${item.keywords
                            .map(x => escapeHtml(x))
                            .join(" · ")}
                    </div>
                </div>
            `;

        }).join("");
}


/* =========================================================
   뉴스
========================================================= */

async function loadNews() {

    newsListElement.innerHTML = `
        <div class="loading-box">
            뉴스를 불러오는 중입니다...
        </div>
    `;

    try {

        const query =
            encodeURIComponent("생곡소각장");

        const data =
            await apiFetch(
                `/api/news?query=${query}&display=10&sort=date`
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

        newsCountElement.textContent =
            Number(result.total || 0)
                .toLocaleString("ko-KR");

        if (items.length === 0) {

            newsListElement.innerHTML = `
                <div class="empty-box">
                    검색 결과가 없습니다.
                </div>
            `;

            return;
        }

        newsListElement.innerHTML =
            items.slice(0, 10)
                .map(item => {

                    return `
                        <a
                            class="news-item"
                            href="${escapeAttribute(item.link)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >

                            <div class="news-title">
                                ${safeNaverHtml(item.title)}
                            </div>

                            <div class="news-meta">
                                ${formatDate(item.pubDate)}
                            </div>

                            <div class="news-description">
                                ${safeNaverHtml(item.description)}
                            </div>

                        </a>
                    `;

                })
                .join("");

    } catch (error) {

        console.error(error);

        newsCountElement.textContent = "-";

        newsListElement.innerHTML = `
            <div class="error-box">
                뉴스를 불러오지 못했습니다.<br>
                <small>${escapeHtml(error.message)}</small>
            </div>
        `;
    }
}


/* =========================================================
   URL Attribute
========================================================= */

function escapeAttribute(value) {

    if (!value) {
        return "#";
    }

    const url =
        String(value).trim();

    /*
     * http / https만 허용
     */
    if (
        !url.startsWith("http://") &&
        !url.startsWith("https://")
    ) {
        return "#";
    }

    return escapeHtml(url);
}


/* =========================================================
   Trend API
========================================================= */

async function loadTrend(days = currentDays) {

    currentDays = days;

    trendLoadingElement.classList.remove("hidden");

    const range =
        getDateRange(days);

    const keywordGroups =
        KEYWORDS.map(item => ({
            groupName: item.name,
            keywords: item.keywords
        }));

    try {

        const data =
            await apiFetch(
                "/api/trend",
                {
                    method: "POST",

                    body: JSON.stringify({

                        startDate:
                            range.startDate,

                        endDate:
                            range.endDate,

                        timeUnit: "date",

                        keywordGroups:

                            keywordGroups

                    })
                }
            );

        if (!data.success) {
            throw new Error(
                data.message ||
                "검색 트렌드 API 응답 오류"
            );
        }

        const result =
            data.data || data;

        renderTrend(result);

    } catch (error) {

        console.error(error);

        showTrendError(error);

    } finally {

        trendLoadingElement
            .classList.add("hidden");
    }
}


/* =========================================================
   Trend Chart
========================================================= */

function renderTrend(result) {

    /*
     * NAVER Search Trend 응답:
     *
     * {
     *   startDate,
     *   endDate,
     *   timeUnit,
     *   results: [
     *      {
     *        title: "...",
     *        keywords: [...],
     *        data: [
     *          {
     *            period: "2026-09-01",
     *            ratio: 12.34
     *          }
     *        ]
     *      }
     *   ]
     * }
     */

    const results =
        result.results || [];

    if (!results.length) {
        showTrendError(
            new Error("검색 트렌드 데이터가 없습니다.")
        );
        return;
    }

    const labels =
        results[0].data
            ? results[0].data.map(
                item => item.period
            )
            : [];

    const datasets =
        results.map((item, index) => {

            return {

                label:
                    item.title ||
                    `키워드 ${index + 1}`,

                data:
                    (item.data || [])
                        .map(x =>
                            Number(x.ratio || 0)
                        ),

                borderWidth: 2,

                pointRadius: 0,

                pointHoverRadius: 4,

                tension: .3,

                fill: false
            };
        });


    const ctx =
        document
            .getElementById("trendChart")
            .getContext("2d");


    if (trendChart) {
        trendChart.destroy();
    }


    trendChart =
        new Chart(ctx, {

            type: "line",

            data: {
                labels,
                datasets
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                interaction: {
                    mode: "index",
                    intersect: false
                },

                plugins: {

                    legend: {
                        position: "bottom",

                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            padding: 18,
                            font: {
                                size: 11
                            }
                        }
                    },

                    tooltip: {

                        callbacks: {

                            label: function(context) {

                                return (
                                    " " +
                                    context.dataset.label +
                                    ": " +
                                    Number(
                                        context.raw
                                    ).toFixed(1)
                                );
                            }
                        }
                    }
                },

                scales: {

                    x: {

                        grid: {
                            display: false
                        },

                        ticks: {
                            maxTicksLimit: 10,
                            font: {
                                size: 10
                            }
                        }
                    },

                    y: {

                        beginAtZero: true,

                        grid: {
                            color: "#eeeeee"
                        },

                        ticks: {
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });
}


/* =========================================================
   Trend 오류
========================================================= */

function showTrendError(error) {

    const wrapper =
        document.querySelector(
            ".chart-wrapper"
        );

    wrapper.innerHTML = `
        <div class="error-box"
             style="height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;">
            검색 관심도 데이터를 불러오지 못했습니다.
            <small style="margin-top:8px;">
                ${escapeHtml(error.message)}
            </small>
        </div>
    `;
}


/* =========================================================
   업데이트 시간
========================================================= */

function updateTime() {

    const now =
        new Date();

    updatedAtElement.textContent =
        now.toLocaleTimeString(
            "ko-KR",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
}


/* =========================================================
   기간 버튼
========================================================= */

function setupPeriodButtons() {

    const buttons =
        document.querySelectorAll(
            ".period-btn"
        );

    buttons.forEach(button => {

        button.addEventListener(
            "click",
            async function() {

                buttons.forEach(b =>
                    b.classList.remove("active")
                );

                this.classList.add("active");

                const days =
                    Number(
                        this.dataset.days
                    );

                await loadTrend(days);
            }
        );
    });
}


/* =========================================================
   초기 실행
========================================================= */

async function init() {

    renderKeywords();

    setupPeriodButtons();

    updateTime();

    await Promise.all([
        loadNews(),
        loadTrend(30)
    ]);

    updateTime();
}


document.addEventListener(
    "DOMContentLoaded",
    init
);