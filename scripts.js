        (function (c, l, a, r, i, t, y) {
            c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments) };
            t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
            y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
        })(window, document, "clarity", "script", "t1uasnjs80");
    

        // Centralized Cache Service for API responses
        const CacheService = {
            storageKeyPrefix: "betadvisor_cache_",
            defaultTTL: 15 * 60 * 1000, // 15 minutes

            get(key) {
                try {
                    const item = localStorage.getItem(this.storageKeyPrefix + key);
                    if (!item) return null;

                    const data = JSON.parse(item);
                    if (Date.now() > data.expiry) {
                        localStorage.removeItem(this.storageKeyPrefix + key);
                        return null;
                    }
                    return data.value;
                } catch (e) {
                    console.warn("Cache read error:", e);
                    return null;
                }
            },

            set(key, value, ttl = this.defaultTTL) {
                try {
                    const data = {
                        value,
                        expiry: Date.now() + ttl,
                    };
                    localStorage.setItem(
                        this.storageKeyPrefix + key,
                        JSON.stringify(data),
                    );
                    return true;
                } catch (e) {
                    console.warn("Cache write error:", e);
                    return false;
                }
            },

            async fetchWithCache(key, fetchFn, ttl = this.defaultTTL) {
                const cached = this.get(key);
                if (cached) return cached;

                const data = await fetchFn();
                this.set(key, data, ttl);
                return data;
            },

            invalidate(key) {
                localStorage.removeItem(this.storageKeyPrefix + key);
            },

            clear() {
                Object.keys(localStorage)
                    .filter((k) => k.startsWith(this.storageKeyPrefix))
                    .forEach((k) => localStorage.removeItem(k));
            },

            // Get cache info for debugging
            getCacheInfo() {
                const keys = Object.keys(localStorage).filter((k) =>
                    k.startsWith(this.storageKeyPrefix)
                );
                return keys.map(key => {
                    const item = localStorage.getItem(key);
                    if (!item) return null;
                    try {
                        const data = JSON.parse(item);
                        const isExpired = Date.now() > data.expiry;
                        const timeLeft = Math.max(0, data.expiry - Date.now());
                        return {
                            key: key.replace(this.storageKeyPrefix, ''),
                            expired: isExpired,
                            timeLeftMinutes: Math.floor(timeLeft / 60000)
                        };
                    } catch (e) {
                        return null;
                    }
                }).filter(Boolean);
            }
        };

        // CORS Proxy Function - FIXED VERSION
        const corsProxy = (url) => {
            // Use CORS proxy for GitHub raw URLs and other external resources
            if (url.includes("raw.githubusercontent.com")) {
                return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            }
            return url;
        };

        // Unified Theme Manager
        const ThemeManager = {
            storageKey: "betadvisor_theme",

            getSystemTheme() {
                return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "dark"
                    : "light";
            },

            applyTheme(theme, persist = true) {
                const normalized = theme === "light" ? "light" : "dark";
                document.documentElement.setAttribute("data-theme", normalized);
                document.body.setAttribute("data-theme", normalized);

                const themeToggle = document.querySelector(".pred-theme-toggle");
                if (themeToggle) {
                    themeToggle.textContent = normalized === "light" ? "🌙" : "☀️";
                }

                if (persist) {
                    localStorage.setItem(this.storageKey, normalized);
                }
            },

            toggleTheme() {
                const current = document.documentElement.getAttribute("data-theme") || "dark";
                const next = current === "light" ? "dark" : "light";
                this.applyTheme(next, true);
            },

            init() {
                const savedTheme = localStorage.getItem(this.storageKey);
                const initialTheme = savedTheme || "dark";
                this.applyTheme(initialTheme, false);

                if (!savedTheme && window.matchMedia) {
                    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
                    const handleThemeChange = (event) => {
                        if (!localStorage.getItem(this.storageKey)) {
                            this.applyTheme(event.matches ? "dark" : "light", false);
                        }
                    };

                    if (mediaQuery.addEventListener) {
                        mediaQuery.addEventListener("change", handleThemeChange);
                    } else if (mediaQuery.addListener) {
                        mediaQuery.addListener(handleThemeChange);
                    }
                }
            },
        };

        window.toggleAppTheme = function () {
            ThemeManager.toggleTheme();
        };
        ThemeManager.init();

        // Unified Initialization Manager (replaces multiple DOMContentLoaded listeners)
        const InitializationManager = {
            initialized: false,
            initializationQueue: [],

            init(fn) {
                if (this.initialized) {
                    fn();
                } else {
                    this.initializationQueue.push(fn);
                }
            },

            run() {
                if (this.initialized) return;
                this.initialized = true;
                this.initializationQueue.forEach((fn) => fn());
                this.initializationQueue = [];
            },
        };
        window.InitializationManager = InitializationManager;

        InitializationManager.init(() => {
            const activeTheme =
                document.documentElement.getAttribute("data-theme") || "dark";
            ThemeManager.applyTheme(activeTheme, false);
        });

        document.addEventListener(
            "DOMContentLoaded",
            () => {
                InitializationManager.run();
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        document.body.classList.remove("page-initializing");
                        setTimeout(() => {
                            document.body.classList.remove("page-warmup");
                        }, 300);
                    });
                });
            },
            { once: true },
        );

        // Tab Lazy Loader - Load tab data only when tab becomes active
        const TabLazyLoader = {
            loadedTabs: new Set(),
            tabLoaders: {},

            registerTab(tabName, loaderFn) {
                this.tabLoaders[tabName] = loaderFn;
            },

            async loadTab(tabName) {
                // If already loaded, skip
                if (this.loadedTabs.has(tabName)) {
                    console.log(`Tab "${tabName}" already loaded, skipping`);
                    return;
                }

                // If loader exists, execute it
                if (this.tabLoaders[tabName]) {
                    console.log(`Loading tab "${tabName}" for the first time...`);
                    try {
                        await this.tabLoaders[tabName]();
                        this.loadedTabs.add(tabName);
                        console.log(`Tab "${tabName}" loaded successfully`);
                    } catch (error) {
                        console.error(`Error loading tab "${tabName}":`, error);
                    }
                }
            },

            isLoaded(tabName) {
                return this.loadedTabs.has(tabName);
            },

            resetTab(tabName) {
                this.loadedTabs.delete(tabName);
            },

            resetAll() {
                this.loadedTabs.clear();
            }
        };

        // Firebase Singleton (prevents duplicate initialization)
        const FirebaseService = (() => {
            let app = null;
            let database = null;

            return {
                init(config) {
                    if (app) return { app, database }; // Already initialized

                    // Dynamically import Firebase
                    return import(
                        "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js"
                    )
                        .then(({ initializeApp }) => {
                            app = initializeApp(config);
                            return import(
                                "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js"
                            );
                        })
                        .then(({ getDatabase }) => {
                            database = getDatabase(app);
                            return { app, database };
                        });
                },
                getDatabase() {
                    if (!database) throw new Error("Firebase not initialized");
                    return database;
                },
                isReady() {
                    return database !== null;
                },
            };
        })();

        // Request Idle Callback wrapper for non-critical loads
        const LazyLoader = {
            queue: [],
            initialized: false,

            init() {
                if (this.initialized) return;
                this.initialized = true;

                if ("requestIdleCallback" in window) {
                    const processQueue = (deadline) => {
                        while (this.queue.length > 0 && deadline.timeRemaining() > 10) {
                            const item = this.queue.shift();
                            if (item) item();
                        }
                        if (this.queue.length > 0) {
                            window.requestIdleCallback(processQueue);
                        }
                    };
                    window.requestIdleCallback(processQueue);
                } else {
                    // Fallback for browsers without requestIdleCallback
                    setTimeout(() => {
                        this.queue.forEach((fn) => fn());
                        this.queue = [];
                    }, 100);
                }
            },

            load(fn) {
                this.init();
                this.queue.push(fn);
            },
        };

        // DOM Fragment Cache for repeated operations
        const DOMOptimizer = {
            createFragment(html) {
                const template = document.createElement("template");
                template.innerHTML = html;
                return template.content;
            },

            // Batch DOM operations using DocumentFragment
            batchAppend(container, items, itemRenderer) {
                const fragment = document.createDocumentFragment();
                items.forEach((item) => {
                    const element = itemRenderer(item);
                    fragment.appendChild(element);
                });
                container.appendChild(fragment);
            },
        };

        // Toast Notification System
        const ToastManager = {
            init() {
                let container = document.getElementById("toast-container");
                if (!container) {
                    container = document.createElement("div");
                    container.id = "toast-container";
                    document.body.appendChild(container);
                }
            },

            show(message, type = "info", duration = 5000) {
                this.init();
                const container = document.getElementById("toast-container");
                const toast = document.createElement("div");
                toast.className = `toast ${type}`;
                const icon =
                    type === "success"
                        ? "✅"
                        : type === "error"
                            ? "❌"
                            : type === "warning"
                                ? "⚠️"
                                : "ℹ️";
                toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
                container.appendChild(toast);

                if (duration > 0) {
                    setTimeout(() => {
                        toast.classList.add("closing");
                        setTimeout(() => toast.remove(), 300);
                    }, duration);
                }

                return toast;
            },

            success(message, duration = 3000) {
                return this.show(message, "success", duration);
            },
            error(message, duration = 5000) {
                return this.show(message, "error", duration);
            },
            warning(message, duration = 4000) {
                return this.show(message, "warning", duration);
            },
            info(message, duration = 3000) {
                return this.show(message, "info", duration);
            },
        };
        window.ToastManager = ToastManager;

        // Dead Click Tracker
        const DeadClickTracker = {
            init() {
                document.addEventListener("click", function (e) {
                    const target = e.target;

                    // Handle prediction card clicks
                    const predCard = target.closest(".prediction-card, .pred-prediction-card");
                    if (predCard && !target.closest("a, button")) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.showMatchDetails(e, predCard);
                        return;
                    }

                    const isInteractive =
                        target.closest("a") ||
                        target.closest("button") ||
                        target.closest('[role="button"]') ||
                        target.closest(".stat-card") ||
                        predCard;

                    if (!isInteractive) {
                        const elementPath = DeadClickTracker.getElementPath(target);
                        console.log("Potential dead click on:", elementPath);

                        // Send to analytics if available
                        if (typeof ga !== "undefined") {
                            ga(
                                "send",
                                "event",
                                "DeadClick",
                                elementPath,
                                window.location.pathname,
                            );
                        }
                    }
                });
            },

            getElementPath(element) {
                const path = [];
                while (element && element.nodeType === Node.ELEMENT_NODE) {
                    let selector = element.nodeName.toLowerCase();
                    if (element.id) {
                        selector += "#" + element.id;
                        path.unshift(selector);
                        break;
                    } else {
                        let sibling = element;
                        let nth = 1;
                        while ((sibling = sibling.previousElementSibling)) {
                            if (sibling.nodeName.toLowerCase() === selector) nth++;
                        }
                        if (nth !== 1) selector += ":nth-of-type(" + nth + ")";
                    }
                    path.unshift(selector);
                    element = element.parentNode;
                }
                return path.join(" > ");
            },
        };

        // Initialize dead click tracking
        DeadClickTracker.init();

        // Make team/match elements interactive to reduce dead/rage clicks and avoid null handler errors
        function makeElementsInteractive() {
            try {
                document.querySelectorAll(".team, .pred-team").forEach((el) => {
                    el.style.cursor = "pointer";
                    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
                    el.addEventListener("click", function () {
                        try {
                            const matchCard = this.closest(
                                ".prediction-card, .pred-prediction-card",
                            );
                            if (matchCard && typeof matchCard.onclick === "function") {
                                matchCard.onclick();
                                return;
                            }
                            if (typeof showToast === "function") {
                                showToast(this.textContent.trim());
                            } else {
                                console.log("Clicked:", this.textContent.trim());
                            }
                        } catch (err) {
                            console.warn("interactive click handler error", err);
                        }
                    });
                    el.addEventListener("keydown", function (e) {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            this.click();
                        }
                    });
                });

                document
                    .querySelectorAll(
                        ".pred-date, .date, .ma-month-header, .ma-tab-button",
                    )
                    .forEach((el) => {
                        el.style.cursor = "pointer";
                        el.addEventListener("click", function () {
                            this.classList.add("pulse");
                            setTimeout(() => this.classList.remove("pulse"), 300);
                        });
                    });
            } catch (e) {
                console.warn("makeElementsInteractive failed", e);
            }
        }

        InitializationManager.init(function () {
            try {
                makeElementsInteractive();
            } catch (e) {
                console.error("makeElementsInteractive error:", e);
            }
        });

        // Handle offline/online status
        window.addEventListener("online", function () {
            ToastManager.success("✅ Back online! Data is syncing...", 3000);
        });

        window.addEventListener("offline", function () {
            ToastManager.warning("📡 You are offline. Limited functionality available.", 0);
        });
        window.addEventListener("error", function (ev) {
            try {
                console.error("Captured error:", ev.message, ev.filename, ev.lineno);
                // Show user-friendly error notification
                ToastManager.error(`⚠️ An error occurred. Please refresh the page if issues persist.`);
                if (typeof ga !== "undefined")
                    ga(
                        "send",
                        "event",
                        "JS Error",
                        ev.message,
                        ev.filename + ":" + ev.lineno,
                    );
            } catch (e) {
                /* silent */
            }
        });

        // Global Metric Modal Functions
        window.showSportsMetricDetails = function (metricName, element) {
            const metricValue = element
                ? element.querySelector(".pred-stat-value").textContent
                : "-";
            const modal = document.getElementById("sportsMetricModal");
            const title = document.getElementById("sportsMetricModalTitle");
            const content = document.getElementById("sportsMetricModalContent");

            title.textContent = metricName;

            const explanations = {
                "Total Bets":
                    "Total number of bets placed. Track your betting volume and activity level over time.",
                "Avg Confidence":
                    "Average AI confidence score (0-100%). Higher scores indicate more reliable predictions based on historical data patterns.",
                "Highest Odds":
                    "Maximum odds selected in your bets. Higher odds mean higher potential returns but greater risk.",
                "Lowest Odds":
                    "Minimum odds selected. Lower odds typically indicate safer bets with higher probability of winning.",
                "Average Odds":
                    "Mean odds across all bets. Helps assess your risk appetite and betting strategy.",
                "Win Rate":
                    "Percentage of successful bets. Industry standard is 50-60% for profitable betting.",
                ROI: "Return on Investment: (Total Profit / Total Stake) × 100%. Measures profitability efficiency.",
                Yield:
                    "Profit percentage per bet. Long-term sustainable yield is 5-15% in professional betting.",
                "Longest Streak":
                    "Maximum consecutive wins. Helps understand maximum winning potential.",
                "Current Streak":
                    "Ongoing sequence of wins/losses. Monitor for momentum tracking.",
                "Total Profit":
                    "Net profit/loss in euros. Primary indicator of betting success.",
            };

            content.innerHTML = `
                  <div class="metric-value">${metricValue}</div>
                  <p>${explanations[metricName] || "Detailed analytics for this performance metric."}</p>
                <p class="metric-howto">
                      <strong>How to use:</strong> Click on any match card for detailed breakdown of team statistics, form, and betting rationale.
                  </p>
              `;
            modal.style.display = "flex";
        };

        window.closeSportsMetricModal = function () {
            document.getElementById("sportsMetricModal").style.display = "none";
        };

        // Match Card Click Handler - Shows details and provides feedback
        window.showMatchDetails = function (event, element) {
            event.stopPropagation();
            try {
                const card = element.closest(".prediction-card, .pred-prediction-card");
                if (!card) {
                    ToastManager.info("📊 Match details loading...");
                    return;
                }

                const matchText = card.querySelector(".team, .pred-team")?.textContent || "Match";
                const modal = document.getElementById("matchDetailsModal");

                // Create modal if it doesn't exist
                if (!modal) {
                    const newModal = document.createElement("div");
                    newModal.id = "matchDetailsModal";
                    newModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
              `;
                    newModal.innerHTML = `
                <div style="background: var(--bg-medium); padding: 12px; border-radius: 8px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                  <button onclick="this.parentElement.parentElement.style.display='none'" style="float:right; background:none; border:none; font-size:24px; cursor:pointer; color:var(--accent);">&times;</button>
                  <div id="matchDetailsContent"></div>
                </div>
              `;
                    document.body.appendChild(newModal);
                }

                const contentDiv = document.getElementById("matchDetailsContent");
                contentDiv.innerHTML = card.innerHTML;
                document.getElementById("matchDetailsModal").style.display = "flex";
                ToastManager.success(`📋 ${matchText} details loaded`, 2000);
            } catch (e) {
                console.error("Match details error:", e);
                ToastManager.error("❌ Could not load match details");
            }
        };

        window.closeMatchDetailsModal = function () {
            const modal = document.getElementById("matchDetailsModal");
            if (modal) modal.style.display = "none";
        };

        window.showSystem2MetricDetails = function (metricName, element) {
            const metricValue = element
                ? element.querySelector(".stat-value").textContent
                : "-";
            const modal = document.getElementById("system2MetricModal");
            const title = document.getElementById("system2MetricModalTitle");
            const content = document.getElementById("system2MetricModalContent");

            title.textContent = metricName;

            const explanations = {
                "Total Bets":
                    "Total number of bets placed. Track your betting volume and activity level over time.",
                "Avg Confidence":
                    "Average AI confidence score (0-100%). Higher scores indicate more reliable predictions based on historical data patterns.",
                "Highest Odds":
                    "Maximum odds selected in your bets. Higher odds mean higher potential returns but greater risk.",
                "Lowest Odds":
                    "Minimum odds selected. Lower odds typically indicate safer bets with higher probability of winning.",
                "Average Odds":
                    "Mean odds across all bets. Helps assess your risk appetite and betting strategy.",
                "Win Rate":
                    "Percentage of successful bets. Industry standard is 50-60% for profitable betting.",
                ROI: "Return on Investment: (Total Profit / Total Stake) × 100%. Measures profitability efficiency.",
                Yield:
                    "Profit percentage per bet. Long-term sustainable yield is 5-15% in professional betting.",
                "Longest Streak":
                    "Maximum consecutive wins. Helps understand maximum winning potential.",
                "Current Streak":
                    "Ongoing sequence of wins/losses. Monitor for momentum tracking.",
                "Total Profit":
                    "Net profit/loss in euros. Primary indicator of betting success.",
            };

            content.innerHTML = `
                  <div class="metric-value">${metricValue}</div>
                  <p>${explanations[metricName] || "Detailed analytics for this performance metric."}</p>
                <p class="metric-howto">
                      <strong>How to use:</strong> Click on any match card for detailed breakdown of team statistics, form, and betting rationale.
                  </p>
              `;
            modal.style.display = "flex";
        };

        window.closeSystem2MetricModal = function () {
            document.getElementById("system2MetricModal").style.display = "none";
        };

        // FIXED: Preview Modal Functions for both Value Picks and Top Picks
        window.showSportsPreview = function () {
            const modal = document.getElementById("sportsPreviewModal");
            const predictionsContainer = document.getElementById(
                "sports-predictions-container",
            );

            // Get today's date in format: Weekday, Month Day, Year
            const today = new Date();
            const options = {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
            };
            const todayFormatted = today.toLocaleDateString("en-US", options);

            // Get ALL prediction cards
            const allCards = predictionsContainer.querySelectorAll(
                ".pred-prediction-card",
            );
            let todayCard = null;

            // Look through all cards to find today's match
            for (let card of allCards) {
                const cardDateElement = card.querySelector(".pred-date");
                if (!cardDateElement) continue;

                const cardDateText = cardDateElement.textContent.trim();

                // Direct string comparison - more reliable than includes()
                if (cardDateText === todayFormatted) {
                    todayCard = card;
                    break;
                }
            }

            if (todayCard) {
                // Found today's match - compress display
                document.getElementById("sportsPreviewContent").innerHTML = `
                  <div class="prediction-card preview-card">
                          ${todayCard.innerHTML}
                      </div>
                  <p class="preview-footer-note">
                          Get daily access to all premium picks.
                      </p>
                  `;
            } else if (allCards.length > 0) {
                // No match today, show the most recent match
                const firstCard = allCards[0];
                document.getElementById("sportsPreviewContent").innerHTML = `
                  <div class="preview-header recent">
                          No match for today. Showing recent match:
                  </div>
                  <div class="prediction-card preview-card">
                          ${firstCard.innerHTML}
                      </div>
                  <p class="preview-footer-note">
                          Get daily access to all premium picks.
                      </p>
                  `;
            } else {
                // No matches found at all
                document.getElementById("sportsPreviewContent").innerHTML = `
                  <div class="preview-empty">
                    <p>⚽ Loading today's tips...</p>
                    <p class="preview-empty-note">Please wait while we fetch data.</p>
                      </div>
                  `;
            }

            modal.style.display = "flex";
            // Track preview engagement
            if (typeof ga !== "undefined") {
                ga("send", "event", "Preview", "click", "sports_preview");
            }
        };

        window.closeSportsPreviewModal = function () {
            document.getElementById("sportsPreviewModal").style.display = "none";
        };

        window.showSystem2Preview = function () {
            const modal = document.getElementById("system2PreviewModal");
            const predictionsContainer = document.getElementById(
                "system2-predictions-container",
            );

            // Get today's date in format: Weekday, Month Day, Year
            const today = new Date();
            const options = {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
            };
            const todayFormatted = today.toLocaleDateString("en-US", options);

            // Get ALL prediction cards
            const allCards =
                predictionsContainer.querySelectorAll(".prediction-card");
            let todayCard = null;

            // Look through all cards to find today's match
            for (let card of allCards) {
                const cardDateElement = card.querySelector(".date");
                if (!cardDateElement) continue;

                const cardDateText = cardDateElement.textContent.trim();

                // Direct string comparison - more reliable than includes()
                if (cardDateText === todayFormatted) {
                    todayCard = card;
                    break;
                }
            }

            if (todayCard) {
                // Found today's match - compress display
                document.getElementById("system2PreviewContent").innerHTML = `
                  <div class="prediction-card preview-card">
                          ${todayCard.innerHTML}
                      </div>
                  <p class="preview-footer-note">
                          Get daily access to all premium picks.
                      </p>
                  `;
            } else if (allCards.length > 0) {
                // No match today, show the most recent match
                const firstCard = allCards[0];
                document.getElementById("system2PreviewContent").innerHTML = `
                  <div class="preview-header recent">
                          No match for today. Showing recent match:
                  </div>
                  <div class="prediction-card preview-card">
                          ${firstCard.innerHTML}
                      </div>
                  <p class="preview-footer-note">
                          Get daily access to all premium picks.
                      </p>
                  `;
            } else {
                // No matches found at all
                document.getElementById("system2PreviewContent").innerHTML = `
                  <div class="preview-empty">
                    <p>⚽ Loading today's top picks...</p>
                    <p class="preview-empty-note">Please wait while we fetch data.</p>
                      </div>
                  `;
            }

            modal.style.display = "flex";
            // Track preview engagement
            if (typeof ga !== "undefined") {
                ga("send", "event", "Preview", "click", "system2_preview");
            }
        };

        window.closeSystem2PreviewModal = function () {
            document.getElementById("system2PreviewModal").style.display = "none";
        };

        // InPlay (Expert Picks) Preview Modal Functions
        window.showInPlayPreview = function () {
            const modal = document.getElementById("inplayPreviewModal");
            const inplayContainer = document.querySelector(
                "#inplay .ma-tablesContainer",
            );

            if (!inplayContainer) {
                console.error("InPlay container not found");
                alert("Please wait for the Expert Picks data to load first!");
                return;
            }

            // Get today's date
            const today = new Date();
            const todayStr = today.toISOString().split("T")[0]; // Format: YYYY-MM-DD
            console.log("Looking for matches on:", todayStr);

            // Get all matches from new card-based structure
            const allRows = inplayContainer.querySelectorAll(".inplay-match-row");
            console.log("Total rows found:", allRows.length);

            let singlesMatches = [];
            let doublesMatches = [];
            let allRecentMatches = []; // Store all matches for fallback

            // Extract matches from card structure
            allRows.forEach((row, index) => {
                const dateEl = row.querySelector(".inplay-date");
                if (!dateEl) return;

                const dateText = dateEl.textContent.trim();
                const teamEls = row.querySelectorAll(".inplay-team");
                const oddsEl = row.querySelector(".inplay-odds");
                const trustEl = row.querySelector(".inplay-h2h-badge");

                // Extract full team names for display
                let matchName = "N/A";
                if (teamEls.length >= 2) {
                    const team1 = row.dataset.team1 || teamEls[0].querySelector(".inplay-team-logo")?.nextSibling?.textContent?.trim() || teamEls[0].textContent.trim();
                    const team2 = row.dataset.team2 || teamEls[1].querySelector(".inplay-team-logo")?.nextSibling?.textContent?.trim() || teamEls[1].textContent.trim();
                    matchName = `${team1} vs ${team2}`;
                }

                // Try to extract league info (if available in future data)
                let league = null;
                const monthHeader = row.previousElementSibling?.classList.contains('inplay-month-header')
                    ? row.previousElementSibling : null;
                if (monthHeader) {
                    league = null; // Placeholder for future league extraction
                }

                const matchData = {
                    match: matchName,
                    league: league,
                    pick: "Under 2.5", // Default pick for Expert Picks
                    odds: oddsEl ? oddsEl.textContent.trim() : "N/A",
                    trust: trustEl ? trustEl.textContent.replace("Trust:", "").trim() : "N/A",
                    date: dateText,
                    rawDate: dateText, // Store original for debugging
                };

                // Log first few matches for debugging
                if (index < 3) {
                    console.log(`Row ${index} date:`, dateText);
                }

                // Store all matches for fallback
                allRecentMatches.push(matchData);

                // Check if this is today's match (try multiple date formats)
                const isToday = dateText.includes(todayStr) ||
                    dateText === todayStr ||
                    dateText.startsWith(todayStr);

                if (isToday) {
                    console.log("Found today's match:", matchData);
                    singlesMatches.push(matchData);
                    doublesMatches.push(matchData);
                }
            });

            // If no today matches found, use most recent matches
            const hasToday = singlesMatches.length > 0;
            if (!hasToday && allRecentMatches.length > 0) {
                console.log("No today matches, showing recent matches");
                singlesMatches = allRecentMatches.slice(0, 1); // Singles: only 1 match
                doublesMatches = allRecentMatches.slice(0, 5); // Doubles: up to 5
            } else {
                // Limit singles to 1 match, doubles to all
                singlesMatches = singlesMatches.slice(0, 1);
            }

            console.log("Singles matches:", singlesMatches.length);
            console.log("Doubles matches:", doublesMatches.length);

            // Generate HTML for matches
            const generateMatchesHTML = (matches, showingRecent, isSingles = false) => {
                if (matches.length === 0) {
                    return `
                <div class="preview-empty">
                  <p>No matches available yet.</p>
                  <p class="preview-empty-note">Please wait for data to load or check back later.</p>
                </div>
              `;
                }

                const headerText = showingRecent
                    ? `<div class="preview-header recent">
                  ⚠️ No matches today. Showing recent ${isSingles ? 'match' : 'matches'}:
                </div>`
                    : `<div class="preview-header today">
                  🎯 Today's ${isSingles ? 'Single Match' : 'Matches'}
                </div>`;

                return headerText + matches
                    .map(
                        (m) => `
              <div class="prediction-card preview-card">
                <div class="preview-date">${m.date}</div>
                ${m.league ? `<div class="preview-league">🏆 ${m.league}</div>` : ''}
                <div class="preview-match">${m.match}</div>
                <div class="preview-meta">
                  <span class="preview-chip pick">📊 ${m.pick}</span>
                  <span class="preview-chip odds">💰 ${m.odds}</span>
                  <span class="preview-chip trust">✅ ${m.trust}</span>
                </div>
              </div>
            `,
                    )
                    .join("");
            };

            // Set initial content (doubles by default)
            document.getElementById("inplayPreviewContent").innerHTML = generateMatchesHTML(doublesMatches, !hasToday, false);

            // Store matches for tab switching
            modal.singlesMatches = singlesMatches;
            modal.doublesMatches = doublesMatches;
            modal.hasToday = hasToday;

            modal.style.display = "flex";

            // Track preview engagement
            if (typeof ga !== "undefined") {
                ga("send", "event", "Preview", "click", "inplay_preview");
            }
        };

        window.closeInPlayPreviewModal = function () {
            document.getElementById("inplayPreviewModal").style.display = "none";
        };

        window.closeInPlay2PreviewModal = function () {
            document.getElementById("inplay2PreviewModal").style.display = "none";
        };

        window.switchInPlay2PreviewTab = function (tabType) {
            const modal = document.getElementById("inplay2PreviewModal");
            const content = document.getElementById("inplay2PreviewContent");

            // Update button states
            document.querySelectorAll(".inplay2-preview-tab").forEach((btn) => {
                btn.classList.remove("active");
            });
            document.querySelector(`[data-preview2-tab="${tabType}"]`).classList.add("active");

            // Generate new content
            const matches = tabType === "singles" ? modal.singlesMatches : modal.doublesMatches;
            const hasToday = modal.hasToday || false;
            const isSingles = tabType === "singles";
            const today = new Date();
            const todayStr = today.toISOString().split("T")[0];

            const generateMatchesHTML = (matches, showingRecent, isSingles) => {
                if (matches.length === 0) {
                    return `
                <div class="preview-empty">
                  <p>No matches available yet.</p>
                  <p class="preview-empty-note">Please wait for data to load or check back later.</p>
                </div>
              `;
                }

                const headerText = showingRecent
                    ? `<div class="preview-header recent">
                  ⚠️ No matches today. Showing recent ${isSingles ? 'match' : 'matches'}:
                </div>`
                    : `<div class="preview-header today">
                  🎯 Today's ${isSingles ? 'Single Match' : 'Matches'}
                </div>`;

                return headerText + matches
                    .map(
                        (m) => `
              <div class="prediction-card preview-card">
                <div class="preview-date">${m.date}</div>
                <div class="preview-match">${m.match}</div>
                <div class="preview-meta">
                  <span class="preview-chip pick">📊 ${m.pick}</span>
                  <span class="preview-chip odds">💰 ${m.odds}</span>
                  <span class="preview-chip trust">✅ ${m.trust}</span>
                </div>
              </div>
            `,
                    )
                    .join("");
            };

            content.innerHTML = generateMatchesHTML(matches, !hasToday, isSingles);
        };

        // InPlay2 (Elite Picks) Preview Modal Functions
        window.showInPlay2Preview = function () {
            const modal = document.getElementById("inplay2PreviewModal");
            const inplay2Container = document.getElementById("ma-tablesContainer");

            if (!inplay2Container) {
                console.error("InPlay2 container not found");
                alert("Please wait for the Elite Picks data to load first!");
                return;
            }

            // Get today's date
            const today = new Date();
            const todayStr = today.toISOString().split("T")[0]; // Format: YYYY-MM-DD
            console.log("Looking for Elite Picks matches on:", todayStr);

            // Get all matches from new card-based structure
            const allRows = inplay2Container.querySelectorAll(".inplay2-match-row");
            console.log("Total Elite rows found:", allRows.length);

            let singlesMatches = [];
            let doublesMatches = [];
            let allRecentMatches = []; // Store all matches for fallback

            // Extract matches from card structure
            allRows.forEach((row, index) => {
                const dateEl = row.querySelector(".inplay2-date");
                if (!dateEl) return;

                const dateText = dateEl.textContent.trim();
                const teamEls = row.querySelectorAll(".inplay2-team");
                const oddsEl = row.querySelector(".inplay2-odds");
                const trustEl = row.querySelector(".inplay2-h2h-badge");

                // Extract full team names for display
                let matchName = "N/A";
                if (teamEls.length >= 2) {
                    const team1 = row.dataset.team1 || teamEls[0].querySelector(".inplay2-team-logo")?.nextSibling?.textContent?.trim() || teamEls[0].textContent.trim();
                    const team2 = row.dataset.team2 || teamEls[1].querySelector(".inplay2-team-logo")?.nextSibling?.textContent?.trim() || teamEls[1].textContent.trim();
                    matchName = `${team1} vs ${team2}`;
                }

                // Try to extract league info (if available in future data)
                let league = null;
                const monthHeader = row.previousElementSibling?.classList.contains('inplay2-month-header')
                    ? row.previousElementSibling : null;
                if (monthHeader) {
                    league = null; // Placeholder for future league extraction
                }

                const matchData = {
                    match: matchName,
                    league: league,
                    pick: "Under 2.5", // Default pick for Elite Picks
                    odds: oddsEl ? oddsEl.textContent.trim() : "N/A",
                    trust: trustEl ? trustEl.textContent.replace("Trust:", "").trim() : "N/A",
                    date: dateText,
                    rawDate: dateText,
                };

                // Log first few matches for debugging
                if (index < 3) {
                    console.log(`Elite Row ${index} date:`, dateText);
                }

                // Store all matches for fallback
                allRecentMatches.push(matchData);

                // Check if this is today's match
                const isToday = dateText.includes(todayStr) ||
                    dateText === todayStr ||
                    dateText.startsWith(todayStr);

                if (isToday) {
                    console.log("Found today's Elite match:", matchData);
                    singlesMatches.push(matchData);
                    doublesMatches.push(matchData);
                }
            });

            // If no today matches found, use most recent matches
            const hasToday = singlesMatches.length > 0;
            if (!hasToday && allRecentMatches.length > 0) {
                console.log("No today matches, showing recent Elite matches");
                singlesMatches = allRecentMatches.slice(0, 1); // Singles: only 1 match
                doublesMatches = allRecentMatches.slice(0, 5); // Doubles: up to 5
            } else {
                // Limit singles to 1 match, doubles to all
                singlesMatches = singlesMatches.slice(0, 1);
            }

            console.log("Elite Singles matches:", singlesMatches.length);
            console.log("Elite Doubles matches:", doublesMatches.length);

            // Generate HTML for matches
            const generateMatchesHTML = (matches, showingRecent, isSingles = false) => {
                if (matches.length === 0) {
                    return `
                <div class="preview-empty">
                  <p>No matches available yet.</p>
                  <p class="preview-empty-note">Please wait for data to load or check back later.</p>
                </div>
              `;
                }

                const headerText = showingRecent
                    ? `<div class="preview-header recent">
                  ⚠️ No matches today. Showing recent ${isSingles ? 'match' : 'matches'}:
                </div>`
                    : `<div class="preview-header today">
                  🎯 Today's ${isSingles ? 'Single Match' : 'Matches'}
                </div>`;

                return headerText + matches
                    .map(
                        (m) => `
              <div class="prediction-card preview-card">
                <div class="preview-date">${m.date}</div>
                ${m.league ? `<div class="preview-league">🏆 ${m.league}</div>` : ''}
                <div class="preview-match">${m.match}</div>
                <div class="preview-meta">
                  <span class="preview-chip pick">📊 ${m.pick}</span>
                  <span class="preview-chip odds">💰 ${m.odds}</span>
                  <span class="preview-chip trust">✅ ${m.trust}</span>
                </div>
              </div>
            `,
                    )
                    .join("");
            };

            // Set initial content (doubles by default)
            document.getElementById("inplay2PreviewContent").innerHTML = generateMatchesHTML(doublesMatches, !hasToday, false);

            // Store matches for tab switching
            modal.singlesMatches = singlesMatches;
            modal.doublesMatches = doublesMatches;
            modal.hasToday = hasToday;

            modal.style.display = "flex";

            // Track preview engagement
            if (typeof ga !== "undefined") {
                ga("send", "event", "Preview", "click", "inplay2_preview");
            }
        };

        window.switchInPlayPreviewTab = function (tabType) {
            const modal = document.getElementById("inplayPreviewModal");
            const content = document.getElementById("inplayPreviewContent");

            // Update button states
            document.querySelectorAll(".inplay-preview-tab").forEach((btn) => {
                btn.classList.remove("active");
            });
            document.querySelector(`[data-preview-tab="${tabType}"]`).classList.add("active");

            // Generate new content
            const matches = tabType === "singles" ? modal.singlesMatches : modal.doublesMatches;
            const hasToday = modal.hasToday || false;
            const isSingles = tabType === "singles";
            const today = new Date();
            const todayStr = today.toISOString().split("T")[0];

            const generateMatchesHTML = (matches, showingRecent, isSingles) => {
                if (matches.length === 0) {
                    return `
                <div class="preview-empty">
                  <p>No matches available yet.</p>
                  <p class="preview-empty-note">Please wait for data to load or check back later.</p>
                </div>
              `;
                }

                const headerText = showingRecent
                    ? `<div class="preview-header recent">
                  ⚠️ No matches today. Showing recent ${isSingles ? 'match' : 'matches'}:
                </div>`
                    : `<div class="preview-header today">
                  🎯 Today's ${isSingles ? 'Single Match' : 'Matches'}
                </div>`;

                return headerText + matches
                    .map(
                        (m) => `
              <div class="prediction-card preview-card">
                <div class="preview-date">${m.date}</div>
                <div class="preview-match">${m.match}</div>
                <div class="preview-meta">
                  <span class="preview-chip pick">📊 ${m.pick}</span>
                  <span class="preview-chip odds">💰 ${m.odds}</span>
                  <span class="preview-chip trust">✅ ${m.trust}</span>
                </div>
              </div>
            `,
                    )
                    .join("");
            };

            content.innerHTML = generateMatchesHTML(matches, !hasToday, isSingles);
        };

        // Close modals when clicking outside
        window.onclick = function (event) {
            const sportsMetricModal = document.getElementById("sportsMetricModal");
            const system2MetricModal =
                document.getElementById("system2MetricModal");
            const sportsPreviewModal =
                document.getElementById("sportsPreviewModal");
            const system2PreviewModal = document.getElementById(
                "system2PreviewModal",
            );
            const inplayPreviewModal = document.getElementById(
                "inplayPreviewModal",
            );
            const inplay2PreviewModal = document.getElementById(
                "inplay2PreviewModal",
            );
            const trialModal = document.getElementById("trialModal");

            if (event.target == sportsMetricModal) closeSportsMetricModal();
            if (event.target == system2MetricModal) closeSystem2MetricModal();
            if (event.target == sportsPreviewModal) closeSportsPreviewModal();
            if (event.target == system2PreviewModal) closeSystem2PreviewModal();
            if (event.target == inplayPreviewModal) closeInPlayPreviewModal();
            if (event.target == inplay2PreviewModal) closeInPlay2PreviewModal();
            if (event.target == trialModal) closeTrialModal();
        };
    

        (function () {
            const storageKey = "betadvisor_promo_closed";

            const hidePromoBar = () => {
                const promoBar = document.getElementById("promoStickyBar");
                if (!promoBar || promoBar.classList.contains("is-hidden")) return;
                promoBar.classList.add("is-hidden");
                localStorage.setItem(storageKey, "1");
                window.dispatchEvent(new Event("resize"));
            };

            window.closePromoStickyBar = hidePromoBar;

            InitializationManager.init(function () {
                const promoBar = document.getElementById("promoStickyBar");
                if (!promoBar) return;

                if (localStorage.getItem(storageKey) === "1") {
                    hidePromoBar();
                    return;
                }

                const onScrollHide = () => {
                    if (window.scrollY > 16) {
                        hidePromoBar();
                        window.removeEventListener("scroll", onScrollHide);
                    }
                };

                window.addEventListener("scroll", onScrollHide, { passive: true });
            });
        })();
    

                        // ---------- CONFIGURATION ----------
                        const BAC_API_URL =
                            "https://fire-6t2w.onrender.com/api/check-membership";
                        const BAC_PLAY_BILLING_METHOD = "https://play.google.com/billing";
                        const BAC_PLAY_PRODUCT_ID = "1";
                        window.bacPlayBillingEligible = false;

                        // ---------- HELPERS ----------
                        const getEmailPrefix = (email) => email.split("@")[0];
                        const personalLink = (email) =>
                            `https://vip.betadvisor.club/${getEmailPrefix(email)}`;

                        async function bacCheckPlayBillingEligibility() {
                            if (
                                !window.PaymentRequest ||
                                !("getDigitalGoodsService" in PaymentRequest.prototype)
                            ) {
                                return false;
                            }

                            try {
                                const paymentRequest = new PaymentRequest(
                                    [{ supportedMethods: BAC_PLAY_BILLING_METHOD }],
                                    {
                                        total: {
                                            label: "Monthly Membership",
                                            amount: { currency: "SEK", value: "0" },
                                        },
                                    },
                                );

                                const service = await paymentRequest.getDigitalGoodsService();
                                if (!service) return false;

                                let goods = [];
                                if (typeof service.getDetails === "function") {
                                    goods = await service.getDetails([BAC_PLAY_PRODUCT_ID]);
                                } else if (typeof service.getDigitalGoods === "function") {
                                    goods = await service.getDigitalGoods({ productIds: [BAC_PLAY_PRODUCT_ID] });
                                }

                                return Array.isArray(goods) && goods.length > 0;
                            } catch (error) {
                                console.log("Play Billing unavailable:", error?.message || error);
                                return false;
                            }
                        }

                        function bacUpdatePlayBillingVisibility(root = document) {
                            const playVisible = window.bacPlayBillingEligible === true;

                            root.querySelectorAll(".bac-btn-play").forEach((btn) => {
                                btn.style.display = playVisible ? "inline-flex" : "none";
                            });

                            const vipPlayBtn = document.getElementById("vip-play-subscribe-btn");
                            if (vipPlayBtn) vipPlayBtn.style.display = playVisible ? "inline-flex" : "none";
                        }

                        async function bacInitiatePlaySubscription(productId = BAC_PLAY_PRODUCT_ID) {
                            if (!window.PaymentRequest) {
                                throw new Error("Play Billing not supported on this device/browser");
                            }

                            const paymentRequest = new PaymentRequest(
                                [{ supportedMethods: BAC_PLAY_BILLING_METHOD }],
                                {
                                    total: {
                                        label: "Monthly Membership",
                                        amount: { currency: "SEK", value: "0" },
                                    },
                                },
                            );

                            if (typeof paymentRequest.canMakePayment === "function") {
                                const canMakePayment = await paymentRequest.canMakePayment();
                                if (canMakePayment === false) {
                                    throw new Error("Play Billing is unavailable for this account/device");
                                }
                            }

                            const service = await paymentRequest.getDigitalGoodsService();
                            if (!service) {
                                throw new Error("Digital Goods service unavailable");
                            }

                            let products = [];
                            if (typeof service.getDetails === "function") {
                                products = await service.getDetails([productId]);
                            } else if (typeof service.getDigitalGoods === "function") {
                                products = await service.getDigitalGoods({ productIds: [productId] });
                            }

                            if (!Array.isArray(products) || products.length === 0) {
                                throw new Error("Subscription product is not available");
                            }

                            const product = products[0];

                            if (typeof service.createDigitalGoodsOrder === "function") {
                                await service.createDigitalGoodsOrder(product);
                            }

                            const paymentResponse = await paymentRequest.show();
                            await paymentResponse.complete("success");
                            return { product, paymentResponse };
                        }

                        async function bacStartPlaySubscription(event) {
                            if (event) event.preventDefault();

                            if (!window.bacPlayBillingEligible) {
                                bacOpenModal(
                                    "Google Play Unavailable",
                                    `<p>Google Play billing is not available on this device or browser.</p>
                       <p>Please use M-Pesa or Gumroad to complete your subscription.</p>`,
                                );
                                return false;
                            }

                            try {
                                const result = await bacInitiatePlaySubscription(BAC_PLAY_PRODUCT_ID);
                                console.log("Play Billing purchase successful:", result);
                                alert(
                                    "✅ Purchase flow completed. Your access will be activated after server verification.",
                                );
                                return false;
                            } catch (error) {
                                console.error("Play Billing error:", error);
                                bacOpenModal(
                                    "Google Play Error",
                                    `<p>Google Play checkout could not be completed.</p>
                       <p>Please use M-Pesa or Gumroad to complete your subscription.</p>`,
                                );
                                return false;
                            }
                        }

                        window.bacStartPlaySubscription = bacStartPlaySubscription;

                        // ---------- MODAL CONTROLS ----------
                        window.bacOpenModal = function (title, detailsHtml, onRender) {
                            const modal = document.getElementById("bac-payment-modal");
                            const content = document.getElementById("bac-modal-content");
                            content.innerHTML = `
        <div class="bac-modal-title">${title}</div>
        <div class="bac-modal-detail">${detailsHtml}</div>
        <div class="bac-modal-footer">
          <button class="bac-btn-modal" onclick="bacCloseModal()">Got it</button>
        </div>
      `;
                            modal.style.display = "flex";
                            // Execute callback after content is rendered (for scripts)
                            if (onRender && typeof onRender === 'function') {
                                setTimeout(() => onRender(), 100);
                            }
                        };
                        window.bacCloseModal = function () {
                            document.getElementById("bac-payment-modal").style.display =
                                "none";
                        };

                        // ---------- ATTACH MODAL HANDLERS ----------
                        function bacAttachModalHandlers() {
                            window.bacOpenMpesaModal = function (event) {
                                if (event) event.preventDefault();
                                bacOpenModal(
                                    "📱 M-Pesa Payment",
                                    `<p class="bac-mpesa-title">Lipa Na M-Pesa</p>
            <p class="bac-mpesa-box">
              Paybill: <strong id="mpesa-paybill" class="bac-copy-chip" onclick="copyToClipboard('247247', 'Paybill')" title="Click to copy">247247</strong><br>
              Account: <strong id="mpesa-account" class="bac-copy-chip" onclick="copyToClipboard('480949', 'Account')" title="Click to copy">480949</strong>
            </p>
            <p class="bac-mpesa-hint">💡 Tap paybill or account number to copy</p>
            <p class="bac-mpesa-amount">💰 Amount: <strong>$24.99</strong> (KES equivalent).</p>`,
                                );
                                return false;
                            };

                            document.querySelectorAll(".bac-btn-mpesa").forEach((btn) => {
                                btn.addEventListener("click", window.bacOpenMpesaModal);
                            });

                            document.querySelectorAll(".bac-btn-play").forEach((btn) => {
                                btn.addEventListener("click", bacStartPlaySubscription);
                            });

                            // Copy to clipboard function
                            window.copyToClipboard = function (text, label) {
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                    navigator.clipboard.writeText(text).then(() => {
                                        // Show success feedback
                                        const feedback = document.createElement('div');
                                        feedback.textContent = `✅ ${label} copied: ${text}`;
                                        feedback.className = 'copy-feedback-toast';
                                        document.body.appendChild(feedback);
                                        setTimeout(() => {
                                            feedback.style.opacity = '0';
                                            setTimeout(() => feedback.remove(), 300);
                                        }, 2000);
                                    }).catch(() => {
                                        alert(`${label} number: ${text}`);
                                    });
                                } else {
                                    // Fallback for older browsers
                                    const textArea = document.createElement('textarea');
                                    textArea.value = text;
                                    textArea.style.position = 'fixed';
                                    textArea.style.opacity = '0';
                                    document.body.appendChild(textArea);
                                    textArea.select();
                                    try {
                                        document.execCommand('copy');
                                        alert(`✅ ${label} copied: ${text}`);
                                    } catch (err) {
                                        alert(`${label} number: ${text}`);
                                    }
                                    document.body.removeChild(textArea);
                                }
                            };
                        }

                        // ---------- EMAIL MEMORY FOR RETRY ----------
                        let lastAttemptedEmail = "";

                        window.bacShowFormAndReset = function () {
                            document.getElementById("bac-form-container").style.display =
                                "block";
                            document.getElementById("bac-membership-result").innerHTML = "";
                            document.getElementById("subbox-email-ihy").value = "";
                            document.getElementById("subbox-email-ihy").focus();
                        };

                        // ---------- RETRY WITH STORED EMAIL (KEEPS EMAIL ON RETRY) ----------
                        window.bacRetryWithLastEmail = async function () {
                            if (!lastAttemptedEmail) {
                                bacShowFormAndReset();
                                return;
                            }

                            const resultDiv = document.getElementById("bac-membership-result");
                            const emailInput = document.getElementById("subbox-email-ihy");

                            // Restore email to field
                            emailInput.value = lastAttemptedEmail;

                            // Show retrying state
                            resultDiv.innerHTML = `
                    <div style="text-align:center; padding:20px;">
                      <div class="bac-loading"><span class="bac-spinner"></span> Retrying with ${lastAttemptedEmail}...</div>
                    </div>
                  `;

                            // Call the membership check directly with stored email
                            const form = document.querySelector("form");
                            await bacCheckMembership({ preventDefault: () => { } });
                        };

                        // ---------- MAIN MEMBERSHIP CHECK (with exact premium detection) ----------
                        async function bacCheckMembership(event) {
                            if (event && event.preventDefault) {
                                event.preventDefault();
                            }

                            const emailInput = document.getElementById("subbox-email-ihy");
                            const email = emailInput.value.trim();
                            const resultDiv = document.getElementById(
                                "bac-membership-result",
                            );
                            const formContainer =
                                document.getElementById("bac-form-container");

                            // Store email for retry
                            lastAttemptedEmail = email;

                            if (!email || !email.includes("@")) {
                                resultDiv.innerHTML =
                                    '<div class="bac-error">Please enter a valid email address</div>';
                                return;
                            }

                            resultDiv.innerHTML =
                                '<div class="bac-loading"><span class="bac-spinner"></span> Checking membership...</div>';

                            try {
                                const controller = new AbortController();
                                const timeout = setTimeout(() => controller.abort(), 8000);

                                const response = await fetch(
                                    `${BAC_API_URL}?email=${encodeURIComponent(email)}`,
                                    { signal: controller.signal },
                                );
                                clearTimeout(timeout);
                                const data = await response.json();

                                if (!response.ok) {
                                    throw new Error(data.error || "Failed to check membership");
                                }

                                // ----- PREMIUM DETECTION (exact match with your DB) -----
                                const isMember = data.member_found === true;
                                const isActive = data.subscription_active === true;
                                // Your database sends "plan":"premium" and is_active_status:1
                                const isPremium =
                                    data.plan === "premium" ||
                                    data.is_premium === true ||
                                    false;

                                let html = "";

                                // ---------- CASE 1: NEW MEMBER (no record) ----------
                                if (!isMember) {
                                    html = `
            <div class="bac-card">
              <span class="bac-badge bac-badge-new">🎉 New Member</span>
              <div class="bac-message">
                <h3>Welcome to BetAdvisor Club</h3>
                <p>Your personal login link will be sent to <span class="bac-email-highlight">${email}</span>.</p>
                <a href="${personalLink(email)}" class="bac-btn">➡️ Proceed to Personal Link</a>
              </div>
              <div class="bac-payment-options">
                <h4>✨ 80% Welcome Discount</h4>
                <div class="bac-price">$24.99 <span class="original">$124.95</span> <span class="bac-discount">80% OFF</span></div>
                <p class="bac-payment-duration">30 days full premium access</p>
                <div class="bac-payment-actions">
                  <a href="#" class="bac-btn-payment bac-btn-play">📱 Google Play</a>
                  <a href="#" class="bac-btn-payment bac-btn-mpesa">📱 M-Pesa</a>
                  <a href="https://924063661322.gumroad.com/l/ihygog?wanted=true&email=${encodeURIComponent(email)}" class="bac-btn-payment" target="_blank">🛒 Gumroad</a>
                </div>
              </div>
            </div>
          `;
                                }
                                // ---------- CASE 2: INACTIVE MEMBER ----------
                                else if (isMember && !isActive) {
                                    html = `
            <div class="bac-card">
              <span class="bac-badge bac-badge-inactive">👋 Welcome Back</span>
              <div class="bac-message">
                <h3>Your subscription is inactive</h3>
                <p>Reactivate now to regain full premium access.</p>
              </div>
              <div class="bac-payment-options">
                <h4>🔥 Reactivation Offer - 80% Off</h4>
                <div class="bac-price">$24.99 <span class="original">$124.95</span> <span class="bac-discount">80% OFF</span></div>
                <p class="bac-payment-duration">30 days full access</p>
                <div class="bac-payment-actions">
                  <a href="#" class="bac-btn-payment bac-btn-play">📱 Google Play</a>
                  <a href="#" class="bac-btn-payment bac-btn-mpesa">📱 M-Pesa</a>
                  <a href="https://924063661322.gumroad.com/l/ihygog?wanted=true&email=${encodeURIComponent(email)}" class="bac-btn-payment" target="_blank">🛒 Gumroad</a>
                </div>
              </div>
            </div>
          `;
                                }
                                // ---------- CASE 3: ACTIVE BUT NOT PREMIUM (upgrade) ----------
                                else if (isMember && isActive && !isPremium) {
                                    html = `
            <div class="bac-card">
              <span class="bac-badge bac-badge-upgrade">⭐ Upgrade to Premium</span>
              <div class="bac-message">
                <h3>Unlock VIP Predictions</h3>
                <p>Your current plan does not include premium features.</p>
              </div>
              <div class="bac-payment-options">
                <h4>🚀 Upgrade - 80% Off</h4>
                <div class="bac-price">$24.99 <span class="original">$124.95</span> <span class="bac-discount">80% OFF</span></div>
                <p class="bac-payment-duration">30 days premium access</p>
                <div class="bac-payment-actions">
                  <a href="#" class="bac-btn-payment bac-btn-play">📱 Google Play</a>
                  <a href="#" class="bac-btn-payment bac-btn-mpesa">📱 M-Pesa</a>
                  <a href="https://924063661322.gumroad.com/l/ihygog?wanted=true&email=${encodeURIComponent(email)}" class="bac-btn-payment" target="_blank">🛒 Gumroad</a>
                </div>
              </div>
            </div>
          `;
                                }
                                // ---------- CASE 4: ACTIVE PREMIUM MEMBER (YOUR DB CASE) ----------
                                else if (isMember && isActive && isPremium) {
                                    html = `
            <div class="bac-card">
              <span class="bac-badge bac-badge-active">✅ Premium Active</span>
              <div class="bac-message">
                <h3>Welcome back, VIP</h3>
                <p>Your premium subscription is active. All features are unlocked.</p>
              </div>
              <div class="bac-dashboard-card">
                <p>⚡ Today's premium predictions are ready</p>
                <a href="${personalLink(email)}" class="bac-dashboard-btn">🚀 Go to Dashboard</a>
              </div>
              <!-- NO PAYMENT OPTIONS, ONLY DASHBOARD LINK -->
            </div>
          `;
                                }

                                resultDiv.innerHTML = html;
                                bacAttachModalHandlers();
                                bacUpdatePlayBillingVisibility(resultDiv);
                                if (isMember && isActive && isPremium) {
                                    ToastManager.success("✅ Welcome back! Premium access active.", 3000);
                                } else if (!isMember) {
                                    ToastManager.info("🎉 New member! Check your email for the login link.", 4000);
                                }

                                // ---------- HIDE FORM & SHOW "CHECK ANOTHER" ----------
                                formContainer.style.display = "none";
                                if (!document.querySelector(".bac-check-another")) {
                                    const checkAnother = document.createElement("button");
                                    checkAnother.className = "bac-check-another";
                                    checkAnother.innerHTML = "↻ Check another email";
                                    checkAnother.onclick = function (e) {
                                        e.preventDefault();
                                        bacShowFormAndReset();
                                        this.remove();
                                    };
                                    resultDiv.appendChild(checkAnother);
                                }
                            } catch (error) {
                                console.error("Membership check error:", error);
                                let errorMsg = "Unable to check membership. Please try again.";
                                if (error.name === "AbortError") {
                                    errorMsg = "Server took too long to respond. Retrying...";
                                    ToastManager.error("⏱️ API Timeout - Retrying with your email...");
                                } else if (!navigator.onLine) {
                                    errorMsg = "No internet connection. Please check your network.";
                                    ToastManager.error("📡 No internet connection.");
                                } else {
                                    ToastManager.error("❌ " + error.message);
                                }
                                resultDiv.innerHTML = `
          <div class="bac-error">
            ${errorMsg}
            <br><button onclick="bacRetryWithLastEmail()" style="margin-top:10px; padding:8px 16px; background:var(--accent); color:var(--on-accent); border:none; border-radius:4px; cursor:pointer; font-weight:600; transition:all 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">↻ Retry with same email</button>
            <br><button onclick="bacShowFormAndReset()" style="margin-top:8px; padding:8px 16px; background:var(--bg-light); color:var(--text-light); border:1px solid var(--border-color); border-radius:4px; cursor:pointer; font-weight:600;">✎ Change email</button>
          </div>
        `;
                            }
                        }

                        // ---------- EVENT LISTENERS ----------
                        InitializationManager.init(function () {
                            const form = document.getElementById("subbox-form-ihy");
                            form.addEventListener("submit", bacCheckMembership);

                            const modal = document.getElementById("bac-payment-modal");
                            modal.addEventListener("click", function (e) {
                                if (e.target === modal) bacCloseModal();
                            });

                            document.getElementById("bac-form-container").style.display =
                                "block";

                            bacCheckPlayBillingEligibility().then((eligible) => {
                                window.bacPlayBillingEligible = eligible;
                                bacUpdatePlayBillingVisibility(document);
                            });
                        });
                    

            function headerState() {
                return {
                    screenWidth: window.innerWidth,
                    init() {
                        window.addEventListener("resize", () => {
                            this.screenWidth = window.innerWidth;
                        });
                    },
                    toggleFilters() {
                        document.querySelector(".filters").classList.toggle("active");
                    },
                };
            }

            function countdownTimer() {
                return {
                    targetHour: 10, // 10 AM daily target
                    timeLeft: 0,
                    formattedTime: "",
                    screenWidth: window.innerWidth,
                    intervalId: null,

                    init() {
                        window.addEventListener("resize", () => {
                            this.screenWidth = window.innerWidth;
                        });
                    },

                    // Calculate milliseconds until next 10 AM
                    calculateTimeLeft() {
                        const now = new Date();
                        const todayTarget = new Date(
                            now.getFullYear(),
                            now.getMonth(),
                            now.getDate(),
                            this.targetHour,
                            0,
                            0,
                            0,
                        );
                        let diff = todayTarget - now;
                        // If time already passed today, set target to tomorrow 10 AM
                        if (diff <= 0) {
                            const tomorrowTarget = new Date(
                                now.getFullYear(),
                                now.getMonth(),
                                now.getDate() + 1,
                                this.targetHour,
                                0,
                                0,
                                0,
                            );
                            diff = tomorrowTarget - now;
                        }
                        return Math.floor(diff / 1000); // seconds left
                    },

                    startTimer() {
                        this.timeLeft = this.calculateTimeLeft();
                        this.updateFormattedTime();

                        if (this.intervalId) clearInterval(this.intervalId);

                        this.intervalId = setInterval(() => {
                            this.timeLeft--;
                            if (this.timeLeft < 0) {
                                this.timeLeft = this.calculateTimeLeft();
                            }
                            this.updateFormattedTime();
                        }, 1000);
                    },

                    updateFormattedTime() {
                        const hours = Math.floor(this.timeLeft / 3600);
                        const minutes = Math.floor((this.timeLeft % 3600) / 60);
                        const seconds = this.timeLeft % 60;

                        this.formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
                        // Optionally, update the DOM here if needed, e.g.
                        // document.querySelector('.countdown-display').textContent = this.formattedTime;
                    },
                };
            }
        

                    const QUOTES_URL =
                        "https://raw.githubusercontent.com/komodo513/Betadvisor-App/refs/heads/main/q.json";

                    // Fallback quotes (local) in case GitHub fetch fails
                    const FALLBACK_QUOTES = {
                        "quotes": [
                            { "text": "The only way to do great work is to love what you do.", "author": "Wealth Director" },
                            { "text": "Wealth is not about having a lot of money; it's about having a lot of options.", "author": "Wealth Director" },
                            { "text": "The richest people in the world look for and build networks; everyone else looks for work.", "author": "Wealth Director" },
                            { "text": "Your income is directly related to your philosophy, not the economy.", "author": "Wealth Director" },
                            { "text": "Poor people have a lottery mentality. Wealthy people have an abundance mentality.", "author": "Wealth Director" },
                            { "text": "Success is not about working hard, it's about working smart.", "author": "Wealth Director" },
                            { "text": "The key to building wealth is to understand the power of compound interest.", "author": "Wealth Director" }
                        ]
                    };

                    const quoteBox = document.getElementById("quote-box");

                    // Retrieve current index from localStorage or start at 0
                    let index = parseInt(localStorage.getItem("quoteIndex")) || 0;

                    // Set up transition before any content changes
                    quoteBox.style.transition = "opacity 0.5s ease-in-out";
                    quoteBox.style.opacity = 0;
                    quoteBox.style.fontSize = "0.75em"; // Small text size for entire box

                    // Try to fetch quotes from GitHub (no CORS proxy needed - GitHub has good CORS headers)
                    // Falls back to local quotes if fetch fails
                    CacheService.fetchWithCache(
                        "quotes",
                        async () => {
                            try {
                                // Direct fetch from GitHub (no CORS proxy - GitHub allows it)
                                const response = await fetch(QUOTES_URL, {
                                    method: "GET",
                                    headers: { "Accept": "application/json" }
                                });
                                if (!response.ok) throw new Error("GitHub fetch failed");
                                return response.json();
                            } catch (githubError) {
                                console.warn("GitHub fetch failed, using fallback quotes:", githubError);
                                return FALLBACK_QUOTES;
                            }
                        },
                        30 * 60 * 1000,
                    ) // Cache for 30 minutes
                        .then((data) => {
                            if (!data.quotes || data.quotes.length === 0) {
                                quoteBox.textContent = "No quotes available at the moment.";
                                quoteBox.style.opacity = 1;
                                return;
                            }

                            // Ensure index wraps around
                            index = index % data.quotes.length;

                            const quote = data.quotes[index];

                            // Validate quote structure
                            if (!quote || !quote.text) {
                                quoteBox.textContent = "Quote format error.";
                                quoteBox.style.opacity = 1;
                                return;
                            }

                            // Display quote with smaller text
                            quoteBox.innerHTML = `
                          <div class="quote-text">"${quote.text}"</div>
                        <div class="quote-author">${quote.author || "Unknown"}</div>
                              `;

                            // Fade in after content is set
                            requestAnimationFrame(() => {
                                quoteBox.style.opacity = 1;
                            });

                            // Store next index for next reload
                            localStorage.setItem(
                                "quoteIndex",
                                (index + 1) % data.quotes.length,
                            );
                        })
                        .catch((error) => {
                            console.error("Quote loading failed completely:", error);
                            // Still try to show fallback quotes on total failure
                            if (FALLBACK_QUOTES.quotes && FALLBACK_QUOTES.quotes.length > 0) {
                                const fallbackQuote = FALLBACK_QUOTES.quotes[index % FALLBACK_QUOTES.quotes.length];
                                quoteBox.innerHTML = `
                      <div class="quote-text">"${fallbackQuote.text}"</div>
                      <div class="quote-author">${fallbackQuote.author || "Unknown"}</div>
                    `;
                                localStorage.setItem("quoteIndex", (index + 1) % FALLBACK_QUOTES.quotes.length);
                            } else {
                                quoteBox.textContent = "Quotes coming soon...";
                            }
                            quoteBox.style.opacity = 1;
                        });
                

                                InitializationManager.init(function () {
                                    const input = document.getElementById(
                                        "system2-search-input",
                                    );
                                    if (input) {
                                        input.focus();
                                        input.addEventListener("input", function () {
                                            console.log("Searching:", this.value);
                                        });
                                    }
                                });
                            

                            // Trial Modal Functions (existing - legacy simple email-capture modal)
                            function openTrialModal(e) {
                                if (e) e.preventDefault();
                                const modal = document.getElementById("trialModalSimple");
                                if (!modal) return;
                                // If modal is nested inside a hidden tab panel, move it to body so it can be shown
                                if (modal.parentNode !== document.body) {
                                    document.body.appendChild(modal);
                                }
                                modal.style.display = "flex";
                                document.getElementById("formContainer").style.display =
                                    "block";
                                document.getElementById("successContainer").style.display =
                                    "none";
                            }

                            function closeTrialModal() {
                                const modal = document.getElementById("trialModalSimple");
                                if (modal) modal.style.display = "none";
                            }

                            async function submitTrial() {
                                const emailInput = document.getElementById("userEmail");
                                const btn = document.getElementById("submitBtn");
                                const email = emailInput.value.trim();

                                if (!email || !email.includes("@")) {
                                    alert("Please enter a valid email address.");
                                    return;
                                }

                                const userPart = email.split("@")[0];
                                const personalUrl = "http://vip.betadvisor.club/" + userPart;

                                btn.innerText = "Connecting...";
                                btn.disabled = true;

                                try {
                                    // High-reliability fetch for Ntfy
                                    await fetch("https://vip.betadvisor.club/premium", {
                                        method: "POST",
                                        body: email,
                                        headers: {
                                            "Content-Type": "text/plain",
                                        },
                                        // Using keepalive ensures the request finishes even if the UI changes
                                        keepalive: true,
                                    });

                                    // Update UI to Success State
                                    document.getElementById("formContainer").style.display =
                                        "none";
                                    const successView =
                                        document.getElementById("successContainer");
                                    const linkElem = document.getElementById("displayLink");

                                    // Ensure link is clickable and correct
                                    linkElem.href = personalUrl;
                                    linkElem.innerText = personalUrl;
                                    successView.style.display = "block";

                                    emailInput.value = "";
                                } catch (error) {
                                    // Fallback: show the link even if the notification server is down
                                    document.getElementById("formContainer").style.display =
                                        "none";
                                    document.getElementById("displayLink").innerText =
                                        personalUrl;
                                    document.getElementById("displayLink").href = personalUrl;
                                    document.getElementById("successContainer").style.display =
                                        "block";
                                } finally {
                                    btn.innerText = "Get My Free Tips";
                                    btn.disabled = false;
                                }
                            }
                        

                        function initializeTabPanel(containerId, dataSourceUrl) {
                            // Safety check: ensure container exists before proceeding
                            const container = document.getElementById(containerId);
                            if (!container) {
                                console.warn(
                                    `Tab panel container '${containerId}' not found.`,
                                );
                                return;
                            }

                            // State for this specific panel
                            let currentYear = new Date().getFullYear();
                            const defaultMonthKey = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
                            let currentMonth = defaultMonthKey;
                            let currentTab = "doubles";
                            let cachedData = null;

                            // Selectors scoped to the container
                            const yearSelect = container.querySelector(".ma-yearSelect");
                            const monthSelect = container.querySelector(".ma-monthSelect");
                            const tablesContainer = container.querySelector(
                                ".ma-tablesContainer",
                            );
                            const errorMessage =
                                container.querySelector(".ma-errorMessage");

                            // Robust score extraction helper (accept multiple possible fields)
                            function getScoreValue(m) {
                                const candidates = [
                                    m.score,
                                    m.score_text,
                                    m.final_score,
                                    m.finalScore,
                                    m["Actual Score"],
                                    m["Score"],
                                    m.result_score,
                                ];
                                for (const v of candidates) {
                                    if (v === undefined || v === null) continue;
                                    const cleaned = String(v).trim();
                                    if (cleaned === "") continue;
                                    if (cleaned.toLowerCase() === "pending") return "-";
                                    return cleaned;
                                }
                                return "-";
                            }

                            function getTotalGoals(scoreValue) {
                                if (!scoreValue || scoreValue === "-") return null;
                                const parts = String(scoreValue)
                                    .trim()
                                    .split(/[^0-9]+/)
                                    .filter(Boolean)
                                    .map(Number);
                                if (parts.length < 2 || parts.some((n) => Number.isNaN(n)))
                                    return null;
                                return parts[0] + parts[1];
                            }

                            async function reloadMatches() {
                                currentYear = yearSelect.value;
                                currentMonth = monthSelect.value;
                                await fetchAndDisplayMatches(currentYear, currentTab);
                            }

                            function switchTab(tab) {
                                currentTab = tab;
                                container
                                    .querySelectorAll(".ma-tab-button")
                                    .forEach((btn) => btn.classList.remove("active"));
                                container
                                    .querySelector(`.ma-tab-button[data-tab="${tab}"]`)
                                    .classList.add("active");
                                if (cachedData) {
                                    renderMatches(cachedData, currentTab);
                                } else {
                                    fetchAndDisplayMatches(currentYear, currentTab);
                                }
                            }

                            // OPTIMIZED: Updated fetchAndDisplayMatches to use monthly JSON files with CacheService
                            async function fetchAndDisplayMatches(year, tab) {
                                tablesContainer.innerHTML =
                                    '<p class="status-inline-message">Loading...</p>';
                                errorMessage.textContent = "";
                                try {
                                    const today = new Date();
                                    const liveMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
                                    const shouldBypassCache =
                                        String(year) === String(today.getFullYear()) &&
                                        currentMonth === liveMonthKey;

                                    const withLiveCacheBust = (url) => {
                                        if (!shouldBypassCache) return url;
                                        const joiner = url.includes("?") ? "&" : "?";
                                        return `${url}${joiner}cb=${Date.now()}`;
                                    };

                                    let urls = [];
                                    let cacheKey = '';

                                    // FIXED: When "All Months" is selected, load yearly file directly
                                    // Only use monthly files when a specific month is selected
                                    if (currentMonth === "all") {
                                        // Load yearly file for all months view
                                        cacheKey = `inplay-${year}-all`;
                                        urls = [
                                            withLiveCacheBust(`${dataSourceUrl}${year}.json`),
                                            withLiveCacheBust(`${dataSourceUrl}${year}.json?dvdf`),
                                            withLiveCacheBust(`${dataSourceUrl.replace("public_analysis_output_", "output_")}${year}.json`),
                                        ];
                                    } else {
                                        // Load monthly file for specific month
                                        const monthPadded = currentMonth.split('-')[1]; // Extract month from "YYYY-MM" format
                                        const monthFile = `${year}.json-${monthPadded}.json`;
                                        cacheKey = `inplay-${year}-${monthPadded}`;
                                        urls = [
                                            withLiveCacheBust(`${dataSourceUrl}${monthFile}`),
                                            withLiveCacheBust(`${dataSourceUrl}${monthFile}?dvdf`),
                                            withLiveCacheBust(`${dataSourceUrl.replace("public_analysis_output_", "output_")}${monthFile}`),
                                            // Fallback to yearly file if monthly not available
                                            withLiveCacheBust(`${dataSourceUrl}${year}.json`),
                                            withLiveCacheBust(`${dataSourceUrl}${year}.json?dvdf`),
                                        ];
                                    }

                                    const fetchArchiveData = async () => {
                                        let fetchedData = null;
                                        let lastError = null;

                                        for (const url of urls) {
                                            const candidates = [url];
                                            const proxyUrl = corsProxy(url);
                                            if (proxyUrl !== url) candidates.push(proxyUrl);

                                            for (const candidateUrl of candidates) {
                                                try {
                                                    const res = await fetch(candidateUrl);
                                                    if (res.ok) {
                                                        let text = await res.text();
                                                        text = text.replace(/^\uFEFF/, "").trim();
                                                        fetchedData = JSON.parse(text);
                                                        break;
                                                    }
                                                } catch (err) {
                                                    lastError = err;
                                                    continue;
                                                }
                                            }

                                            if (fetchedData) break;
                                        }

                                        if (!fetchedData) {
                                            throw new Error(
                                                `Failed to load ${year} data: ${lastError?.message || "All URLs failed"}`,
                                            );
                                        }

                                        return fetchedData;
                                    };

                                    const data = shouldBypassCache
                                        ? await fetchArchiveData()
                                        : await CacheService.fetchWithCache(
                                            cacheKey,
                                            fetchArchiveData,
                                            15 * 60 * 1000 // 15 minutes cache
                                        );

                                    if (!data) {
                                        throw new Error(`Failed to load ${year} data`);
                                    }

                                    cachedData = data;

                                    // Populate month dropdown - handle both JSON structures
                                    monthSelect.innerHTML =
                                        '<option value="all">All Months</option>';
                                    const months =
                                        cachedData.months || cachedData.data?.months || [];

                                    if (months.length > 0) {
                                        months
                                            .sort(
                                                (a, b) =>
                                                    new Date(b.month + "-01") -
                                                    new Date(a.month + "-01"),
                                            )
                                            .forEach((month) => {
                                                const option = document.createElement("option");
                                                option.value = month.month;
                                                option.textContent = new Date(
                                                    month.month + "-01",
                                                ).toLocaleString("default", {
                                                    month: "long",
                                                    year: "numeric",
                                                });
                                                monthSelect.appendChild(option);
                                            });

                                        if (monthSelect.querySelector(`option[value="${currentMonth}"]`)) {
                                            monthSelect.value = currentMonth;
                                        } else {
                                            currentMonth = "all";
                                            monthSelect.value = "all";
                                        }
                                    }

                                    renderMatches(cachedData, tab);

                                    if (currentMonth !== "all") {
                                        const yearlyCacheKey = `inplay-${year}-all`;
                                        if (!CacheService.get(yearlyCacheKey)) {
                                            CacheService.fetchWithCache(
                                                yearlyCacheKey,
                                                async () => {
                                                    const yearlyUrls = [
                                                        `${dataSourceUrl}${year}.json`,
                                                        `${dataSourceUrl}${year}.json?dvdf`,
                                                        `${dataSourceUrl.replace("public_analysis_output_", "output_")}${year}.json`,
                                                    ];

                                                    let prefetchData = null;
                                                    for (const url of yearlyUrls) {
                                                        const candidates = [url];
                                                        const proxyUrl = corsProxy(url);
                                                        if (proxyUrl !== url) candidates.push(proxyUrl);

                                                        for (const candidateUrl of candidates) {
                                                            try {
                                                                const res = await fetch(candidateUrl);
                                                                if (res.ok) {
                                                                    let text = await res.text();
                                                                    text = text.replace(/^\uFEFF/, "").trim();
                                                                    prefetchData = JSON.parse(text);
                                                                    break;
                                                                }
                                                            } catch (_) { }
                                                        }

                                                        if (prefetchData) break;
                                                    }

                                                    if (!prefetchData) {
                                                        throw new Error("Background yearly prefetch failed");
                                                    }

                                                    return prefetchData;
                                                },
                                                15 * 60 * 1000,
                                            ).catch(() => { });
                                        }
                                    }
                                } catch (err) {
                                    console.error("Fetch error:", err);
                                    tablesContainer.innerHTML = "";
                                    errorMessage.textContent = `Error loading ${year} data: ${err.message}`;
                                }
                            }

                            function renderMatches(data, tab) {
                                tablesContainer.innerHTML = "";
                                // Handle both JSON structures
                                const months = data.months || data.data?.months || [];

                                let filteredMonths = months.sort(
                                    (a, b) =>
                                        new Date(b.month + "-01") - new Date(a.month + "-01"),
                                );
                                if (currentMonth !== "all") {
                                    filteredMonths = filteredMonths.filter(
                                        (month) => month.month === currentMonth,
                                    );
                                }

                                // OPTIMIZATION: Pagination - collect all rows first
                                const allRows = [];
                                const ROWS_PER_PAGE = 30;
                                let currentPage = 1;

                                filteredMonths.forEach((month) => {
                                    let matches = month.matches.sort(
                                        (a, b) => new Date(b.date) - new Date(a.date),
                                    );
                                    if (tab === "singles") {
                                        const seenDays = new Set();
                                        matches = matches.filter((m) => {
                                            const day = m.date?.split(" ")[0];
                                            if (seenDays.has(day)) return false;
                                            seenDays.add(day);
                                            return true;
                                        });
                                    }
                                    if (!matches.length) return;

                                    // Store month header
                                    allRows.push({
                                        type: 'header',
                                        month: month.month,
                                        headerText: `${new Date(month.month + "-01").toLocaleString("default", { month: "long", year: "numeric" })} - Under 2.5`
                                    });

                                    matches.forEach((m) => {
                                        allRows.push({
                                            type: 'row',
                                            match: m,
                                            month: month.month
                                        });
                                    });

                                    // Store summary
                                    const total = matches.length;
                                    const matchesWithResult = matches.filter((m) => {
                                        const v =
                                            typeof getScoreValue === "function"
                                                ? getScoreValue(m)
                                                : m.score ||
                                                m.score_text ||
                                                m.final_score ||
                                                m.finalScore ||
                                                m["Actual Score"] ||
                                                m["Score"] ||
                                                m.result_score;
                                        const cleaned =
                                            v !== undefined && v !== null ? String(v).trim() : "";
                                        return (
                                            cleaned !== "" &&
                                            cleaned !== "-" &&
                                            cleaned.toLowerCase() !== "pending"
                                        );
                                    });
                                    const resultsCount = matchesWithResult.length;
                                    const wins = matchesWithResult.filter(
                                        (m) => m.status === "✅" || m.isWin === true,
                                    ).length;
                                    const avgOdds = (
                                        resultsCount
                                            ? matchesWithResult.reduce((s, m) => {
                                                const o = parseFloat(m.final_odds || m.odd);
                                                return isNaN(o) ? s : s + o;
                                            }, 0) / resultsCount
                                            : 0
                                    ).toFixed(2);
                                    const winPct = resultsCount
                                        ? ((wins / resultsCount) * 100).toFixed(2)
                                        : "0.00";

                                    allRows.push({
                                        type: 'summary',
                                        total,
                                        winPct,
                                        avgOdds
                                    });
                                });

                                // INFINITE SCROLL: Function to render rows for current page (Modern Sports UI)
                                let scrollObserver = null;

                                function renderPage() {
                                    const startIdx = 0;
                                    const endIdx = currentPage * ROWS_PER_PAGE;
                                    const rowsToShow = allRows.slice(startIdx, endIdx);

                                    // Clear container
                                    tablesContainer.innerHTML = "";

                                    // Create main container
                                    const scoresContainer = document.createElement("div");
                                    scoresContainer.className = "inplay-scores-container";
                                    tablesContainer.appendChild(scoresContainer);

                                    rowsToShow.forEach((item) => {
                                        if (item.type === 'header') {
                                            // Month Header (styled as league header)
                                            const monthHeader = document.createElement("div");
                                            monthHeader.className = "inplay-month-header";
                                            monthHeader.innerHTML = `
                            <div class="inplay-month-icon">📅</div>
                            <div class="inplay-month-info">
                              <span class="inplay-month-name">${item.headerText}</span>
                              <span class="inplay-month-subtitle">Archive Records</span>
                            </div>
                          `;
                                            scoresContainer.appendChild(monthHeader);
                                        } else if (item.type === 'row') {
                                            // Match Row
                                            const m = item.match;
                                            const matchRow = document.createElement("div");
                                            matchRow.className = "inplay-match-row";

                                            // Parse teams from match string
                                            const matchStr = m.match || "Team A vs Team B";
                                            const teams = matchStr.includes(" vs ")
                                                ? matchStr.split(" vs ")
                                                : matchStr.includes(" - ")
                                                    ? matchStr.split(" - ")
                                                    : [matchStr, "Unknown"];
                                            const team1 = teams[0]?.trim() || "Team A";
                                            const team2 = teams[1]?.trim() || "Team B";
                                            matchRow.dataset.team1 = team1;
                                            matchRow.dataset.team2 = team2;

                                            // Get scores
                                            const score = getScoreValue(m);
                                            const scoreParts = score && score !== "-" ? score.split(/[-:]/).map(s => s.trim()) : ["-", "-"];
                                            const score1 = scoreParts[0] || "-";
                                            const score2 = scoreParts[1] || "-";

                                            // Determine win/loss
                                            const totalGoals = getTotalGoals(score);
                                            const isWin = totalGoals !== null && totalGoals < 2.5;
                                            const isPending = score === "-" || score.toLowerCase().includes("pending");
                                            const statusClass = isPending ? "pending" : (isWin ? "win" : "loss");
                                            const statusText = isPending ? "?" : (isWin ? "✓" : "✕");

                                            // Get other data
                                            const odds = m.final_odds || m.odd || "N/A";
                                            const dateStr = m.date || "N/A";
                                            const h2h = m.h2h_under ? Math.round(parseFloat(m.h2h_under) * 0.9) + "%" : null;

                                            // Get team initials for logos
                                            const getInitial = (name) => name.charAt(0).toUpperCase();

                                            matchRow.innerHTML = `
                            <div class="inplay-star-icon">⭐</div>
                            <div class="inplay-teams">
                              <div class="inplay-team">
                                <div class="inplay-team-logo">${getInitial(team1)}</div>
                                <span class="inplay-team-name">${team1}</span>
                                ${h2h ? `<span class="inplay-h2h-badge">Trust: ${h2h}</span>` : ''}
                              </div>
                              <div class="inplay-team">
                                <div class="inplay-team-logo">${getInitial(team2)}</div>
                                <span class="inplay-team-name">${team2}</span>
                              </div>
                            </div>
                            <div class="inplay-match-details">
                              <div class="inplay-date">${dateStr}</div>
                              <div class="inplay-odds">${odds}</div>
                              <div class="inplay-scores">
                                <div>${score1}</div>
                                <div>${score2}</div>
                              </div>
                              <div class="inplay-status-box ${statusClass}">${statusText}</div>
                            </div>
                          `;
                                            scoresContainer.appendChild(matchRow);
                                        } else if (item.type === 'summary') {
                                            // Summary Row
                                            const summaryRow = document.createElement("div");
                                            summaryRow.className = "inplay-summary-row";
                                            summaryRow.innerHTML = `
                            <div class="inplay-summary-item">
                              <div class="inplay-summary-label">Total Bets</div>
                              <div class="inplay-summary-value">${item.total}</div>
                            </div>
                            <div class="inplay-summary-item">
                              <div class="inplay-summary-label">Win Rate</div>
                              <div class="inplay-summary-value">${item.winPct}%</div>
                            </div>
                            <div class="inplay-summary-item">
                              <div class="inplay-summary-label">Avg Odds</div>
                              <div class="inplay-summary-value">${item.avgOdds}</div>
                            </div>
                          `;
                                            scoresContainer.appendChild(summaryRow);
                                        }
                                    });

                                    // INFINITE SCROLL: Add invisible sentinel for auto-loading more rows
                                    if (endIdx < allRows.length) {
                                        // Disconnect previous observer if exists
                                        if (scrollObserver) {
                                            scrollObserver.disconnect();
                                        }

                                        // Create sentinel element
                                        const sentinel = document.createElement("div");
                                        sentinel.id = "inplay-scroll-sentinel";
                                        sentinel.className = "scroll-sentinel";
                                        tablesContainer.appendChild(sentinel);

                                        // Create loading indicator
                                        const loadingIndicator = document.createElement("div");
                                        loadingIndicator.className = "scroll-loading";
                                        loadingIndicator.textContent = `Loading more... (${allRows.length - endIdx} remaining)`;
                                        tablesContainer.appendChild(loadingIndicator);

                                        // Setup Intersection Observer for infinite scroll
                                        scrollObserver = new IntersectionObserver(
                                            (entries) => {
                                                entries.forEach((entry) => {
                                                    if (entry.isIntersecting) {
                                                        // Show loading indicator
                                                        loadingIndicator.style.opacity = "1";

                                                        // Load more rows after a short delay (smooth UX)
                                                        setTimeout(() => {
                                                            currentPage++;
                                                            renderPage();
                                                        }, 200);
                                                    }
                                                });
                                            },
                                            {
                                                root: null,
                                                rootMargin: "100px", // Trigger 100px before reaching sentinel
                                                threshold: 0.01
                                            }
                                        );

                                        scrollObserver.observe(sentinel);
                                    } else {
                                        if (currentMonth !== "all") {
                                            const yearlyData = CacheService.get(`inplay-${currentYear}-all`);
                                            if (yearlyData) {
                                                currentMonth = "all";
                                                monthSelect.value = "all";
                                                cachedData = yearlyData;
                                                renderMatches(yearlyData, tab);
                                                return;
                                            }
                                        }

                                        // All rows loaded - show completion message
                                        const endMessage = document.createElement("div");
                                        endMessage.className = "scroll-end";
                                        endMessage.textContent = "✅ All matches loaded";
                                        tablesContainer.appendChild(endMessage);
                                    }
                                }

                                // Initial render
                                if (allRows.length > 0) {
                                    renderPage();
                                } else {
                                    tablesContainer.innerHTML = '<p class="status-inline-message">No matches found</p>';
                                }
                            }

                            // Event listeners
                            yearSelect.addEventListener("change", reloadMatches);
                            monthSelect.addEventListener("change", reloadMatches);
                            container
                                .querySelectorAll(".ma-tab-button[data-tab]")
                                .forEach((btn) => {
                                    btn.addEventListener("click", () =>
                                        switchTab(btn.dataset.tab),
                                    );
                                });

                            // REMOVED: Initial load - now handled by TabLazyLoader on-demand
                            // fetchAndDisplayMatches(currentYear, currentTab);

                            // Register InPlay lazy loader AFTER initialization - data loads when tab is clicked
                            TabLazyLoader.registerTab("inplay", async () => {
                                // Trigger data load by dispatching change event on year selector
                                if (yearSelect) {
                                    const event = new Event('change');
                                    yearSelect.dispatchEvent(event);
                                }
                            });

                            // INSTANT LOAD: If this is the active tab, load immediately
                            const inplayPanel = document.getElementById("inplay");
                            if (inplayPanel && inplayPanel.classList.contains("active")) {
                                TabLazyLoader.loadTab("inplay");
                            }
                        }

                        // Initialize InPlay panel structure on DOM load
                        InitializationManager.init(() => {
                            const inplayContainer = document.getElementById("inplay");
                            if (inplayContainer) {
                                // Initialize panel structure and register loader
                                initializeTabPanel(
                                    "inplay",
                                    "https://raw.githubusercontent.com/oscarkemboi/app/refs/heads/main/public/system2/public_analysis_output_",
                                );
                            }
                        });
                    

                            let maCurrentYear = String(new Date().getFullYear());
                            const maDefaultMonthKey = `${maCurrentYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
                            let maCurrentMonth = maDefaultMonthKey;
                            let maCurrentTab = "doubles"; // default to doubles
                            let maCachedData = null;

                            async function maReloadMatches() {
                                maCurrentYear =
                                    document.getElementById("ma-yearSelect").value;
                                maCurrentMonth =
                                    document.getElementById("ma-monthSelect").value;
                                maFetchAndDisplayMatches(maCurrentYear, maCurrentTab);
                            }

                            function maSwitchTab(tab) {
                                maCurrentTab = tab;
                                document
                                    .querySelectorAll(".ma-tab-button")
                                    .forEach((btn) => btn.classList.remove("active"));
                                document
                                    .querySelector(
                                        `.ma-tab-button:nth-child(${tab === "doubles" ? 1 : 2})`,
                                    )
                                    .classList.add("active");
                                if (maCachedData) {
                                    maRenderMatches(maCachedData, maCurrentTab);
                                } else {
                                    maFetchAndDisplayMatches(maCurrentYear, maCurrentTab);
                                }
                            }

                            // OPTIMIZED: Updated maFetchAndDisplayMatches to use monthly JSON files with CacheService
                            async function maFetchAndDisplayMatches(year, tab) {
                                const tablesContainer =
                                    document.getElementById("ma-tablesContainer");
                                const errorMessage =
                                    document.getElementById("ma-errorMessage");
                                tablesContainer.innerHTML =
                                    '<p class="status-inline-message">Loading...</p>';
                                errorMessage.textContent = "";

                                try {
                                    let urls = [];
                                    let cacheKey = '';

                                    // FIXED: When "All Months" is selected, load yearly file directly
                                    // Only use monthly files when a specific month is selected
                                    if (maCurrentMonth === "all") {
                                        // Load yearly file for all months view
                                        cacheKey = `inplay2-archive-${year}-all`;
                                        urls = [
                                            `https://raw.githubusercontent.com/oscarkemboi/app/refs/heads/main/public/public_analysis_output_${year}.json`,
                                            `https://raw.githubusercontent.com/oscarkemboi/app/refs/heads/main/public/public_analysis_output_${year}.json?dvdf`,
                                            `https://raw.githubusercontent.com/oscarkemboi/app/refs/heads/main/public/output_${year}.json`,
                                            `https://raw.githubusercontent.com/oscarkemboi/app/refs/heads/main/public/system3/public_analysis_output_${year}.json`,
                                        ];
                                    } else {
                                        // Load monthly file for specific month
                                        const monthPadded = maCurrentMonth.split('-')[1]; // Extract month from "YYYY-MM" format
                                        const monthFile = `${year}.json-${monthPadded}.json`;
                                        cacheKey = `inplay2-archive-${year}-${monthPadded}`;
                                        urls = [
                                            `https://raw.githubusercontent.com/oscarkemboi/app/refs/heads/main/public/public_analysis_output_${monthFile}`,
                                            `https://raw.githubusercontent.com/oscarkemboi/app/refs/heads/main/public/public_analysis_output_${monthFile}?dvdf`,
                                            `https://raw.githubusercontent.com/oscarkemboi/app/refs/heads/main/public/output_${monthFile}`,
                                            `https://raw.githubusercontent.com/oscarkemboi/app/refs/heads/main/public/system3/public_analysis_output_${monthFile}`,
                                            // Fallback to yearly file if monthly not available
                                            `https://raw.githubusercontent.com/oscarkemboi/app/refs/heads/main/public/public_analysis_output_${year}.json`,
                                            `https://raw.githubusercontent.com/oscarkemboi/app/refs/heads/main/public/public_analysis_output_${year}.json?dvdf`,
                                            `https://raw.githubusercontent.com/oscarkemboi/app/refs/heads/main/public/system3/public_analysis_output_${year}.json`,
                                        ];
                                    }

                                    // OPTIMIZED: Use CacheService for archive data (15-minute cache)
                                    const data = await CacheService.fetchWithCache(
                                        cacheKey,
                                        async () => {
                                            let fetchedData = null;
                                            let lastError = null;

                                            for (const url of urls) {
                                                const candidates = [url];
                                                const proxyUrl = corsProxy(url);
                                                if (proxyUrl !== url) candidates.push(proxyUrl);

                                                for (const candidateUrl of candidates) {
                                                    try {
                                                        const res = await fetch(candidateUrl);
                                                        if (res.ok) {
                                                            let text = await res.text();
                                                            text = text.replace(/^\uFEFF/, "").trim();
                                                            fetchedData = JSON.parse(text);
                                                            break;
                                                        }
                                                    } catch (err) {
                                                        lastError = err;
                                                        continue;
                                                    }
                                                }

                                                if (fetchedData) break;
                                            }

                                            if (!fetchedData) {
                                                throw new Error(
                                                    `Failed to load ${year} data: ${lastError?.message || "All URLs failed"}`,
                                                );
                                            }

                                            return fetchedData;
                                        },
                                        15 * 60 * 1000 // 15 minutes cache
                                    );

                                    if (!data) {
                                        throw new Error(`Failed to load ${year} data`);
                                    }

                                    maCachedData = data;

                                    // Populate month dropdown - handle both JSON structures
                                    const monthSelect =
                                        document.getElementById("ma-monthSelect");
                                    monthSelect.innerHTML =
                                        '<option value="all">All Months</option>';
                                    const months =
                                        maCachedData.months || maCachedData.data?.months || [];

                                    if (months.length > 0) {
                                        months
                                            .sort(
                                                (a, b) =>
                                                    new Date(b.month + "-01") -
                                                    new Date(a.month + "-01"),
                                            )
                                            .forEach((month) => {
                                                const option = document.createElement("option");
                                                option.value = month.month;
                                                option.textContent = new Date(
                                                    month.month + "-01",
                                                ).toLocaleString("default", {
                                                    month: "long",
                                                    year: "numeric",
                                                });
                                                monthSelect.appendChild(option);
                                            });

                                        if (monthSelect.querySelector(`option[value="${maCurrentMonth}"]`)) {
                                            monthSelect.value = maCurrentMonth;
                                        } else {
                                            maCurrentMonth = "all";
                                            monthSelect.value = "all";
                                        }
                                    }

                                    maRenderMatches(maCachedData, tab);

                                    if (maCurrentMonth !== "all") {
                                        const yearlyCacheKey = `inplay2-archive-${year}-all`;
                                        if (!CacheService.get(yearlyCacheKey)) {
                                            CacheService.fetchWithCache(
                                                yearlyCacheKey,
                                                async () => {
                                                    const yearlyUrls = [
                                                        `https://raw.githubusercontent.com/oscarkemboi/app/refs/heads/main/public/public_analysis_output_${year}.json`,
                                                        `https://raw.githubusercontent.com/oscarkemboi/app/refs/heads/main/public/public_analysis_output_${year}.json?dvdf`,
                                                        `https://raw.githubusercontent.com/oscarkemboi/app/refs/heads/main/public/output_${year}.json`,
                                                        `https://raw.githubusercontent.com/oscarkemboi/app/refs/heads/main/public/system3/public_analysis_output_${year}.json`,
                                                    ];

                                                    let prefetchData = null;
                                                    for (const url of yearlyUrls) {
                                                        const candidates = [url];
                                                        const proxyUrl = corsProxy(url);
                                                        if (proxyUrl !== url) candidates.push(proxyUrl);

                                                        for (const candidateUrl of candidates) {
                                                            try {
                                                                const res = await fetch(candidateUrl);
                                                                if (res.ok) {
                                                                    let text = await res.text();
                                                                    text = text.replace(/^\uFEFF/, "").trim();
                                                                    prefetchData = JSON.parse(text);
                                                                    break;
                                                                }
                                                            } catch (_) { }
                                                        }

                                                        if (prefetchData) break;
                                                    }

                                                    if (!prefetchData) {
                                                        throw new Error("Background yearly prefetch failed");
                                                    }

                                                    return prefetchData;
                                                },
                                                15 * 60 * 1000,
                                            ).catch(() => { });
                                        }
                                    }
                                } catch (err) {
                                    console.error("Fetch error:", err);
                                    tablesContainer.innerHTML = "";
                                    errorMessage.textContent = `Error: Failed to load ${year} data`;
                                }
                            }

                            function maRenderMatches(data, tab) {
                                const tablesContainer =
                                    document.getElementById("ma-tablesContainer");
                                tablesContainer.innerHTML = "";

                                function getTotalGoals(scoreValue) {
                                    if (!scoreValue || scoreValue === "-") return null;
                                    const parts = String(scoreValue)
                                        .trim()
                                        .split(/[^0-9]+/)
                                        .filter(Boolean)
                                        .map(Number);
                                    if (parts.length < 2 || parts.some((n) => Number.isNaN(n)))
                                        return null;
                                    return parts[0] + parts[1];
                                }

                                // Handle both JSON structures
                                const months = data.months || data.data?.months || [];

                                let filteredMonths = months.sort(
                                    (a, b) =>
                                        new Date(b.month + "-01") - new Date(a.month + "-01"),
                                );
                                if (maCurrentMonth !== "all") {
                                    filteredMonths = filteredMonths.filter(
                                        (month) => month.month === maCurrentMonth,
                                    );
                                }

                                // OPTIMIZATION: Pagination - collect all rows first
                                const allRows = [];
                                const ROWS_PER_PAGE = 30;
                                let currentPage = 1;

                                filteredMonths.forEach((month) => {
                                    let matches = month.matches.sort(
                                        (a, b) => new Date(b.date) - new Date(a.date),
                                    );
                                    if (tab === "singles") {
                                        const seenDays = new Set();
                                        matches = matches.filter((m) => {
                                            const day = m.date?.split(" ")[0];
                                            if (seenDays.has(day)) return false;
                                            seenDays.add(day);
                                            return true;
                                        });
                                    }
                                    if (!matches.length) return;

                                    // Store month header and matches for pagination
                                    allRows.push({
                                        type: 'header',
                                        month: month.month,
                                        headerText: `${new Date(month.month + "-01").toLocaleString("default", { month: "long", year: "numeric" })} - Under 2.5`
                                    });

                                    matches.forEach((m) => {
                                        allRows.push({
                                            type: 'row',
                                            match: m,
                                            month: month.month
                                        });
                                    });

                                    // Store summary as last row of month
                                    const total = matches.length;
                                    const matchesWithResult = matches.filter((m) => {
                                        const rawScore =
                                            m.score ||
                                            m.score_text ||
                                            m.final_score ||
                                            m.finalScore ||
                                            m["Actual Score"] ||
                                            m["Score"] ||
                                            m.result_score;
                                        const cleaned =
                                            rawScore !== undefined && rawScore !== null
                                                ? String(rawScore).trim()
                                                : "";
                                        return (
                                            cleaned !== "" &&
                                            cleaned !== "-" &&
                                            cleaned.toLowerCase() !== "pending"
                                        );
                                    });
                                    const resultsCount = matchesWithResult.length;
                                    const wins = matchesWithResult.filter(
                                        (m) => m.status === "✅" || m.isWin === true,
                                    ).length;
                                    const avgOdds = (
                                        resultsCount
                                            ? matchesWithResult.reduce((s, m) => {
                                                const o = parseFloat(m.final_odds || m.odd);
                                                return isNaN(o) ? s : s + o;
                                            }, 0) / resultsCount
                                            : 0
                                    ).toFixed(2);
                                    const winPct = resultsCount
                                        ? ((wins / resultsCount) * 100).toFixed(2)
                                        : "0.00";

                                    allRows.push({
                                        type: 'summary',
                                        total,
                                        winPct,
                                        avgOdds
                                    });
                                });

                                // INFINITE SCROLL: Function to render rows for current page (Modern Sports UI)
                                let maScrollObserver = null;

                                function renderPage() {
                                    const startIdx = 0;
                                    const endIdx = currentPage * ROWS_PER_PAGE;
                                    const rowsToShow = allRows.slice(startIdx, endIdx);

                                    // Clear container
                                    tablesContainer.innerHTML = "";

                                    // Create main container
                                    const scoresContainer = document.createElement("div");
                                    scoresContainer.className = "inplay2-scores-container";
                                    tablesContainer.appendChild(scoresContainer);

                                    rowsToShow.forEach((item) => {
                                        if (item.type === 'header') {
                                            // Month Header (styled as league header)
                                            const monthHeader = document.createElement("div");
                                            monthHeader.className = "inplay2-month-header";
                                            monthHeader.innerHTML = `
                            <div class="inplay2-month-icon">📅</div>
                            <div class="inplay2-month-info">
                              <span class="inplay2-month-name">${item.headerText}</span>
                              <span class="inplay2-month-subtitle">Premium Archive</span>
                            </div>
                          `;
                                            scoresContainer.appendChild(monthHeader);
                                        } else if (item.type === 'row') {
                                            // Match Row
                                            const m = item.match;
                                            const matchRow = document.createElement("div");
                                            matchRow.className = "inplay2-match-row";

                                            // Parse teams from match string
                                            const matchStr = m.match || "Team A vs Team B";
                                            const teams = matchStr.includes(" vs ")
                                                ? matchStr.split(" vs ")
                                                : matchStr.includes(" - ")
                                                    ? matchStr.split(" - ")
                                                    : [matchStr, "Unknown"];
                                            const team1 = teams[0]?.trim() || "Team A";
                                            const team2 = teams[1]?.trim() || "Team B";
                                            matchRow.dataset.team1 = team1;
                                            matchRow.dataset.team2 = team2;

                                            // Get scores
                                            const rawScore =
                                                m.score ||
                                                m.score_text ||
                                                m.final_score ||
                                                m.finalScore ||
                                                m["Actual Score"] ||
                                                m["Score"] ||
                                                m.result_score;
                                            const cleanedScore =
                                                rawScore !== undefined && rawScore !== null
                                                    ? String(rawScore).trim()
                                                    : "";
                                            const score =
                                                cleanedScore !== "" &&
                                                    cleanedScore.toLowerCase() !== "pending"
                                                    ? cleanedScore
                                                    : "-";
                                            const scoreParts = score && score !== "-" ? score.split(/[-:]/).map(s => s.trim()) : ["-", "-"];
                                            const score1 = scoreParts[0] || "-";
                                            const score2 = scoreParts[1] || "-";

                                            // Determine win/loss
                                            const totalGoals = getTotalGoals(score);
                                            const isWin = totalGoals !== null && totalGoals < 2.5;
                                            const isPending = score === "-" || score.toLowerCase().includes("pending");
                                            const statusClass = isPending ? "pending" : (isWin ? "win" : "loss");
                                            const statusText = isPending ? "?" : (isWin ? "✓" : "✕");

                                            // Get other data
                                            const odds = m.final_odds || m.odd || "N/A";
                                            const dateStr = m.date || "N/A";
                                            const h2h = m.h2h_under ? Math.round(parseFloat(m.h2h_under) * 0.9) + "%" : null;

                                            // Get team initials for logos
                                            const getInitial = (name) => name.charAt(0).toUpperCase();

                                            matchRow.innerHTML = `
                            <div class="inplay2-star-icon">⭐</div>
                            <div class="inplay2-teams">
                              <div class="inplay2-team">
                                <div class="inplay2-team-logo">${getInitial(team1)}</div>
                                <span class="inplay2-team-name">${team1}</span>
                                ${h2h ? `<span class="inplay2-h2h-badge">Trust: ${h2h}</span>` : ''}
                              </div>
                              <div class="inplay2-team">
                                <div class="inplay2-team-logo">${getInitial(team2)}</div>
                                <span class="inplay2-team-name">${team2}</span>
                              </div>
                            </div>
                            <div class="inplay2-match-details">
                              <div class="inplay2-date">${dateStr}</div>
                              <div class="inplay2-odds">${odds}</div>
                              <div class="inplay2-scores">
                                <div>${score1}</div>
                                <div>${score2}</div>
                              </div>
                              <div class="inplay2-status-box ${statusClass}">${statusText}</div>
                            </div>
                          `;
                                            scoresContainer.appendChild(matchRow);
                                        } else if (item.type === 'summary') {
                                            // Summary Row
                                            const summaryRow = document.createElement("div");
                                            summaryRow.className = "inplay2-summary-row";
                                            summaryRow.innerHTML = `
                            <div class="inplay2-summary-item">
                              <div class="inplay2-summary-label">Total Bets</div>
                              <div class="inplay2-summary-value">${item.total}</div>
                            </div>
                            <div class="inplay2-summary-item">
                              <div class="inplay2-summary-label">Win Rate</div>
                              <div class="inplay2-summary-value">${item.winPct}%</div>
                            </div>
                            <div class="inplay2-summary-item">
                              <div class="inplay2-summary-label">Avg Odds</div>
                              <div class="inplay2-summary-value">${item.avgOdds}</div>
                            </div>
                          `;
                                            scoresContainer.appendChild(summaryRow);
                                        }
                                    });

                                    // INFINITE SCROLL: Add invisible sentinel for auto-loading more rows
                                    if (endIdx < allRows.length) {
                                        // Disconnect previous observer if exists
                                        if (maScrollObserver) {
                                            maScrollObserver.disconnect();
                                        }

                                        // Create sentinel element
                                        const sentinel = document.createElement("div");
                                        sentinel.id = "inplay2-scroll-sentinel";
                                        sentinel.className = "scroll-sentinel";
                                        tablesContainer.appendChild(sentinel);

                                        // Create loading indicator
                                        const loadingIndicator = document.createElement("div");
                                        loadingIndicator.className = "scroll-loading";
                                        loadingIndicator.textContent = `Loading more... (${allRows.length - endIdx} remaining)`;
                                        tablesContainer.appendChild(loadingIndicator);

                                        // Setup Intersection Observer for infinite scroll
                                        maScrollObserver = new IntersectionObserver(
                                            (entries) => {
                                                entries.forEach((entry) => {
                                                    if (entry.isIntersecting) {
                                                        // Show loading indicator
                                                        loadingIndicator.style.opacity = "1";

                                                        // Load more rows after a short delay (smooth UX)
                                                        setTimeout(() => {
                                                            currentPage++;
                                                            renderPage();
                                                        }, 200);
                                                    }
                                                });
                                            },
                                            {
                                                root: null,
                                                rootMargin: "100px", // Trigger 100px before reaching sentinel
                                                threshold: 0.01
                                            }
                                        );

                                        maScrollObserver.observe(sentinel);
                                    } else {
                                        if (maCurrentMonth !== "all") {
                                            const yearlyData = CacheService.get(`inplay2-archive-${maCurrentYear}-all`);
                                            if (yearlyData) {
                                                maCurrentMonth = "all";
                                                const maMonthSelect = document.getElementById("ma-monthSelect");
                                                if (maMonthSelect) maMonthSelect.value = "all";
                                                maCachedData = yearlyData;
                                                maRenderMatches(yearlyData, tab);
                                                return;
                                            }
                                        }

                                        // All rows loaded - show completion message
                                        const endMessage = document.createElement("div");
                                        endMessage.className = "scroll-end";
                                        endMessage.textContent = "✅ All matches loaded";
                                        tablesContainer.appendChild(endMessage);
                                    }
                                }

                                // Initial render
                                if (allRows.length > 0) {
                                    renderPage();
                                } else {
                                    tablesContainer.innerHTML = '<p class="status-inline-message">No matches found</p>';
                                }
                            }

                            // OPTIMIZATION: Register lazy loader for InPlay2 tab
                            TabLazyLoader.registerTab("inplay2", async () => {
                                await maFetchAndDisplayMatches(maCurrentYear, maCurrentTab);
                            });

                            // INSTANT LOAD: If this is the active tab, load immediately
                            const inplay2Panel = document.getElementById("inplay2");
                            if (inplay2Panel && inplay2Panel.classList.contains("active")) {
                                TabLazyLoader.loadTab("inplay2");
                            }
                        

                                function loadHistory(dateStr) {
                                    const url = `https://raw.githubusercontent.com/komodo513/b/refs/heads/main/assets/history2-${dateStr}.html`;

                                    fetch(url)
                                        .then((response) => response.text())
                                        .then((html) => {
                                            document.getElementById("preview").innerHTML = html;
                                        })
                                        .catch((error) => {
                                            document.getElementById("preview").innerHTML =
                                                `No data for ${dateStr}`;
                                            console.error(error);
                                        });
                                }

                                const now = new Date();
                                const year = now.getFullYear();
                                const month = String(now.getMonth() + 1).padStart(2, "0");
                                const day = String(now.getDate()).padStart(2, "0");
                                const todayStr = `${year}-${month}-${day}`;

                                // Try today first
                                fetch(
                                    `https://raw.githubusercontent.com/komodo513/b/refs/heads/main/assets/premium_public.html?dsdsdsDsds`,
                                )
                                    .then((response) => {
                                        if (!response.ok) {
                                            throw new Error("Today missing");
                                        }
                                        return response.text();
                                    })
                                    .then((html) => {
                                        document.getElementById("preview").innerHTML = html;
                                    })
                                    .catch((error) => {
                                        // Fall back to yesterday
                                        const yesterday = new Date(now);
                                        yesterday.setDate(now.getDate() - 1);
                                        const yYear = yesterday.getFullYear();
                                        const yMonth = String(yesterday.getMonth() + 1).padStart(
                                            2,
                                            "0",
                                        );
                                        const yDay = String(yesterday.getDate()).padStart(2, "0");
                                        const yesterdayStr = `${yYear}-${yMonth}-${yDay}`;

                                        loadHistory(yesterdayStr);
                                    });
                            

(function () { const l = document.getElementById("ntfy-list"), s = document.getElementById("ntfy-status"), c = document.getElementById("msg-count"), t = document.getElementById("last-sync"), nx = document.getElementById("next-sync"), M = 3; let e, rem = 60; const uT = () => (t.innerText = "Last Update: " + new Date().toLocaleTimeString()); const conn = () => { if (e) e.close(); e = new EventSource("https://vip.betadvisor.club/history/sse?poll=1",); e.onopen = () => { c.innerText = "● Records Live"; c.style.color = "var(--win)"; c.style.borderColor = "var(--win)"; uT(); }; e.onmessage = (e) => { const d = JSON.parse(e.data); if (d.event !== "message") return; if (s) s.remove(); uT(); let m = d.message.replace(/You received a file: .*/g, "").trim(); const i = document.createElement("div"); i.className = "ntfy-item"; i.style.cssText = "background:var(--card-bg);padding:25px;border-radius:12px;border:1px solid var(--border-color);box-shadow:0 10px 30px rgba(0,0,0,.3);width:100%;box-sizing:border-box"; let a = ""; if (d.attachment) { const u = d.attachment.url; if (/\.(jpg|jpeg|png|gif|webp)$/i.test(d.attachment.name || "",)) { a = `<div style="margin-top:20px;border-radius:8px;overflow:hidden;background:var(--bg-light);border:1px solid var(--border-color)"><img src="${u}" style="width:100%;cursor:zoom-in;transition:transform .3s ease;display:block" onclick="z(this)"></div>`; } } i.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px"><span style="font-weight:700;color:var(--accent);font-size:18px;text-transform:uppercase;letter-spacing:1px">${d.title || "VIP Update"}</span><span style="font-size:11px;color:var(--text-muted);background:var(--bg-light);padding:3px 8px;border-radius:4px">${new Date(d.time * 1000).toLocaleTimeString()}</span></div>${m ? `<div style="font-size:16px;line-height:1.6;color:var(--text-light);background:var(--bg-medium);padding:15px;border-radius:8px;border-left:4px solid var(--accent)">${m}</div>` : ""}${a}`; l.insertBefore(i, l.firstChild); while (l.getElementsByClassName("ntfy-item").length > M) l.removeChild(l.lastChild); }; e.onerror = () => { }; }; conn(); setInterval(() => { rem--; if (rem <= 0) { rem = 60; l.innerHTML = ""; conn(); } nx.innerText = `in ${rem}m`; }, 60000); window.z = (g) => { const s = g.style.transform === "scale(1.5)"; g.style.transform = s ? "scale(1)" : "scale(1.5)"; g.style.cursor = s ? "zoom-in" : "zoom-out"; g.parentElement.style.zIndex = s ? "1" : "100"; g.parentElement.style.overflow = s ? "hidden" : "visible"; }; })();

                                        document
                                            .getElementById("contactForm")
                                            .addEventListener("submit", function (e) {
                                                e.preventDefault();
                                                const msg = document.getElementById("userQuery").value;
                                                const status = document.getElementById("formStatus");

                                                // Secure ntfy link with unique topic to prevent misuse
                                                fetch("https://ntfy.sh/bt365", {
                                                    method: "POST",
                                                    body: msg,
                                                    headers: { Title: "New BetAdvisor Query" },
                                                })
                                                    .then(() => {
                                                        status.textContent =
                                                            "Message sent! We'll get back to you soon.";
                                                        status.style.color = "var(--win)";
                                                        status.style.display = "block";
                                                        document.getElementById("userQuery").value = "";
                                                    })
                                                    .catch(() => {
                                                        status.textContent = "Error sending. Please try again.";
                                                        status.style.color = "var(--loss)";
                                                        status.style.display = "block";
                                                    });
                                            });
                                    

                function initializeDesktopSidebarToggle() {
                    const toggleBtn = document.getElementById("desktop-sidebar-toggle");
                    if (!toggleBtn) return;

                    const storageKey = "betadvisor_sidebar_collapsed";
                    let layoutObserver = null;
                    let layoutDebugEnabled = false;

                    const logLayoutDebug = () => {
                        if (!layoutDebugEnabled || window.innerWidth < 1024) return;

                        const tabContainer = document.querySelector(".tab-container");
                        const tabHeader = document.querySelector(".tab-header");
                        const container = document.querySelector(".container");
                        if (!tabContainer || !tabHeader || !container) return;

                        const contentRect = tabContainer.getBoundingClientRect();
                        const sidebarRect = tabHeader.getBoundingClientRect();
                        const containerRect = container.getBoundingClientRect();

                        const gapPx = Math.round(contentRect.left - (sidebarRect.left + sidebarRect.width));
                        console.log("[LayoutDebug]", {
                            gapPx,
                            sidebarLeft: Math.round(sidebarRect.left),
                            sidebarWidth: Math.round(sidebarRect.width),
                            contentLeft: Math.round(contentRect.left),
                            containerLeft: Math.round(containerRect.left),
                            cssSidebarWidth: getComputedStyle(document.documentElement).getPropertyValue("--desktop-sidebar-width").trim(),
                            collapsed: document.body.classList.contains("sidebar-collapsed"),
                        });
                    };

                    const applyState = (collapsed) => {
                        document.body.classList.toggle("sidebar-collapsed", collapsed);
                        toggleBtn.setAttribute("aria-expanded", String(!collapsed));
                        document.documentElement.style.setProperty(
                            "--desktop-sidebar-width",
                            collapsed ? "82px" : "252px",
                        );
                    };

                    const syncDesktopSidebarTop = () => {
                        const container = document.querySelector(".container");
                        const promoBar = document.getElementById("promoStickyBar");
                        const mainHeader = document.querySelector(".container > header");
                        const containerRect = container
                            ? container.getBoundingClientRect()
                            : { left: 12 };
                        const containerStyle = container
                            ? window.getComputedStyle(container)
                            : null;
                        const containerPaddingLeft = containerStyle
                            ? parseFloat(containerStyle.paddingLeft) || 0
                            : 0;
                        const sidebarLeft = Math.max(
                            8,
                            Math.round(containerRect.left + containerPaddingLeft),
                        );
                        const promoHeight = promoBar ? Math.round(promoBar.offsetHeight) : 0;
                        const headerHeight = mainHeader ? Math.round(mainHeader.offsetHeight) : 64;
                        const headerTop = Math.max(0, promoHeight);
                        const sidebarTop = headerTop + headerHeight;
                        document.documentElement.style.setProperty(
                            "--desktop-header-top",
                            `${headerTop}px`,
                        );
                        document.documentElement.style.setProperty(
                            "--desktop-sidebar-top",
                            `${sidebarTop}px`,
                        );
                        document.documentElement.style.setProperty(
                            "--desktop-sidebar-left",
                            `${sidebarLeft}px`,
                        );
                    };

                    const restore = () => {
                        const collapsed = localStorage.getItem(storageKey) === "1";
                        if (window.innerWidth >= 1024) {
                            syncDesktopSidebarTop();
                            applyState(collapsed);
                        } else {
                            document.body.classList.remove("sidebar-collapsed");
                        }

                        logLayoutDebug();
                    };

                    toggleBtn.addEventListener("click", () => {
                        if (window.innerWidth < 1024) return;
                        const willCollapse = !document.body.classList.contains("sidebar-collapsed");
                        applyState(willCollapse);
                        localStorage.setItem(storageKey, willCollapse ? "1" : "0");
                    });

                    window.addEventListener("resize", restore);
                    window.addEventListener("load", restore, { once: true });

                    if (document.fonts && document.fonts.ready) {
                        document.fonts.ready.then(restore).catch(() => { });
                    }

                    if ("ResizeObserver" in window) {
                        const container = document.querySelector(".container");
                        const promoBar = document.getElementById("promoStickyBar");
                        const mainHeader = document.querySelector(".container > header");

                        layoutObserver = new ResizeObserver(() => {
                            restore();
                        });

                        [container, promoBar, mainHeader]
                            .filter(Boolean)
                            .forEach((element) => layoutObserver.observe(element));
                    }

                    window.toggleLayoutDebug = function (enabled) {
                        layoutDebugEnabled = typeof enabled === "boolean" ? enabled : !layoutDebugEnabled;
                        console.log(
                            `[LayoutDebug] ${layoutDebugEnabled ? "enabled" : "disabled"}.`,
                        );
                        if (layoutDebugEnabled) {
                            restore();
                        }
                        return layoutDebugEnabled;
                    };

                    restore();
                }

                function switchTab(evt, tabName) {
                    document
                        .querySelectorAll(".tab-panel")
                        .forEach((panel) => panel.classList.remove("active"));
                    document
                        .querySelectorAll(".tab-button")
                        .forEach((btn) => btn.classList.remove("active"));
                    document.getElementById(tabName).classList.add("active");

                    // Handle both button clicks and select changes
                    if (evt.currentTarget) {
                        // For buttons, currentTarget is the button
                        if (evt.currentTarget.classList.contains("tab-button")) {
                            evt.currentTarget.classList.add("active");
                        } else {
                            // For select, find the parent .tab-button or the select itself
                            const parentButton = evt.currentTarget.closest(".tab-button");
                            if (parentButton) {
                                parentButton.classList.add("active");
                            } else {
                                evt.currentTarget.classList.add("active");
                            }
                        }
                    }

                    // OPTIMIZATION: Lazy-load tab data only when tab becomes active
                    TabLazyLoader.loadTab(tabName);

                    // Update URL with anchor hash
                    history.pushState(null, null, "#" + tabName);
                }

                // Handle browser back/forward navigation
                window.addEventListener("popstate", function () {
                    const hash = window.location.hash.slice(1);
                    if (hash) {
                        const tabButton = Array.from(
                            document.querySelectorAll(".tab-button"),
                        ).find((btn) =>
                            btn.getAttribute("onclick")?.includes(`'${hash}'`),
                        );
                        if (tabButton) {
                            tabButton.click();
                        }
                    }
                });

                // Activate tab from URL hash on page load
                InitializationManager.init(function () {
                    const hash = window.location.hash.slice(1);
                    if (hash) {
                        const tabButton = Array.from(
                            document.querySelectorAll(".tab-button"),
                        ).find((btn) =>
                            btn.getAttribute("onclick")?.includes(`'${hash}'`),
                        );
                        if (tabButton) {
                            tabButton.click();
                        }
                    } else {
                        // OPTIMIZATION: Load the default active tab on page load
                        const activeTab = document.querySelector(".tab-panel.active") ||
                            document.getElementById("inplay");
                        if (activeTab && TabLazyLoader.tabLoaders[activeTab.id]) {
                            TabLazyLoader.loadTab(activeTab.id);
                        }
                    }
                });

                function scrollTabs(direction) {
                    const container = document.querySelector(".tab-scroll-container");
                    const scrollAmount = 180;
                    container.scrollLeft +=
                        direction === "left" ? -scrollAmount : scrollAmount;
                }

                // Smooth-scroll helper to jump users to match listings
                function scrollToMatches() {
                    // Try several plausible targets (depending on active tab)
                    const targets = [
                        document.getElementById("ma-matchDataSection"),
                        document.querySelector(".ma-tablesContainer"),
                        document.getElementById("sports-predictions-container"),
                        document.getElementById("system2-predictions-container"),
                    ];
                    const el = targets.find((t) => t);
                    if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "start" });
                    } else {
                        // Fallback: scroll main container
                        const main =
                            document.querySelector("main") ||
                            document.querySelector(".container");
                        if (main)
                            main.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                }

                function updateScrollIndicators() {
                    const container = document.querySelector(".tab-scroll-container");
                    const leftBtn = document.querySelector(".scroll-left");
                    const rightBtn = document.querySelector(".scroll-right");

                    leftBtn.style.opacity = container.scrollLeft > 0 ? "1" : "0.5";
                    rightBtn.style.opacity =
                        container.scrollLeft <
                            container.scrollWidth - container.clientWidth
                            ? "1"
                            : "0.5";
                }

                document
                    .querySelector(".tab-scroll-container")
                    .addEventListener("scroll", updateScrollIndicators);
                window.addEventListener("resize", updateScrollIndicators);
                updateScrollIndicators();

                InitializationManager.init(function () {
                    initializeDesktopSidebarToggle();
                });
            

                // Trial Modal Functions
                window.openTrialModal = function () {
                    const modal = document.getElementById('trialModal');
                    if (!modal) {
                        console.error('Trial modal not found');
                        return;
                    }
                    modal.classList.add('open');
                    modal.style.display = 'flex';

                    // Track conversion attempt
                    if (typeof ga !== 'undefined') {
                        ga('send', 'event', 'Conversion', 'modal_open', 'trial');
                    }
                };

                window.closeTrialModal = function () {
                    const modal = document.getElementById('trialModal');
                    if (!modal) return;
                    modal.classList.remove('open');
                    modal.style.display = 'none';
                };

                // Close modal on background click
                document.addEventListener('DOMContentLoaded', function () {
                    const modal = document.getElementById('trialModal');
                    if (modal) {
                        modal.addEventListener('click', function (event) {
                            if (event.target === modal) {
                                closeTrialModal();
                            }
                        });
                    }
                });
            

        /* =========================================================
           The sections below were originally inline <script> blocks
           inside index.html. They have been moved here verbatim (each
           wrapped in its own IIFE to preserve the exact same scoping /
           execution semantics it had before) so that all JavaScript now
           lives in this single external file.
           ========================================================= */

        // ---- Moved from inline <script type="module"> (Sports tab predictions countdown + data logic) ----
        (function () {
            "use strict";
                        window.predCountdown = function () {
                            return {
                                hours: "00",
                                minutes: "00",
                                seconds: "00",
                                init() {
                                    this.updateCountdown();
                                    setInterval(() => this.updateCountdown(), 1000);
                                },
                                updateCountdown() {
                                    const now = new Date(),
                                        tomorrow = new Date(now);
                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                    tomorrow.setHours(10, 0, 0, 0);
                                    if (now.getHours() < 10) tomorrow.setDate(now.getDate());
                                    const diff = tomorrow - now,
                                        hrs = Math.floor(diff / 3600000),
                                        mins = Math.floor((diff % 3600000) / 60000),
                                        secs = Math.floor((diff % 60000) / 1000);
                                    this.hours = hrs < 10 ? "0" + hrs : hrs;
                                    this.minutes = mins < 10 ? "0" + mins : mins;
                                    this.seconds = secs < 10 ? "0" + secs : secs;
                                },
                            };
                        };

                        InitializationManager.init(function () {
                            let predictionsData = {};
                            let filteredData = {};
                            let leagues = new Set();
                            let years = new Set();
                            let isInitialLoad = true;
                            const BET_AMOUNT = 100;
                            const predictionsContainer = document.getElementById(
                                "sports-predictions-container",
                            );
                            const searchInput =
                                document.getElementById("pred-search-input");
                            const leagueFilter =
                                document.getElementById("pred-league-filter");
                            const predictionFilter = document.getElementById(
                                "pred-prediction-filter",
                            );
                            const oddsRangeMin = document.getElementById(
                                "pred-odds-range-min",
                            );
                            const oddsRangeMax = document.getElementById(
                                "pred-odds-range-max",
                            );
                            const confidenceRangeMin = document.getElementById(
                                "pred-confidence-range-min",
                            );
                            const confidenceRangeMax = document.getElementById(
                                "pred-confidence-range-max",
                            );
                            const matchTypeFilter = document.getElementById(
                                "pred-match-type-filter",
                            );
                            const monthFilter =
                                document.getElementById("pred-month-filter");
                            const yearFilter = document.getElementById("pred-year-filter");
                            const dateRangeFilter =
                                document.getElementById("pred-date-range");
                            const refreshBtn = document.getElementById("pred-refresh-btn");
                            const navToggle = document.querySelector(".pred-nav-toggle");
                            const filters = document.querySelector(".pred-filters");
                            const filterSummary = document.getElementById("filter-summary");
                            const liveCounter = document.getElementById("live-counter");
                            const filterMessage = document.getElementById("filter-message");

                            navToggle.addEventListener("click", () => {
                                filters.classList.toggle("active");
                            });

                            // Add filter feedback listeners
                            const filterElements = [
                                leagueFilter,
                                predictionFilter,
                                matchTypeFilter,
                                monthFilter,
                                yearFilter,
                                dateRangeFilter,
                            ];

                            filterElements.forEach((filter) => {
                                filter.addEventListener("change", function () {
                                    showFilterFeedback();
                                    applyFilters();
                                });
                            });

                            [
                                oddsRangeMin,
                                oddsRangeMax,
                                confidenceRangeMin,
                                confidenceRangeMax,
                            ].forEach((input) => {
                                input.addEventListener("input", function () {
                                    showFilterFeedback();
                                    clearTimeout(this.debounceTimer);
                                    this.debounceTimer = setTimeout(() => {
                                        applyFilters();
                                    }, 300);
                                });
                            });

                            searchInput.addEventListener("input", function () {
                                showFilterFeedback();
                                clearTimeout(this.debounceTimer);
                                this.debounceTimer = setTimeout(() => {
                                    applyFilters();
                                }, 300);
                            });

                            refreshBtn.addEventListener("click", fetchData);

                            const totalPredictions = document.getElementById(
                                "pred-total-predictions",
                            );
                            const avgConfidence = document.getElementById(
                                "pred-avg-confidence",
                            );
                            const highestOdds =
                                document.getElementById("pred-highest-odds");
                            const lowestOdds = document.getElementById("pred-lowest-odds");
                            const avgOdds = document.getElementById("pred-avg-odds");
                            const winRate = document.getElementById("pred-win-rate");
                            const roi = document.getElementById("pred-roi");
                            const yieldElement = document.getElementById("pred-yield");
                            const longestStreak = document.getElementById(
                                "pred-longest-streak",
                            );
                            const currentStreak = document.getElementById(
                                "pred-current-streak",
                            );
                            const totalProfit =
                                document.getElementById("pred-total-profit");

                            // Show filter feedback
                            function showFilterFeedback() {
                                filterSummary.style.display = "flex";
                                filterMessage.textContent = "Applying filters...";
                                liveCounter.classList.remove("pulse");
                                predictionsContainer.classList.add("filtering");
                            }

                            // Show toast notification
                            function showToast(message, duration = 3000) {
                                const toast = document.createElement("div");
                                toast.className = "toast";
                                toast.innerHTML = `✓ ${message}`;
                                document.body.appendChild(toast);

                                setTimeout(() => {
                                    toast.style.opacity = "0";
                                    toast.style.transform = "translateX(100%)";
                                    setTimeout(() => toast.remove(), 300);
                                }, duration);
                            }

                            // FIXED: CORS-compatible fetch function
                            async function fetchWithCORS(url) {
                                // Try direct fetch first
                                try {
                                    const response = await fetch(url);
                                    if (response.ok) return response;
                                } catch (error) {
                                    console.log("Direct fetch failed, trying CORS proxy...");
                                }

                                // Fallback to CORS proxy
                                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
                                try {
                                    const response = await fetch(proxyUrl);
                                    if (!response.ok)
                                        throw new Error(`CORS proxy error: ${response.status}`);
                                    const data = await response.json();

                                    // Create a fake response object with the parsed content
                                    return {
                                        ok: true,
                                        json: async () => JSON.parse(data.contents),
                                        status: 200,
                                    };
                                } catch (error) {
                                    throw new Error(
                                        `Failed to fetch data via CORS proxy: ${error.message}`,
                                    );
                                }
                            }

                            async function fetchData() {
                                // Provide immediate feedback and prevent duplicate refreshes
                                try {
                                    if (typeof refreshBtn !== "undefined" && refreshBtn) {
                                        refreshBtn.disabled = true;
                                        refreshBtn.classList.add("loading");
                                    }

                                    showToast("Refreshing data...");
                                    predictionsContainer.innerHTML = `
                      <div class="pred-skeleton-card">
                          <div class="pred-skeleton pred-skeleton-line-sm pred-gap-lg"></div>
                          <div class="pred-skeleton pred-skeleton-line-lg"></div>
                          <div class="pred-flex pred-gap-md">
                            <div class="pred-skeleton pred-skeleton-line-xs pred-width-35"></div>
                            <div class="pred-skeleton pred-skeleton-line-xs pred-width-20"></div>
                          </div>
                          <div class="pred-flex pred-gap-lg">
                              <div class="pred-skeleton pred-skeleton-line-xs"></div>
                              <div class="pred-skeleton pred-skeleton-line-xs"></div>
                          </div>
                      </div>
                      <div class="pred-skeleton-card">
                          <div class="pred-skeleton pred-skeleton-line-sm pred-gap-lg"></div>
                          <div class="pred-skeleton pred-skeleton-line-lg"></div>
                          <div class="pred-flex pred-gap-md">
                            <div class="pred-skeleton pred-skeleton-line-xs pred-width-35"></div>
                            <div class="pred-skeleton pred-skeleton-line-xs pred-width-20"></div>
                          </div>
                          <div class="pred-flex pred-gap-lg">
                              <div class="pred-skeleton pred-skeleton-line-xs"></div>
                              <div class="pred-skeleton pred-skeleton-line-xs"></div>
                          </div>
                      </div>
                      <div class="pred-skeleton-card">
                          <div class="pred-skeleton pred-skeleton-line-sm pred-gap-lg"></div>
                          <div class="pred-skeleton pred-skeleton-line-lg"></div>
                          <div class="pred-flex pred-gap-md">
                            <div class="pred-skeleton pred-skeleton-line-xs pred-width-35"></div>
                            <div class="pred-skeleton pred-skeleton-line-xs pred-width-20"></div>
                          </div>
                          <div class="pred-flex pred-gap-lg">
                              <div class="pred-skeleton pred-skeleton-line-xs"></div>
                              <div class="pred-skeleton pred-skeleton-line-xs"></div>
                          </div>
                      </div>
                  `;
                                    totalPredictions.innerHTML = `<div class="pred-skeleton pred-skeleton-stat"></div>`;
                                    avgConfidence.innerHTML = `<div class="pred-skeleton pred-skeleton-stat"></div>`;
                                    highestOdds.innerHTML = `<div class="pred-skeleton pred-skeleton-stat"></div>`;
                                    lowestOdds.innerHTML = `<div class="pred-skeleton pred-skeleton-stat"></div>`;
                                    avgOdds.innerHTML = `<div class="pred-skeleton pred-skeleton-stat"></div>`;
                                    winRate.innerHTML = `<div class="pred-skeleton pred-skeleton-stat"></div>`;
                                    roi.innerHTML = `<div class="pred-skeleton pred-skeleton-stat"></div>`;
                                    yieldElement.innerHTML = `<div class="pred-skeleton pred-skeleton-stat"></div>`;
                                    longestStreak.innerHTML = `<div class="pred-skeleton pred-skeleton-stat"></div>`;
                                    currentStreak.innerHTML = `<div class="pred-skeleton pred-skeleton-stat"></div>`;
                                    totalProfit.innerHTML = `<div class="pred-skeleton pred-skeleton-stat"></div>`;

                                    // OPTIMIZED: Use CacheService with 15-minute cache
                                    const dataUrl =
                                        "https://raw.githubusercontent.com/oscarkemboi/app/master/j2.json";

                                    const jsonData = await CacheService.fetchWithCache(
                                        'sports-j2-predictions',
                                        async () => {
                                            const response = await fetchWithCORS(dataUrl);
                                            if (!response.ok) {
                                                throw new Error(`HTTP error! status: ${response.status}`);
                                            }
                                            return await response.json();
                                        },
                                        15 * 60 * 1000 // 15 minutes cache
                                    );
                                    const allData = {};

                                    if (jsonData.matches && Array.isArray(jsonData.matches)) {
                                        jsonData.matches.forEach((match) => {
                                            const date = match.Date;
                                            if (!allData[date]) {
                                                allData[date] = [];
                                            }
                                            allData[date].push(match);
                                        });
                                    } else {
                                        throw new Error(
                                            "Invalid data format: matches array not found",
                                        );
                                    }

                                    if (Object.keys(allData).length === 0) {
                                        throw new Error("No data found in JSON");
                                    }

                                    processData(allData);
                                    showToast("Data refreshed successfully!");
                                } catch (error) {
                                    showError(
                                        `Failed to load predictions data: ${error.message}. Please try again.`,
                                    );
                                    console.error("Error fetching data:", error);
                                    showToast("Error loading data", 5000);
                                } finally {
                                    if (typeof refreshBtn !== "undefined" && refreshBtn) {
                                        refreshBtn.disabled = false;
                                        refreshBtn.classList.remove("loading");
                                    }
                                }
                            }

                            function processData(data) {
                                predictionsData = {};
                                leagues = new Set();
                                years = new Set();

                                Object.keys(data).forEach((date) => {
                                    const dateObj = new Date(date);
                                    const matches = data[date];
                                    const matchesArray = Array.isArray(matches)
                                        ? matches
                                        : [matches];

                                    matchesArray.forEach((match) => {
                                        if (match["Actual Score"]) {
                                            const actualScoreParts = match["Actual Score"]
                                                .split("-")
                                                .map((s) => parseInt(s.trim()));
                                            const totalGoals =
                                                actualScoreParts[0] + actualScoreParts[1];
                                            match.isWin = match.Win;
                                            const scoreBasedWin =
                                                (match.Prediction === "Over2.5" &&
                                                    totalGoals > 2.5) ||
                                                (match.Prediction === "Under2.5" && totalGoals < 2.5);
                                            if (match.isWin !== scoreBasedWin) {
                                                console.warn(
                                                    `Inconsistent win status for match on ${date}: ${match["Team A"]} vs ${match["Team B"]}`,
                                                );
                                            }
                                        } else {
                                            match.isWin = null;
                                        }

                                        if (match.Profit !== undefined) {
                                            match.calculatedProfit = match.Profit;
                                        } else {
                                            match.calculatedProfit = match.isWin
                                                ? (match.Odds - 1) * BET_AMOUNT
                                                : -BET_AMOUNT;
                                        }

                                        const bet = {
                                            type: "single bet",
                                            matches: [match],
                                            odds: match.Odds,
                                            confidence: match.Confidence,
                                            date: dateObj,
                                            isWin: match.isWin,
                                            profit: match.calculatedProfit,
                                        };

                                        if (!predictionsData[date]) {
                                            predictionsData[date] = [];
                                        }
                                        predictionsData[date].push(bet);
                                        leagues.add(match.League);
                                        years.add(dateObj.getFullYear());
                                    });
                                });

                                populateLeagueFilter();
                                populateYearFilter();

                                if (isInitialLoad) {
                                    const currentYear = new Date().getFullYear();
                                    if (years.has(currentYear)) {
                                        yearFilter.value = currentYear;
                                    }
                                    // Set default values for new filters
                                    oddsRangeMin.value = "1.95";
                                    oddsRangeMax.value = "9.19";
                                    confidenceRangeMin.value = "56";
                                    confidenceRangeMax.value = "99";
                                    isInitialLoad = false;
                                }

                                applyFilters();
                            }

                            function populateLeagueFilter() {
                                leagueFilter.innerHTML =
                                    '<option value="all">All Leagues</option>';
                                const sortedLeagues = Array.from(leagues).sort();
                                sortedLeagues.forEach((league) => {
                                    const option = document.createElement("option");
                                    option.value = league;
                                    option.textContent = league;
                                    leagueFilter.appendChild(option);
                                });
                            }

                            function populateYearFilter() {
                                yearFilter.innerHTML =
                                    '<option value="all">All Years</option>';
                                const sortedYears = Array.from(years).sort((a, b) => b - a);
                                sortedYears.forEach((year) => {
                                    const option = document.createElement("option");
                                    option.value = year;
                                    option.textContent = year;
                                    yearFilter.appendChild(option);
                                });
                            }

                            function applyFilters() {
                                const searchTerm = searchInput.value.toLowerCase();
                                const league = leagueFilter.value;
                                const prediction = predictionFilter.value;
                                const oddsMin = parseFloat(oddsRangeMin.value) || 0;
                                const oddsMax = parseFloat(oddsRangeMax.value) || Infinity;
                                const confidenceMin = parseInt(confidenceRangeMin.value) || 0;
                                const confidenceMax =
                                    parseInt(confidenceRangeMax.value) || 100;
                                const matchType = matchTypeFilter.value;
                                const month = monthFilter.value;
                                const year = yearFilter.value;
                                const dateRange = dateRangeFilter.value;

                                filteredData = {};

                                Object.keys(predictionsData).forEach((date) => {
                                    const dateObj = new Date(date);

                                    // Apply year filter
                                    if (year !== "all" && dateObj.getFullYear() != year) {
                                        return;
                                    }

                                    // Apply month filter
                                    if (month !== "all" && dateObj.getMonth() != month) {
                                        return;
                                    }

                                    // Apply date range filter
                                    if (dateRange !== "all") {
                                        const currentDate = new Date();
                                        currentDate.setHours(0, 0, 0, 0);

                                        if (
                                            dateRange === "today" &&
                                            dateObj.toDateString() !== currentDate.toDateString()
                                        ) {
                                            return;
                                        }

                                        if (dateRange === "tomorrow") {
                                            const tomorrow = new Date(currentDate);
                                            tomorrow.setDate(currentDate.getDate() + 1);
                                            if (
                                                dateObj.toDateString() !== tomorrow.toDateString()
                                            ) {
                                                return;
                                            }
                                        }

                                        if (dateRange === "week") {
                                            const weekStart = new Date(currentDate);
                                            weekStart.setDate(
                                                currentDate.getDate() - currentDate.getDay(),
                                            );
                                            const weekEnd = new Date(weekStart);
                                            weekEnd.setDate(weekStart.getDate() + 6);
                                            if (dateObj < weekStart || dateObj > weekEnd) {
                                                return;
                                            }
                                        }
                                    }

                                    const filteredBets = predictionsData[date].filter((bet) => {
                                        const match = bet.matches[0];
                                        const matchesSearch =
                                            match["Team A"].toLowerCase().includes(searchTerm) ||
                                            match["Team B"].toLowerCase().includes(searchTerm) ||
                                            match.League.toLowerCase().includes(searchTerm);
                                        if (searchTerm && !matchesSearch) return false;

                                        if (league !== "all" && match.League !== league)
                                            return false;
                                        if (
                                            prediction !== "all" &&
                                            match.Prediction !== prediction
                                        )
                                            return false;

                                        // Apply odds range filter
                                        if (match.Odds < oddsMin || match.Odds > oddsMax)
                                            return false;

                                        // Apply confidence range filter (convert to percentage)
                                        const confidencePercent = match.Confidence * 100;
                                        if (
                                            confidencePercent < confidenceMin ||
                                            confidencePercent > confidenceMax
                                        )
                                            return false;

                                        // Apply match type filter
                                        if (matchType !== "all") {
                                            const leagueName = match.League.toLowerCase();
                                            if (matchType === "domestic") {
                                                // Exclude cups, qualifiers, international
                                                if (
                                                    leagueName.includes("cup") ||
                                                    leagueName.includes("qualif") ||
                                                    leagueName.includes("champions league") ||
                                                    leagueName.includes("europa") ||
                                                    leagueName.includes("international") ||
                                                    leagueName.includes("friendly")
                                                ) {
                                                    return false;
                                                }
                                            } else if (matchType === "cups") {
                                                if (!leagueName.includes("cup")) return false;
                                            } else if (matchType === "qualifiers") {
                                                if (!leagueName.includes("qualif")) return false;
                                            } else if (matchType === "international") {
                                                if (
                                                    !leagueName.includes("international") &&
                                                    !leagueName.includes("friendly") &&
                                                    !leagueName.includes("champions league") &&
                                                    !leagueName.includes("europa")
                                                ) {
                                                    return false;
                                                }
                                            }
                                        }

                                        return true;
                                    });

                                    if (filteredBets.length > 0) {
                                        filteredData[date] = filteredBets;
                                    }
                                });

                                updateStats();
                                renderPredictions();

                                // Update filter feedback
                                predictionsContainer.classList.remove("filtering");
                                const totalMatches = Object.values(filteredData).reduce(
                                    (sum, bets) => sum + bets.length,
                                    0,
                                );
                                filterMessage.textContent = `Showing ${totalMatches} matches`;
                                liveCounter.textContent = `${totalMatches} matches`;
                                liveCounter.classList.add("pulse");
                            }

                            function updateStats() {
                                let totalBets = 0;
                                let completedBets = 0;
                                let confidenceSum = 0;
                                let oddsSum = 0;
                                let maxOdds = 0;
                                let minOdds = Infinity;
                                let profitSum = 0;
                                let wins = 0;
                                let currentWinningStreak = 0;
                                let maxWinningStreak = 0;

                                const betsWithResults = [];

                                Object.keys(filteredData).forEach((date) => {
                                    filteredData[date].forEach((bet) => {
                                        totalBets++;
                                        if (bet.isWin !== null) {
                                            betsWithResults.push(bet);
                                        }
                                    });
                                });

                                betsWithResults.sort((a, b) => a.date - b.date);

                                let tempStreak = 0;
                                betsWithResults.forEach((bet) => {
                                    completedBets++;
                                    confidenceSum += bet.confidence;
                                    oddsSum += bet.odds;

                                    if (bet.odds > maxOdds) {
                                        maxOdds = bet.odds;
                                    }
                                    if (bet.odds < minOdds) {
                                        minOdds = bet.odds;
                                    }

                                    profitSum += bet.profit;

                                    if (bet.isWin) {
                                        wins++;
                                        tempStreak++;
                                        maxWinningStreak = Math.max(maxWinningStreak, tempStreak);
                                    } else {
                                        tempStreak = 0;
                                    }
                                });

                                // Calculate current streak
                                for (let i = betsWithResults.length - 1; i >= 0; i--) {
                                    if (betsWithResults[i].isWin) {
                                        currentWinningStreak++;
                                    } else {
                                        break;
                                    }
                                }

                                const winRateValue =
                                    completedBets > 0
                                        ? ((wins / completedBets) * 100).toFixed(0) + "%"
                                        : "--";
                                const roiValue =
                                    completedBets > 0
                                        ? (
                                            (profitSum / (completedBets * BET_AMOUNT)) *
                                            100
                                        ).toFixed(0) + "%"
                                        : "--";
                                const yieldValue =
                                    completedBets > 0
                                        ? (
                                            (profitSum / (completedBets * BET_AMOUNT)) *
                                            100
                                        ).toFixed(0) + "%"
                                        : "--";
                                const avgConfidenceValue =
                                    completedBets > 0
                                        ? ((confidenceSum / completedBets) * 100).toFixed(0) + "%"
                                        : "--";
                                const avgOddsValue =
                                    completedBets > 0
                                        ? (oddsSum / completedBets).toFixed(2)
                                        : "--";

                                totalPredictions.textContent = totalBets;
                                avgConfidence.textContent = avgConfidenceValue;
                                highestOdds.textContent =
                                    maxOdds !== 0 ? maxOdds.toFixed(2) : "--";
                                lowestOdds.textContent =
                                    minOdds !== Infinity ? minOdds.toFixed(2) : "--";
                                avgOdds.textContent = avgOddsValue;
                                winRate.textContent = winRateValue;
                                roi.textContent = roiValue;
                                yieldElement.textContent = yieldValue;
                                longestStreak.textContent = maxWinningStreak;
                                currentStreak.textContent = currentWinningStreak;

                                const formattedProfit = new Intl.NumberFormat("en-US", {
                                    style: "currency",
                                    currency: "EUR",
                                    currencyDisplay: "symbol",
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                }).format(Math.round(profitSum));

                                totalProfit.textContent = formattedProfit;

                                if (profitSum > 0) {
                                    totalProfit.style.color = "var(--win)";
                                } else if (profitSum < 0) {
                                    totalProfit.style.color = "var(--loss)";
                                } else {
                                    totalProfit.style.color = "";
                                }

                                if (completedBets > 0) {
                                    const roiNumber = parseFloat(roiValue);
                                    const yieldNumber = parseFloat(yieldValue);
                                    roi.style.color =
                                        roiNumber > 0
                                            ? "var(--win)"
                                            : roiNumber < 0
                                                ? "var(--loss)"
                                                : "";
                                    yieldElement.style.color =
                                        yieldNumber > 0
                                            ? "var(--win)"
                                            : yieldNumber < 0
                                                ? "var(--loss)"
                                                : "";
                                }
                            }

                            function renderPredictions() {
                                predictionsContainer.innerHTML = "";
                                const sortedDates = Object.keys(filteredData).sort(
                                    (a, b) => new Date(b) - new Date(a),
                                );

                                if (sortedDates.length === 0) {
                                    predictionsContainer.innerHTML =
                                        '<div class="pred-no-predictions">No predictions match your criteria.</div>';
                                    return;
                                }

                                const fragment = document.createDocumentFragment();

                                sortedDates.forEach((date) => {
                                    filteredData[date].forEach((bet) => {
                                        const predictionCard = document.createElement("div");
                                        predictionCard.className = "pred-prediction-card";
                                        predictionCard.onclick = function () {
                                            showMatchDetails(bet.matches[0]);
                                        };

                                        // Add pulse animation for filtered matches
                                        setTimeout(() => {
                                            predictionCard.classList.add("filter-match");
                                            setTimeout(() => {
                                                predictionCard.classList.remove("filter-match");
                                            }, 500);
                                        }, 100);

                                        if (bet.isWin !== null) {
                                            const resultClass = bet.isWin ? "win" : "loss";
                                            predictionCard.classList.add(resultClass);
                                        }

                                        const match = bet.matches[0];
                                        const scoreHTML = match["Actual Score"]
                                            ? `<div class="pred-meta-row pred-score-row"><span class="pred-score">Score: ${match["Actual Score"]}</span><span class="pred-result ${match.isWin ? "pred-result-win" : "pred-result-loss"}">${match.isWin ? "Win" : "Loss"}</span></div>`
                                            : "";

                                        const formattedDate = new Date(date).toLocaleDateString(
                                            "en-US",
                                            {
                                                weekday: "short",
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            },
                                        );

                                        const betResultHTML =
                                            bet.isWin !== null
                                                ? `<span class="pred-bet-result ${bet.isWin ? "pred-result-win" : "pred-result-loss"}">${bet.isWin ? "Win" : "Loss"}</span>`
                                                : "";

                                        const profitToneClass =
                                            bet.profit > 0
                                                ? "pred-profit-positive"
                                                : bet.profit < 0
                                                    ? "pred-profit-negative"
                                                    : "pred-profit-pending";

                                        predictionCard.innerHTML = `
                          <div class="pred-date">${formattedDate}</div>
                          <div class="pred-match">
                              <span class="pred-team">&#x26BD; ${match["Team A"]} vs ${match["Team B"]}</span>
                              <div class="pred-meta-row">
                                  <span class="pred-league">${match.League}</span>
                                  <span class="pred-prediction">${match.Prediction}</span>
                              </div>
                              <div class="pred-meta-row">
                                  <span class="pred-confidence">Confidence: ${Math.round(match.Confidence * 100)}%</span>
                                  <span class="pred-odds">Odds: ${match.Odds.toFixed(2)}</span>
                              </div>
                              ${scoreHTML}
                          </div>
                          <div class="pred-bet-info">
                              <span class="pred-bet-type">Type: ${bet.type}</span>
                              <span class="pred-bet-odds">Odds: ${bet.odds.toFixed(2)}</span>
                              ${betResultHTML}
                              <span class="pred-bet-profit ${profitToneClass}" title="${bet.profit === 0 ? "Result pending – still awaiting update" : ""}">
                                  Stake: €100 💰
                                  Return ${bet.profit > 0 ? `💵 +💶${bet.profit.toFixed(0)}` : bet.profit < 0 ? `💶${bet.profit.toFixed(0)}` : "⏳"}
                              </span>
                          </div>
                      `;

                                        fragment.appendChild(predictionCard);
                                    });
                                });

                                predictionsContainer.appendChild(fragment);
                            }

                            function showMatchDetails(match) {
                                alert(
                                    `Match Details:\n\n${match["Team A"]} vs ${match["Team B"]}\nLeague: ${match.League}\nPrediction: ${match.Prediction}\nOdds: ${match.Odds}\nConfidence: ${Math.round(match.Confidence * 100)}%\n${match["Actual Score"] ? `Score: ${match["Actual Score"]}` : "Match pending"}`,
                                );
                            }

                            function showError(message) {
                                predictionsContainer.innerHTML = `<div class="pred-error">${message}</div>`;
                            }

                            // OPTIMIZATION: Register lazy loader for Sports tab
                            TabLazyLoader.registerTab("sports", fetchData);
                        });
        })();

        // ---- Moved from inline <script> (Platinum plan signup form handler) ----
                            function submitPlatinumForm() {
                                const email = document.getElementById("platinum-email").value.trim();
                                const sport = document.getElementById("platinum-sport").value.trim();
                                const status = document.getElementById("platinum-status");
                                const form = document.getElementById("platinum-form");
                                const success = document.getElementById("platinum-success");
                                if (!email || !email.includes("@")) { status.textContent = "Please enter a valid email address."; status.style.color = "#f87171"; return; }
                                status.textContent = "Submitting...";
                                status.style.color = "#fbbf24";
                                fetch("https://vip.betadvisor.club/platinum", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ email: email, sport: sport || "not specified", plan: "platinum", timestamp: new Date().toISOString() })
                                })
                                    .then(r => { if (r.ok) { form.style.display = "none"; success.style.display = "block"; } else { status.textContent = "Error. Try again."; status.style.color = "#f87171"; } })
                                    .catch(() => { status.textContent = "Network error."; status.style.color = "#f87171"; });
                            }

        // ---- Moved from inline <script type="module"> (Firebase init + System 2 tab predictions logic) ----
        (async function () {
            "use strict";
        const { ref, get } = await import("https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js");
        const firebaseConfig = {
            apiKey: "AIzaSyCfp4PGXs9pWu9peShjSo0lypghaKXLzmM",
            authDomain: "node-328ce.firebaseapp.com",
            databaseURL: "https://node-328ce-default-rtdb.firebaseio.com",
            projectId: "node-328ce",
            storageBucket: "node-328ce.appspot.com",
            messagingSenderId: "808266794466",
            appId: "1:808266794466:web:d20cdc5913200a417be5bb",
            measurementId: "G-2JG2TG8PV6",
        };
        let database = null;
        try {
            const firebaseInstance = await window.FirebaseService.init(firebaseConfig);
            database = firebaseInstance.database;
        } catch (error) {
            console.warn("Firebase initialization failed, using REST fallback only:", error);
        }
        window.countdown = function () {
            return {
                hours: "00",
                minutes: "00",
                seconds: "00",
                init() {
                    this.updateCountdown();
                    setInterval(() => this.updateCountdown(), 1000);
                },
                updateCountdown() {
                    const now = new Date();
                    const tomorrow = new Date(now);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(10, 0, 0, 0);
                    if (now.getHours() < 10) {
                        tomorrow.setDate(now.getDate());
                    }
                    const difference = tomorrow - now;
                    let hrs = Math.floor(difference / (1000 * 60 * 60));
                    let mins = Math.floor(
                        (difference % (1000 * 60 * 60)) / (1000 * 60),
                    );
                    let secs = Math.floor((difference % (1000 * 60)) / 1000);
                    this.hours = hrs < 10 ? "0" + hrs : hrs;
                    this.minutes = mins < 10 ? "0" + mins : mins;
                    this.seconds = secs < 10 ? "0" + secs : secs;
                },
            };
        };

        window.InitializationManager.init(function () {
            let predictionsData = {};
            let filteredData = {};
            let leagues = new Set();
            let years = new Set();
            let isInitialLoad = true;
            const BET_AMOUNT = 100;

            const predictionsContainer = document.getElementById(
                "system2-predictions-container",
            );
            const searchInput = document.getElementById("system2-search-input");
            const leagueFilter = document.getElementById("system2-league-filter");
            const predictionFilter = document.getElementById(
                "system2-prediction-filter",
            );
            const oddsRangeMin = document.getElementById("system2-odds-range-min");
            const oddsRangeMax = document.getElementById("system2-odds-range-max");
            const confidenceRangeMin = document.getElementById(
                "system2-confidence-range-min",
            );
            const confidenceRangeMax = document.getElementById(
                "system2-confidence-range-max",
            );
            const matchTypeFilter = document.getElementById(
                "system2-match-type-filter",
            );
            const monthFilter = document.getElementById("system2-month-filter");
            const yearFilter = document.getElementById("system2-year-filter");
            const dateRangeFilter = document.getElementById("system2-date-range");
            const refreshBtn = document.getElementById("system2-refresh-btn");
            const navToggle = document.querySelector(".nav-toggle");
            const filters = document.querySelector(".filters");
            const filterSummary = document.getElementById("system2-filter-summary");
            const filterMessage = document.getElementById("system2-filter-message");
            const liveCounter = document.getElementById("system2-live-counter");

            // Event listener for mobile filter toggle
            if (navToggle && filters) {
                navToggle.addEventListener("click", () => {
                    filters.classList.toggle("active");
                });
            }

            // Enhanced filter feedback
            function showFilterFeedback() {
                filterSummary.style.display = "flex";
                filterMessage.textContent = "Applying filters...";
                liveCounter.classList.remove("pulse");
                predictionsContainer.classList.add("filtering");
            }

            // Show toast notification
            function showToast(message, duration = 3000) {
                const toast = document.createElement("div");
                toast.className = "toast";
                toast.innerHTML = `✓ ${message}`;
                document.body.appendChild(toast);

                setTimeout(() => {
                    toast.style.opacity = "0";
                    toast.style.transform = "translateX(100%)";
                    setTimeout(() => toast.remove(), 300);
                }, duration);
            }

            // --- Event listeners for all filters including new ones ---
            const filterElements = [
                leagueFilter,
                predictionFilter,
                matchTypeFilter,
                monthFilter,
                yearFilter,
                dateRangeFilter,
            ];

            filterElements.forEach((filter) => {
                filter.addEventListener("change", function () {
                    showFilterFeedback();
                    applyFilters();
                });
            });

            [
                oddsRangeMin,
                oddsRangeMax,
                confidenceRangeMin,
                confidenceRangeMax,
            ].forEach((input) => {
                input.addEventListener("input", function () {
                    showFilterFeedback();
                    clearTimeout(this.debounceTimer);
                    this.debounceTimer = setTimeout(() => {
                        applyFilters();
                    }, 300);
                });
            });

            searchInput.addEventListener("input", function () {
                showFilterFeedback();
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    applyFilters();
                }, 300);
            });

            refreshBtn.addEventListener("click", fetchData);

            const totalPredictions = document.getElementById(
                "system2-total-predictions",
            );
            const avgConfidence = document.getElementById("system2-avg-confidence");
            const highestOdds = document.getElementById("system2-highest-odds");
            const lowestOdds = document.getElementById("system2-lowest-odds");
            const avgOdds = document.getElementById("system2-avg-odds");
            const winRate = document.getElementById("system2-win-rate");
            const roi = document.getElementById("system2-roi");
            const yieldElement = document.getElementById("system2-yield");
            const longestStreak = document.getElementById("system2-longest-streak");
            const currentStreak = document.getElementById("system2-current-streak");
            const totalProfit = document.getElementById("system2-total-profit");

            async function loadSystem2TableData(table) {
                const cacheKey = `system2-${table}`;
                return CacheService.fetchWithCache(
                    cacheKey,
                    async () => {
                        const withTimeout = (promise, timeoutMs, label) =>
                            Promise.race([
                                promise,
                                new Promise((_, reject) =>
                                    setTimeout(
                                        () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
                                        timeoutMs,
                                    ),
                                ),
                            ]);

                        try {
                            const dataRef = ref(database, table);
                            const snapshot = await withTimeout(
                                get(dataRef),
                                8000,
                                `Firebase ${table}`,
                            );
                            if (snapshot.exists()) {
                                return snapshot.val();
                            }
                        } catch (firebaseError) {
                            console.warn(`Firebase read failed for ${table}:`, firebaseError);
                        }

                        const restUrl = `https://node-328ce-default-rtdb.firebaseio.com/${table}.json`;
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 8000);
                        const response = await fetch(restUrl, {
                            signal: controller.signal,
                            cache: "no-store",
                        });
                        clearTimeout(timeoutId);
                        if (!response.ok) {
                            throw new Error(`REST fallback failed for ${table}: ${response.status}`);
                        }

                        return await response.json();
                    },
                    15 * 60 * 1000,
                );
            }

            async function fetchData() {
                try {
                    showToast("Refreshing data...");
                    // Show skeleton loader while fetching
                    predictionsContainer.innerHTML = `
                      <div class="skeleton-card">
                      <div class="skeleton skeleton-line-sm skeleton-gap-lg"></div>
                          <div class="skeleton skeleton-line-lg"></div>
                      <div class="flex skeleton-gap-md">
                        <div class="skeleton skeleton-line-xs skeleton-width-35"></div>
                        <div class="skeleton skeleton-line-xs skeleton-width-20"></div>
                          </div>
                      <div class="flex skeleton-gap-lg">
                              <div class="skeleton skeleton-line-xs"></div>
                              <div class="skeleton skeleton-line-xs"></div>
                          </div>
                          <div class="skeleton skeleton-line-lg"></div>
                      <div class="flex skeleton-gap-md">
                        <div class="skeleton skeleton-line-xs skeleton-width-35"></div>
                        <div class="skeleton skeleton-line-xs skeleton-width-20"></div>
                          </div>
                      </div>`;

                    // Load top picks from GitHub (same source as Sports)
                    const dataUrl = "https://raw.githubusercontent.com/oscarkemboi/app/master/j2.json";

                    const jsonData = await CacheService.fetchWithCache(
                        'system2-predictions',
                        async () => {
                            // Try direct fetch first
                            try {
                                const response = await fetch(dataUrl);
                                if (response.ok) {
                                    return await response.json();
                                }
                            } catch (error) {
                                console.log("Direct fetch failed, trying CORS proxy...");
                            }

                            // Fallback to CORS proxy
                            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(dataUrl)}`;
                            const response = await fetch(proxyUrl);
                            if (!response.ok) {
                                throw new Error(`CORS proxy error: ${response.status}`);
                            }
                            const data = await response.json();
                            return JSON.parse(data.contents);
                        },
                        15 * 60 * 1000 // 15 minutes cache
                    );

                    if (!jsonData || !jsonData.matches) {
                        showError("No data available for System2 predictions");
                        return;
                    }

                    // Process data into predictionsData object organized by date
                    predictionsData = {};
                    leagues.clear();
                    years.clear();

                    jsonData.matches.forEach((match) => {
                        const date = match.Date;
                        if (!date) return;
                        if (!predictionsData[date]) {
                            predictionsData[date] = [];
                        }

                        // Extract year and add to years set
                        const dateObj = new Date(date);
                        years.add(dateObj.getFullYear().toString());

                        // Add league to leagues set
                        if (match.League) {
                            leagues.add(match.League);
                        }

                        // Parse confidence as decimal if provided as percentage
                        let confidence = match.Confidence || 0;
                        if (confidence > 1) {
                            confidence = confidence / 100;
                        }

                        // Determine if bet has result
                        const isWin =
                            match.Win !== undefined ? match.Win : null;

                        const betData = {
                            matches: [match],
                            type: match.Prediction || "Unknown",
                            odds: parseFloat(match.Odds) || 1.0,
                            confidence: confidence,
                            isWin: isWin,
                            profit: match.Profit || 0,
                            date: dateObj,
                        };

                        predictionsData[date].push(betData);
                    });

                    // Update filter options
                    const leagueOptions = Array.from(leagues).sort();
                    leagueFilter.innerHTML = '<option value="all">All Leagues</option>';
                    leagueOptions.forEach((league) => {
                        const option = document.createElement("option");
                        option.value = league;
                        option.textContent = league;
                        leagueFilter.appendChild(option);
                    });

                    const yearOptions = Array.from(years)
                        .sort()
                        .reverse();
                    yearFilter.innerHTML = '<option value="all">All Years</option>';
                    yearOptions.forEach((year) => {
                        const option = document.createElement("option");
                        option.value = year;
                        option.textContent = year;
                        yearFilter.appendChild(option);
                    });

                    // Apply initial filter and render
                    applyFilters();

                    if (isInitialLoad) {
                        isInitialLoad = false;
                    }

                    showToast("✓ Data refreshed successfully!");
                } catch (error) {
                    console.error("Error fetching System2 data:", error);
                    showError(
                        `Error loading predictions: ${error.message || "Unknown error"}. Please try refreshing.`,
                    );
                }
            }

            function applyFilters() {
                const searchTerm = searchInput.value.toLowerCase();
                const league = leagueFilter.value;
                const prediction = predictionFilter.value;
                const oddsMin = parseFloat(oddsRangeMin.value) || 0;
                const oddsMax = parseFloat(oddsRangeMax.value) || Infinity;
                const confidenceMin = parseInt(confidenceRangeMin.value) || 0;
                const confidenceMax =
                    parseInt(confidenceRangeMax.value) || 100;
                const matchType = matchTypeFilter.value;
                const month = monthFilter.value;
                const year = yearFilter.value;
                const dateRange = dateRangeFilter.value;

                filteredData = {};

                Object.keys(predictionsData).forEach((date) => {
                    const dateObj = new Date(date);

                    // Apply year filter
                    if (year !== "all" && dateObj.getFullYear().toString() !== year) {
                        return;
                    }

                    // Apply month filter
                    if (month !== "all" && dateObj.getMonth().toString() !== month) {
                        return;
                    }

                    // Apply date range filter
                    if (dateRange !== "all") {
                        const currentDate = new Date();
                        currentDate.setHours(0, 0, 0, 0);

                        if (
                            dateRange === "today" &&
                            dateObj.toDateString() !== currentDate.toDateString()
                        ) {
                            return;
                        }

                        if (dateRange === "tomorrow") {
                            const tomorrow = new Date(currentDate);
                            tomorrow.setDate(currentDate.getDate() + 1);
                            if (
                                dateObj.toDateString() !== tomorrow.toDateString()
                            ) {
                                return;
                            }
                        }

                        if (dateRange === "week") {
                            const weekStart = new Date(currentDate);
                            weekStart.setDate(
                                currentDate.getDate() - currentDate.getDay(),
                            );
                            const weekEnd = new Date(weekStart);
                            weekEnd.setDate(weekStart.getDate() + 6);
                            if (dateObj < weekStart || dateObj > weekEnd) {
                                return;
                            }
                        }
                    }

                    const filteredBets = predictionsData[date].filter((bet) => {
                        const match = bet.matches[0];
                        const matchesSearch =
                            match["Team A"].toLowerCase().includes(searchTerm) ||
                            match["Team B"].toLowerCase().includes(searchTerm) ||
                            match.League.toLowerCase().includes(searchTerm);
                        if (searchTerm && !matchesSearch) return false;

                        if (league !== "all" && match.League !== league)
                            return false;
                        if (
                            prediction !== "all" &&
                            match.Prediction !== prediction
                        )
                            return false;

                        // Apply odds range filter
                        if (match.Odds < oddsMin || match.Odds > oddsMax)
                            return false;

                        // Apply confidence range filter (convert to percentage)
                        const confidencePercent = match.Confidence * 100;
                        if (
                            confidencePercent < confidenceMin ||
                            confidencePercent > confidenceMax
                        )
                            return false;

                        // Apply match type filter
                        if (matchType !== "all") {
                            const leagueName = match.League.toLowerCase();
                            if (matchType === "domestic") {
                                if (
                                    leagueName.includes("cup") ||
                                    leagueName.includes("qualif") ||
                                    leagueName.includes("champions league") ||
                                    leagueName.includes("europa") ||
                                    leagueName.includes("international") ||
                                    leagueName.includes("friendly")
                                ) {
                                    return false;
                                }
                            } else if (matchType === "cups") {
                                if (!leagueName.includes("cup")) return false;
                            } else if (matchType === "qualifiers") {
                                if (!leagueName.includes("qualif")) return false;
                            } else if (matchType === "international") {
                                if (
                                    !leagueName.includes("international") &&
                                    !leagueName.includes("friendly") &&
                                    !leagueName.includes("champions league") &&
                                    !leagueName.includes("europa")
                                ) {
                                    return false;
                                }
                            }
                        }

                        return true;
                    });

                    if (filteredBets.length > 0) {
                        filteredData[date] = filteredBets;
                    }
                });

                updateStats();
                renderPredictions();

                // Update filter feedback
                predictionsContainer.classList.remove("filtering");
                const totalMatches = Object.values(filteredData).reduce(
                    (sum, bets) => sum + bets.length,
                    0,
                );
                filterMessage.textContent = `Showing ${totalMatches} matches`;
                liveCounter.textContent = `${totalMatches} matches`;
                liveCounter.classList.add("pulse");
            }

            function updateStats() {
                let totalBets = 0;
                let completedBets = 0;
                let confidenceSum = 0;
                let oddsSum = 0;
                let maxOdds = 0;
                let minOdds = Infinity;
                let profitSum = 0;
                let wins = 0;
                let currentWinningStreak = 0;
                let maxWinningStreak = 0;

                const betsWithResults = [];

                Object.keys(filteredData).forEach((date) => {
                    filteredData[date].forEach((bet) => {
                        totalBets++;
                        if (bet.isWin !== null) {
                            betsWithResults.push(bet);
                        }
                    });
                });

                betsWithResults.sort((a, b) => a.date - b.date);

                let tempStreak = 0;
                betsWithResults.forEach((bet) => {
                    completedBets++;
                    confidenceSum += bet.confidence;
                    oddsSum += bet.odds;

                    if (bet.odds > maxOdds) {
                        maxOdds = bet.odds;
                    }
                    if (bet.odds < minOdds) {
                        minOdds = bet.odds;
                    }

                    profitSum += bet.profit;

                    if (bet.isWin) {
                        wins++;
                        tempStreak++;
                        maxWinningStreak = Math.max(maxWinningStreak, tempStreak);
                    } else {
                        tempStreak = 0;
                    }
                });

                // Calculate current streak
                for (let i = betsWithResults.length - 1; i >= 0; i--) {
                    if (betsWithResults[i].isWin) {
                        currentWinningStreak++;
                    } else {
                        break;
                    }
                }

                const winRateValue =
                    completedBets > 0
                        ? ((wins / completedBets) * 100).toFixed(2)
                        : 0;
                const roiValue =
                    completedBets > 0
                        ? ((profitSum / (completedBets * BET_AMOUNT)) * 100).toFixed(2)
                        : 0;
                const yieldValue =
                    completedBets > 0
                        ? ((profitSum / (completedBets * BET_AMOUNT)) * 100).toFixed(2)
                        : 0;
                const avgConfidenceValue =
                    completedBets > 0
                        ? (confidenceSum / completedBets * 100).toFixed(2)
                        : 0;
                const avgOddsValue =
                    completedBets > 0
                        ? (oddsSum / completedBets).toFixed(2)
                        : 0;

                // Update DOM
                totalPredictions.innerHTML = totalBets;
                avgConfidence.innerHTML = `${avgConfidenceValue}%`;
                highestOdds.innerHTML = maxOdds === 0 ? "N/A" : maxOdds.toFixed(2);
                lowestOdds.innerHTML = minOdds === Infinity ? "N/A" : minOdds.toFixed(2);
                avgOdds.innerHTML = avgOddsValue;
                winRate.innerHTML = `${winRateValue}%`;
                roi.innerHTML = `${roiValue}%`;
                yieldElement.innerHTML = `${yieldValue}%`;
                longestStreak.innerHTML = maxWinningStreak;
                currentStreak.innerHTML = currentWinningStreak;
                totalProfit.innerHTML = `€${profitSum.toFixed(0)}`;
            }

            function renderPredictions() {
                predictionsContainer.innerHTML = "";
                const sortedDates = Object.keys(filteredData).sort(
                    (a, b) => new Date(b) - new Date(a),
                );

                if (sortedDates.length === 0) {
                    predictionsContainer.innerHTML =
                        '<div class="pred-no-predictions">No predictions match your criteria.</div>';
                    return;
                }

                const fragment = document.createDocumentFragment();

                sortedDates.forEach((date) => {
                    filteredData[date].forEach((bet) => {
                        const predictionCard = document.createElement("div");
                        predictionCard.className = "pred-prediction-card";
                        predictionCard.onclick = function () {
                            showMatchDetails(bet.matches[0]);
                        };

                        // Add pulse animation for filtered matches
                        setTimeout(() => {
                            predictionCard.classList.add("filter-match");
                            setTimeout(() => {
                                predictionCard.classList.remove("filter-match");
                            }, 500);
                        }, 100);

                        if (bet.isWin !== null) {
                            const resultClass = bet.isWin ? "win" : "loss";
                            predictionCard.classList.add(resultClass);
                        }

                        const match = bet.matches[0];
                        const scoreHTML = match["Actual Score"]
                            ? `<div class="pred-meta-row pred-score-row"><span class="pred-score">Score: ${match["Actual Score"]}</span><span class="pred-result ${match.isWin ? "pred-result-win" : "pred-result-loss"}">${match.isWin ? "Win" : "Loss"}</span></div>`
                            : "";

                        const formattedDate = new Date(date).toLocaleDateString(
                            "en-US",
                            {
                                weekday: "short",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                            },
                        );

                        const betResultHTML =
                            bet.isWin !== null
                                ? `<span class="pred-bet-result ${bet.isWin ? "pred-result-win" : "pred-result-loss"}">${bet.isWin ? "Win" : "Loss"}</span>`
                                : "";

                        const profitToneClass =
                            bet.profit > 0
                                ? "pred-profit-positive"
                                : bet.profit < 0
                                    ? "pred-profit-negative"
                                    : "pred-profit-pending";

                        predictionCard.innerHTML = `
                  <div class="pred-date">${formattedDate}</div>
                  <div class="pred-match">
                      <span class="pred-team">&#x26BD; ${match["Team A"]} vs ${match["Team B"]}</span>
                      <div class="pred-meta-row">
                          <span class="pred-league">${match.League}</span>
                          <span class="pred-prediction">${match.Prediction}</span>
                      </div>
                      <div class="pred-meta-row">
                          <span class="pred-confidence">Confidence: ${Math.round(match.Confidence * 100)}%</span>
                          <span class="pred-odds">Odds: ${match.Odds.toFixed(2)}</span>
                      </div>
                      ${scoreHTML}
                  </div>
                  <div class="pred-bet-info">
                      <span class="pred-bet-type">Type: ${bet.type}</span>
                      <span class="pred-bet-odds">Odds: ${bet.odds.toFixed(2)}</span>
                      ${betResultHTML}
                      <span class="pred-bet-profit ${profitToneClass}" title="${bet.profit === 0 ? "Result pending – still awaiting update" : ""}">
                          Stake: €100 💰
                          Return ${bet.profit > 0 ? `💵 +€${bet.profit.toFixed(0)}` : bet.profit < 0 ? `€${bet.profit.toFixed(0)}` : "⏳"}
                      </span>
                  </div>
              `;

                        fragment.appendChild(predictionCard);
                    });
                });

                predictionsContainer.appendChild(fragment);
            }

            function showMatchDetails(match) {
                alert(
                    `Match Details:\n\n${match["Team A"]} vs ${match["Team B"]}\nLeague: ${match.League}\nPrediction: ${match.Prediction}\nOdds: ${match.Odds}\nConfidence: ${Math.round(match.Confidence * 100)}%\n${match["Actual Score"] ? `Score: ${match["Actual Score"]}` : "Match pending"}`,
                );
            }

            function showError(message) {
                predictionsContainer.innerHTML = `<div class="pred-error">${message}</div>`;
            }

            // Initial fetch on tab load
            fetchData();
        });
        })();
