
// --- Constants & Config ---
const CONFIG = {
    STORAGE_KEY: 'tracker_2026_data',
    HABIT_IDS: {
        NO_MCDONALDS: 'no_mcdonalds',
        LOW_SOCIAL_MEDIA: 'low_social_media',
        READ_BOOK: 'read_book',
        PLASTIC_USED: 'plastic_used',
        PLASTIC_AVOIDED: 'plastic_avoided',
        WALKS: 'walks',
        READ_PAGES: 'read_pages',
        DUOLINGO: 'duolingo',
        INBOX_REVIEW: 'inbox_review',
        COMPLEMENT: 'complement'
    }
};

// --- Data Layer ---
class StorageManager {
    static getData() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || {};
        } catch (e) {
            console.error("Data load failed", e);
            return {};
        }
    }

    static saveData(data) {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("Data save failed", e);
        }
    }

    static getDay(dateStr) {
        const data = this.getData();
        if (!data[dateStr]) {
            // Initialize day if missing
            const isWeekend = HabitLogic.isWeekend(dateStr);
            return {
                dayType: isWeekend ? 'play' : 'work', // Default: M-F Work, Sat-Sun Play
                [CONFIG.HABIT_IDS.NO_MCDONALDS]: false,
                [CONFIG.HABIT_IDS.LOW_SOCIAL_MEDIA]: false,
                [CONFIG.HABIT_IDS.READ_BOOK]: false,
                [CONFIG.HABIT_IDS.PLASTIC_USED]: 0,
                [CONFIG.HABIT_IDS.PLASTIC_AVOIDED]: 0,
                [CONFIG.HABIT_IDS.WALKS]: 0,
                [CONFIG.HABIT_IDS.READ_PAGES]: false,
                [CONFIG.HABIT_IDS.DUOLINGO]: false,
                [CONFIG.HABIT_IDS.INBOX_REVIEW]: false,
                [CONFIG.HABIT_IDS.COMPLEMENT]: false
            };
        }
        return data[dateStr];
    }

    static updateDay(dateStr, updates) {
        const data = this.getData();
        const currentDay = this.getDay(dateStr);
        data[dateStr] = { ...currentDay, ...updates };
        this.saveData(data);
        this.saveData(data);
        return data[dateStr];
    }

    static clearData() {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
    }
}

// --- Business Logic ---
class HabitLogic {
    static isWeekend(dateStr) {
        // dateStr format: YYYY-MM-DD
        // Create date object using local time (append T00:00:00 to ensure local parsing)
        const date = new Date(dateStr + 'T00:00:00');
        const day = date.getDay();
        return day === 0 || day === 6; // 0 = Sun, 6 = Sat
    }

    static checkSuccess(habitId, dayData, dateStr) {
        const isWeekend = this.isWeekend(dateStr);
        if (isWeekend) return true;

        switch (habitId) {
            case CONFIG.HABIT_IDS.NO_MCDONALDS:
            case CONFIG.HABIT_IDS.LOW_SOCIAL_MEDIA:
            case CONFIG.HABIT_IDS.READ_BOOK:
                return dayData[habitId] === true;

            case 'plastic_habit': // Special case handling in calculateScore
                return dayData[CONFIG.HABIT_IDS.PLASTIC_USED] < 3;

            case CONFIG.HABIT_IDS.WALKS:
                return dayData[CONFIG.HABIT_IDS.WALKS] >= 1;

            default:
                return false;
        }
    }

    static calculateDailyScore(dayData, dateStr) {
        const isWeekend = this.isWeekend(dateStr);
        // Ensure dayType exists (for older data)
        const dayType = dayData.dayType || (isWeekend ? 'play' : 'work');
        let score = 0;

        // 1. Required Habits (5) 
        if (dayData[CONFIG.HABIT_IDS.READ_PAGES]) score++;
        if (dayData[CONFIG.HABIT_IDS.DUOLINGO]) score++;
        if (dayData[CONFIG.HABIT_IDS.NO_MCDONALDS]) score++;
        if (dayData[CONFIG.HABIT_IDS.LOW_SOCIAL_MEDIA]) score++;
        // Plastic (Success if used < 3) - Now Required
        if (dayData[CONFIG.HABIT_IDS.PLASTIC_USED] < 3) score++;

        // 2. Work Habits (2) - Only if Work Day
        if (dayType === 'work') {
            if (dayData[CONFIG.HABIT_IDS.INBOX_REVIEW]) score++;
            if (dayData[CONFIG.HABIT_IDS.COMPLEMENT]) score++;
        }

        return score;
    }

    static getStatusColor(score, dayType) {
        const maxScore = dayType === 'work' ? 7 : 5;

        if (score === maxScore) return 'var(--status-gold)';

        // Dynamic thresholds
        // Green: >= 70% roughly
        // Yellow: >= 40% roughly

        const pct = score / maxScore;

        if (pct >= 0.7) return 'var(--status-green)';
        if (pct >= 0.4) return 'var(--status-yellow)';
        if (pct > 0) return 'var(--status-gray)';
        return 'var(--status-red)';
    }
}


// Global Export
window.App = {
    Storage: StorageManager,
    Logic: HabitLogic,
    Config: CONFIG
};

// --- UI Layout & Rendering ---
class UI {
    constructor() {
        this.app = document.getElementById('app');
        this.currentDate = this.getToday();
        this.currentView = 'dashboard'; // 'dashboard' | 'stats'

        this.init();
    }

    getToday() {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    }

    init() {
        this.render();
        this.attachGlobalListeners();
    }

    attachGlobalListeners() {
        // Delegate events from app container
        this.app.addEventListener('click', (e) => {
            // 1. Handle Button Defaults (Prevent Form Submit / Reload)
            const btn = e.target.closest('button');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
            }

            // 2. Find Action Element (Button or Card)
            const actionEl = e.target.closest('[data-action]');
            if (!actionEl) return;

            const action = actionEl.dataset.action;
            const id = actionEl.dataset.id;

            this.handleAction(action, id);
        });
    }

    handleAction(action, id) {
        const dayData = App.Storage.getDay(this.currentDate);

        switch (action) {
            case 'toggle-habit': // Habits 1-3
                // Special handling for READ_BOOK to open modal
                if (id === App.Config.HABIT_IDS.READ_BOOK) {
                    const currentVal = dayData[id];
                    if (!currentVal) {
                        // Open Modal to Add
                        this.openBookModal();
                        return;
                    } else {
                        // Toggle Off (set to false)
                        App.Storage.updateDay(this.currentDate, { [id]: false });
                    }
                } else {
                    App.Storage.updateDay(this.currentDate, { [id]: !dayData[id] });
                }
                break;

            case 'increment-plastic':
                App.Storage.updateDay(this.currentDate, {
                    [App.Config.HABIT_IDS.PLASTIC_USED]: (dayData[App.Config.HABIT_IDS.PLASTIC_USED] || 0) + 1
                });
                break;

            case 'decrement-plastic':
                const currentPlastic = dayData[App.Config.HABIT_IDS.PLASTIC_USED] || 0;
                if (currentPlastic > 0) {
                    App.Storage.updateDay(this.currentDate, {
                        [App.Config.HABIT_IDS.PLASTIC_USED]: currentPlastic - 1
                    });
                }
                break;

            case 'increment-avoided':
                App.Storage.updateDay(this.currentDate, {
                    [App.Config.HABIT_IDS.PLASTIC_AVOIDED]: (dayData[App.Config.HABIT_IDS.PLASTIC_AVOIDED] || 0) + 1
                });
                break;

            case 'decrement-avoided':
                const currentAvoided = dayData[App.Config.HABIT_IDS.PLASTIC_AVOIDED] || 0;
                if (currentAvoided > 0) {
                    App.Storage.updateDay(this.currentDate, {
                        [App.Config.HABIT_IDS.PLASTIC_AVOIDED]: currentAvoided - 1
                    });
                }
                break;

            case 'increment-walk':
                App.Storage.updateDay(this.currentDate, {
                    [App.Config.HABIT_IDS.WALKS]: (dayData[App.Config.HABIT_IDS.WALKS] || 0) + 1
                });
                break;

            case 'decrement-walk':
                const currentWalks = dayData[App.Config.HABIT_IDS.WALKS] || 0;
                if (currentWalks > 0) {
                    App.Storage.updateDay(this.currentDate, {
                        [App.Config.HABIT_IDS.WALKS]: currentWalks - 1
                    });
                }
                break;

            case 'prev-day':
                this.changeDay(-1);
                break;

            case 'next-day':
                this.changeDay(1);
                break;

            case 'switch-view':
                this.currentView = this.currentView === 'dashboard' ? 'stats' : 'dashboard';
                break;

            case 'set-day-type':
                App.Storage.updateDay(this.currentDate, { dayType: id });
                break;

            case 'clear-data':
                this.openConfirmModal();
                return; // Return early
        }

        this.render();
    }

    openConfirmModal() {
        const modal = document.getElementById('confirm-modal');
        const form = document.getElementById('confirm-form');
        const cancelBtn = document.getElementById('cancel-confirm-btn');

        if (!modal) return;

        modal.showModal();

        const closeHandler = () => {
            modal.close();
            cleanup();
        };

        const submitHandler = (e) => {
            e.preventDefault();
            App.Storage.clearData();
            window.location.reload();
            modal.close();
        };

        const cleanup = () => {
            cancelBtn.removeEventListener('click', closeHandler);
            form.removeEventListener('submit', submitHandler);
        };

        cancelBtn.addEventListener('click', closeHandler);
        form.addEventListener('submit', submitHandler);
    }

    openBookModal() {
        const modal = document.getElementById('book-modal');
        const form = document.getElementById('book-form');
        const cancelBtn = document.getElementById('cancel-book-btn');

        if (!modal) return;

        // Reset inputs
        form.reset();

        // Show Modal
        modal.showModal();

        // Handlers (oneshot)
        const closeHandler = () => {
            modal.close();
            cleanup();
        };

        const submitHandler = (e) => {
            e.preventDefault();
            const title = document.getElementById('book-title').value;
            const rating = parseFloat(document.getElementById('book-rating').value);

            if (title && !isNaN(rating)) {
                App.Storage.updateDay(this.currentDate, {
                    [App.Config.HABIT_IDS.READ_BOOK]: { title, rating }
                });
                this.render(); // Re-render to show checked state
            }
            modal.close();
        };

        const cleanup = () => {
            cancelBtn.removeEventListener('click', closeHandler);
            form.removeEventListener('submit', submitHandler);
        };

        cancelBtn.addEventListener('click', closeHandler);
        form.addEventListener('submit', submitHandler);
    }

    changeDay(offset) {
        const date = new Date(this.currentDate);
        date.setDate(date.getDate() + offset);
        this.currentDate = date.toISOString().split('T')[0];
    }

    render() {
        this.app.innerHTML = `
            ${this.renderHeader()}
            <main class="content">
                ${this.currentView === 'dashboard' ? this.renderDashboard() : this.renderStats()}
            </main>
        `;
    }

    renderHeader() {
        const today = this.getToday();
        const isToday = this.currentDate === today;

        return `
            <header class="app-header">
                <div class="date-nav">
                    <button data-action="prev-day" class="nav-btn">&larr;</button>
                    <span class="date-display">
                        ${this.formatDate(this.currentDate)}
                        ${isToday ? '<span class="badge">Today</span>' : ''}
                    </span>
                    <button data-action="next-day" class="nav-btn" ${isToday ? 'disabled' : ''}>&rarr;</button>
                </div>
                <button data-action="switch-view" class="view-btn">
                    ${this.currentView === 'dashboard' ? 'Stats' : 'Tracker'}
                </button>
            </header>
        `;
    }

    renderDashboard() {
        const data = App.Storage.getDay(this.currentDate);
        const isWeekend = App.Logic.isWeekend(this.currentDate);
        // Default to logic if not set (though getDay ensures it is set)
        const dayType = data.dayType || (isWeekend ? 'play' : 'work');

        // Check if book is completed (truthy object or true)
        const bookCompleted = !!data[App.Config.HABIT_IDS.READ_BOOK];
        const bookDetails = typeof data[App.Config.HABIT_IDS.READ_BOOK] === 'object'
            ? data[App.Config.HABIT_IDS.READ_BOOK]
            : null;

        return `
            <div class="dashboard ${isWeekend ? 'weekend-mode' : ''}">
                ${this.renderDayTypeToggle(dayType)}
                ${this.renderDayStatus(data, this.currentDate)}
                
                <!-- Section 1: Required Every Day -->
                <div class="section-header">Required Every Day</div>
                ${this.renderToggleCard(
            App.Config.HABIT_IDS.NO_MCDONALDS,
            "No McDonalds Breakfast",
            "🍔",
            data[App.Config.HABIT_IDS.NO_MCDONALDS],
            false
        )}
                ${this.renderToggleCard(
            App.Config.HABIT_IDS.READ_PAGES,
            "Read 10+ Pages",
            "📖",
            data[App.Config.HABIT_IDS.READ_PAGES],
            false
        )}
                ${this.renderToggleCard(
            App.Config.HABIT_IDS.DUOLINGO,
            "2+ Duolingo Lessons",
            "🦉",
            data[App.Config.HABIT_IDS.DUOLINGO],
            false
        )}
                ${this.renderToggleCard(
            App.Config.HABIT_IDS.LOW_SOCIAL_MEDIA,
            "Social Media < 30m",
            "📱",
            data[App.Config.HABIT_IDS.LOW_SOCIAL_MEDIA],
            false
        )}
                <div class="plastic-group">
                    ${this.renderCounterCard(
            "plastic-card",
            "Plastics Used",
            "🥤",
            data[App.Config.HABIT_IDS.PLASTIC_USED],
            'Count: ',
            'step="1"',
            "increment-plastic",
            "decrement-plastic",
            data[App.Config.HABIT_IDS.PLASTIC_USED] < 3
        )}
                </div>

                <!-- Section 2: Work Habits (Conditional) -->
                ${dayType === 'work' ? `
                <div class="section-header">Work Habits</div>
                ${this.renderToggleCard(
            App.Config.HABIT_IDS.INBOX_REVIEW,
            "Inbox Review",
            "📥",
            data[App.Config.HABIT_IDS.INBOX_REVIEW],
            false
        )}
                ${this.renderToggleCard(
            App.Config.HABIT_IDS.COMPLEMENT,
            "Complement",
            "🤝",
            data[App.Config.HABIT_IDS.COMPLEMENT],
            false
        )}
                ` : ''}

                <!-- Section 3: Tracking Only -->
                <div class="section-header">Tracking Only</div>
                ${this.renderToggleCard(
            App.Config.HABIT_IDS.READ_BOOK,
            bookDetails ? `Finished: ${bookDetails.title}` : "Completed Book",
            "📚",
            bookCompleted,
            false
        )}
            </div>
        `;
    }

    renderDayTypeToggle(currentType) {
        return `
            <div class="day-type-toggle" style="display:flex; justify-content:center; gap:10px; margin-bottom:10px;">
                <button 
                    data-action="set-day-type" 
                    data-id="work" 
                    style="${currentType === 'work' ? 'background:var(--accent); color:white;' : 'background:var(--card-bg); color:var(--text-secondary);'} border:none; padding:8px 16px; border-radius:20px; font-weight:bold; transition:all 0.2s;"
                >💼 Work</button>
                <button 
                    data-action="set-day-type" 
                    data-id="play" 
                    style="${currentType === 'play' ? 'background:var(--status-green); color:black;' : 'background:var(--card-bg); color:var(--text-secondary);'} border:none; padding:8px 16px; border-radius:20px; font-weight:bold; transition:all 0.2s;"
                >🎉 Play</button>
            </div>
        `;
    }

    renderDayStatus(data, dateStr) {
        const score = App.Logic.calculateDailyScore(data, dateStr);
        const dayType = data.dayType || (App.Logic.isWeekend(dateStr) ? 'play' : 'work');
        const maxScore = dayType === 'work' ? 7 : 5;
        const color = App.Logic.getStatusColor(score, dayType);

        let icon = '🔴';
        if (score === maxScore) icon = '⭐';
        else if (score / maxScore >= 0.7) icon = '🟢';
        else if (score / maxScore >= 0.4) icon = '🟡';
        else if (score > 0) icon = '🔘';

        return `
            <div class="day-status" style="background: ${color}; color: ${score === maxScore ? 'black' : 'white'}">
                <div class="status-icon">${icon}</div>
                <div class="status-text">Status: ${score}/${maxScore} Habits</div>
            </div>
        `;
    }

    renderStats() {
        const year = new Date(this.currentDate).getFullYear();
        const stats = this.calculateYearlyStats(year);

        const avgRating = stats.bookCount > 0
            ? (stats.totalRating / stats.bookCount).toFixed(1)
            : "0.0";

        // Generate Rows
        const bookRows = stats.books.map(b => `
            <tr>
                <td>${b.date}</td>
                <td>${b.title}</td>
                <td>${b.rating} ⭐</td>
            </tr>
        `).join('');

        return `
            <div class="stats-view">
                <div class="stats-header" style="text-align:center; margin-bottom: var(--spacing-md);">
                    <h2>${year} Statistics</h2>
                </div>
                <!-- Yearly Summary -->
                <div class="stats-summary">
                    <div class="stat-box">
                        <span class="stat-value">${stats.perfectDays}</span>
                        <span class="stat-label">Perfect Days (Gold)</span>
                    </div>
                </div>

                <!-- Book Stats -->
                <details>
                    <summary>${stats.bookCount} Books Completed (Avg. Rating: ${avgRating})</summary>
                    <table class="books-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Title</th>
                                <th>Rating</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bookRows}
                        </tbody>
                    </table>
                </details>

                <!-- Calendar Grid -->
                ${this.renderCalendar(year)}
                
                <!-- Legend -->
                <div class="legend">
                    <div class="legend-item"><span class="dot" style="background:var(--status-gold)"></span> 100%</div>
                    <div class="legend-item"><span class="dot" style="background:var(--status-green)"></span> >70%</div>
                    <div class="legend-item"><span class="dot" style="background:var(--status-yellow)"></span> >40%</div>
                    <div class="legend-item"><span class="dot" style="background:var(--status-gray)"></span> >0%</div>
                    <div class="legend-item"><span class="dot" style="background:var(--status-red)"></span> 0</div>
                </div>

                <div style="text-align:center; margin-top:var(--spacing-lg)">
                    <button type="button" data-action="clear-data" style="background:var(--status-red); color:white; border:none; padding:10px 20px; border-radius:8px; font-weight:bold; cursor:pointer;">
                        Delete All Data
                    </button>
                </div>
            </div>
        `;
    }

    calculateYearlyStats(year) {
        const allData = App.Storage.getData();
        let perfectDays = 0;
        let books = [];
        let totalRating = 0;

        Object.keys(allData).forEach(dateStr => {
            if (!dateStr.startsWith(year)) return;

            const dayData = allData[dateStr];

            // Check if day matches filter criteria (if any) or existing logic
            // Note: calculateYearlyStats iterates existing keys, so data exists by definition.

            const score = App.Logic.calculateDailyScore(dayData, dateStr);
            const dayType = dayData.dayType || (App.Logic.isWeekend(dateStr) ? 'play' : 'work');
            const maxScore = dayType === 'work' ? 7 : 5;

            if (score === maxScore) perfectDays++;

            const bookData = dayData[App.Config.HABIT_IDS.READ_BOOK];
            if (bookData) {
                // Handle both old boolean true and new object
                if (typeof bookData === 'object') {
                    books.push({ date: dateStr, ...bookData });
                    totalRating += bookData.rating || 0;
                } else {
                    books.push({ date: dateStr, title: "Unknown Book", rating: 0 });
                }
            }
        });

        // Sort books by date desc
        books.sort((a, b) => b.date.localeCompare(a.date));

        return { perfectDays, books, bookCount: books.length, totalRating };
    }

    renderCalendar(year) {
        // Render 12 months for year
        const months = [];
        for (let m = 0; m < 12; m++) {
            months.push(this.renderMonth(year, m));
        }
        return `
            <div class="calendar-section">
                <h2 style="text-align:center; margin-bottom:var(--spacing-md)">Year in Review</h2>
                <div class="calendar-list">${months.join('')}</div>
            </div>
        `;
    }

    renderMonth(year, monthIndex) {
        const allData = App.Storage.getData();
        const date = new Date(year, monthIndex, 1);
        const monthName = date.toLocaleString('default', { month: 'long' });
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const startDay = date.getDay(); // 0-6

        // Calculate Month Stats (Past/Today only)
        let totalScore = 0;
        let totalMax = 0;

        // Helper to check future
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const targetD = new Date(dateStr + 'T00:00:00');

            // Logic: Count stats if date is <= today
            if (targetD <= now) {
                // Determine if data ACTUALLY exists for this day
                const hasData = !!allData[dateStr];

                if (hasData) {
                    const dayData = App.Storage.getDay(dateStr);
                    const score = App.Logic.calculateDailyScore(dayData, dateStr);
                    const dayType = dayData.dayType || (App.Logic.isWeekend(dateStr) ? 'play' : 'work');
                    const maxScore = dayType === 'work' ? 7 : 5;

                    totalScore += score;
                    totalMax += maxScore;
                } else {
                    // No data entered -> 0 score, but it IS a day that passed, so it adds to Max
                    // Default day type logic
                    const isWeekend = App.Logic.isWeekend(dateStr);
                    const maxScore = isWeekend ? 5 : 7;
                    totalMax += maxScore;
                    // totalScore += 0;
                }
            }
        }

        const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
        // Don't show % for future months (totalMax 0)
        const headerText = totalMax > 0 ? `${monthName} (${pct}%)` : monthName;

        // Render Grid
        let daysHtml = '';
        // Empty slots for start
        for (let i = 0; i < startDay; i++) {
            daysHtml += `<div class="day-cell empty"></div>`;
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayData = App.Storage.getDay(dateStr);
            const targetD = new Date(dateStr + 'T00:00:00');
            const isFuture = targetD > now;

            if (!isFuture) {
                const score = App.Logic.calculateDailyScore(dayData, dateStr);
                const dayType = dayData.dayType || (App.Logic.isWeekend(dateStr) ? 'play' : 'work');
                const maxScore = dayType === 'work' ? 7 : 5;
                const color = App.Logic.getStatusColor(score, dayType);

                daysHtml += `
                    <div class="day-cell" onclick="ui.navigateTo('${dateStr}')">
                        <div class="status-indicator" style="background-color: ${color}; color: ${score === maxScore ? 'black' : 'white'}">
                            ${d} ${score === maxScore ? '<span class="star">★</span>' : ''}
                        </div>
                    </div>`;
            } else {
                daysHtml += `<div class="day-cell future">${d}</div>`;
            }
        }

        // Use same details/summary style as books
        return `
            <details class="month-block">
                <summary>${headerText}</summary>
                <div class="month-grid" style="margin-top:var(--spacing-md)">
                    <div class="wday">S</div><div class="wday">M</div><div class="wday">T</div><div class="wday">W</div><div class="wday">T</div><div class="wday">F</div><div class="wday">S</div>
                    ${daysHtml}
                </div>
            </details>
        `;
    }

    navigateTo(dateStr) {
        this.currentDate = dateStr;
        this.currentView = 'dashboard';
        this.render();
    }

    renderToggleCard(id, title, icon, isActive, isWeekend) {
        // If weekend, always show as "success" visually, but maybe disabled or indicated auto-complete
        const success = isWeekend || isActive;

        return `
            <div class="card habit-toggle ${success ? 'success' : ''}" data-action="toggle-habit" data-id="${id}">
                <div class="icon">${icon}</div>
                <div class="details">
                    <h3>${title}</h3>
                </div>
                <div class="checkbox">
                    ${success ? '✓' : ''}
                </div>
            </div>
        `;
    }

    renderCounterCard(id, title, icon, value, label, attrs, incAction, decAction, isSuccess) {
        return `
            <div class="card habit-counter ${isSuccess ? 'success' : ''}">
                <div class="card-header">
                    <div class="icon">${icon}</div>
                    <h3>${title}</h3>
                </div>
                <div class="counter-controls">
                    <button data-action="${decAction}" class="control-btn">-</button>
                    <span class="value">${value}</span>
                    <button data-action="${incAction}" class="control-btn">+</button>
                </div>
            </div>
        `;
    }



    formatDate(dateStr) {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', options);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.ui = new UI();
});

