
// --- Constants & Config ---
const CONFIG = {
    STORAGE_KEY: 'tracker_2026_data',
    HABIT_IDS: {
        NO_MCDONALDS: 'no_mcdonalds',
        LOW_SOCIAL_MEDIA: 'low_social_media',
        READ_BOOK: 'read_book',
        PLASTIC_USED: 'plastic_used',
        PLASTIC_AVOIDED: 'plastic_avoided',
        WALKS: 'walks'
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
            return {
                [CONFIG.HABIT_IDS.NO_MCDONALDS]: false,
                [CONFIG.HABIT_IDS.LOW_SOCIAL_MEDIA]: false,
                [CONFIG.HABIT_IDS.READ_BOOK]: false,
                [CONFIG.HABIT_IDS.PLASTIC_USED]: 0,
                [CONFIG.HABIT_IDS.PLASTIC_AVOIDED]: 0,
                [CONFIG.HABIT_IDS.WALKS]: 0
            };
        }
        return data[dateStr];
    }

    static updateDay(dateStr, updates) {
        const data = this.getData();
        const currentDay = this.getDay(dateStr);
        data[dateStr] = { ...currentDay, ...updates };
        this.saveData(data);
        return data[dateStr];
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
        if (isWeekend) return 5;

        let score = 0;

        // 1. McDonalds
        if (dayData[CONFIG.HABIT_IDS.NO_MCDONALDS]) score++;

        // 2. Social Media
        if (dayData[CONFIG.HABIT_IDS.LOW_SOCIAL_MEDIA]) score++;

        // 3. Read Book
        if (dayData[CONFIG.HABIT_IDS.READ_BOOK]) score++;

        // 4. Plastic (Success if used < 3)
        if (dayData[CONFIG.HABIT_IDS.PLASTIC_USED] < 3) score++;

        // 5. Walks (Success if walks >= 1)
        if (dayData[CONFIG.HABIT_IDS.WALKS] >= 1) score++;

        return score;
    }

    static getStatusColor(score) {
        if (score === 5) return 'var(--status-gold)';
        if (score === 4) return 'var(--status-green)';
        if (score >= 2) return 'var(--status-yellow)';
        if (score === 1) return 'var(--status-gray)';
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
            const action = e.target.dataset.action;
            const id = e.target.dataset.id;
            if (!action) return;

            this.handleAction(action, id);
        });
    }

    handleAction(action, id) {
        const dayData = App.Storage.getDay(this.currentDate);

        switch (action) {
            case 'toggle-habit': // Habits 1-3
                App.Storage.updateDay(this.currentDate, { [id]: !dayData[id] });
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

            case 'prev-day':
                this.changeDay(-1);
                break;

            case 'next-day':
                this.changeDay(1);
                break;

            case 'switch-view':
                this.currentView = this.currentView === 'dashboard' ? 'stats' : 'dashboard';
                break;
        }

        this.render(); // Re-render whole app on state change (SPA style)
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

        return `
            <div class="dashboard ${isWeekend ? 'weekend-mode' : ''}">
                ${isWeekend ? '<div class="weekend-banner">🎉 Weekend Mode: Auto-Success Active!</div>' : ''}
                
                <!-- Habit 1: McDonalds -->
                ${this.renderToggleCard(
            App.Config.HABIT_IDS.NO_MCDONALDS,
            "No McDonalds Breakfast",
            "🍔",
            data[App.Config.HABIT_IDS.NO_MCDONALDS],
            isWeekend
        )}

                <!-- Habit 2: Social Media -->
                ${this.renderToggleCard(
            App.Config.HABIT_IDS.LOW_SOCIAL_MEDIA,
            "Social Media < 30m",
            "📱",
            data[App.Config.HABIT_IDS.LOW_SOCIAL_MEDIA],
            isWeekend
        )}

                <!-- Habit 3: Read Book -->
                ${this.renderToggleCard(
            App.Config.HABIT_IDS.READ_BOOK,
            "Read Book",
            "📚",
            data[App.Config.HABIT_IDS.READ_BOOK],
            isWeekend
        )}

                <!-- Habit 4: Plastic -->
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
            isWeekend || data[App.Config.HABIT_IDS.PLASTIC_USED] < 3
        )}
                    
                    ${this.renderCounterCard(
            "plastic-avoided-card",
            "Plastics Avoided",
            "♻️",
            data[App.Config.HABIT_IDS.PLASTIC_AVOIDED],
            'Count: ',
            'step="1"',
            "increment-avoided",
            "decrement-avoided",
            false
        )}
                </div>

                <!-- Habit 5: Walks -->
                ${this.renderWalkCard(
            App.Config.HABIT_IDS.WALKS,
            "Office Walks",
            "🚶",
            data[App.Config.HABIT_IDS.WALKS],
            isWeekend
        )}
            </div>
        `;
    }

    renderStats() {
        const stats = this.calculateYearlyStats();

        return `
            <div class="stats-view">
                <!-- Yearly Summary -->
                <div class="stats-summary">
                    <div class="stat-box">
                        <span class="stat-value">${stats.perfectDays}</span>
                        <span class="stat-label">Perfect Days (Gold)</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-value">${stats.plasticAvoided}</span>
                        <span class="stat-label">Plastic Avoided</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-value">${stats.totalWalks}</span>
                        <span class="stat-label">Total Walks</span>
                    </div>
                </div>

                <!-- Calendar Grid -->
                ${this.renderCalendar()}
                
                <!-- Legend -->
                <div class="legend">
                    <div class="legend-item"><span class="dot" style="background:var(--status-gold)"></span> 5/5</div>
                    <div class="legend-item"><span class="dot" style="background:var(--status-green)"></span> 4/5</div>
                    <div class="legend-item"><span class="dot" style="background:var(--status-yellow)"></span> 2-3</div>
                    <div class="legend-item"><span class="dot" style="background:var(--status-gray)"></span> 1</div>
                    <div class="legend-item"><span class="dot" style="background:var(--status-red)"></span> 0</div>
                </div>
            </div>
        `;
    }

    calculateYearlyStats() {
        // In a real app, we might cache this or optimize. For valid localstorage size, iterating all keys is fine.
        const allData = App.Storage.getData();
        let perfectDays = 0;
        let plasticAvoided = 0; // Derived from "Avoided" field if we tracked it, or just assume "Used < 3" means avoided? 
        // User asked: "Give me a counter as well for the number of single use plastics I actively avoided."
        // Ah, I missed adding a specific "Avoided" counter in the UI! I added "Used". 
        // I will fix the UI to add the "Avoided" counter in the Dashboard as well.
        // For now let's read what we have.

        let totalWalks = 0;

        Object.keys(allData).forEach(dateStr => {
            if (!dateStr.startsWith('2026')) return; // Filter for 2026 (or just all time)

            const dayData = allData[dateStr];
            const score = App.Logic.calculateDailyScore(dayData, dateStr);
            if (score === 5) perfectDays++;

            // For now, plastic avoided handles manually? User asked for a counter. 
            // I'll assume I need to add that input to dashboard.
            // Using what exists:
            if (dayData[App.Config.HABIT_IDS.WALKS]) totalWalks += dayData[App.Config.HABIT_IDS.WALKS];
            if (dayData[App.Config.HABIT_IDS.PLASTIC_AVOIDED]) plasticAvoided += dayData[App.Config.HABIT_IDS.PLASTIC_AVOIDED];
        });

        return { perfectDays, plasticAvoided, totalWalks };
    }

    renderCalendar() {
        // Render 12 months for 2026
        const months = [];
        for (let m = 0; m < 12; m++) {
            months.push(this.renderMonth(m));
        }
        return `<div class="calendar-list">${months.join('')}</div>`;
    }

    renderMonth(monthIndex) {
        const year = 2026;
        const date = new Date(year, monthIndex, 1);
        const monthName = date.toLocaleString('default', { month: 'long' });
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const startDay = date.getDay(); // 0-6

        let daysHtml = '';

        // Empty slots for start
        for (let i = 0; i < startDay; i++) {
            daysHtml += `<div class="day-cell empty"></div>`;
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayData = App.Storage.getDay(dateStr); // This init empty if not exists, which is fine
            // We only want to show status if the day is in the past or today, OR if data exists? 
            // Actually user wants to see success. If future, red? Or empty?
            // "Consider I did not succeed .. unless I indicate". So default is failure (Red) for past days.
            // But for future days, maybe neutral.

            const isFuture = new Date(dateStr) > new Date();
            let color = 'var(--card-bg)';
            let content = d;

            if (!isFuture) { // Show status for today and past
                const score = App.Logic.calculateDailyScore(dayData, dateStr);
                const statusColor = App.Logic.getStatusColor(score);

                // Indicators: Gold Star, Green Circle, etc.
                if (score === 5) {
                    content = '⭐'; // Gold star replaces number or overlay? "Gold star on each day"
                    // Let's make the background text color or add an icon
                }

                // We use background color for the circle/cell
                // But user asked for specific shapes: "Gold star", "Green circle", etc.
                // We can use CSS classes.

                daysHtml += `
                    <div class="day-cell" onclick="ui.navigateTo('${dateStr}')">
                        <div class="status-indicator" style="background-color: ${statusColor}; color: ${score === 5 ? 'black' : 'white'}">
                            ${d} ${score === 5 ? '<span class="star">★</span>' : ''}
                        </div>
                    </div>`;
            } else {
                daysHtml += `<div class="day-cell future">${d}</div>`;
            }
        }

        return `
            <div class="month-block">
                <h3>${monthName}</h3>
                <div class="month-grid">
                    <div class="wday">S</div><div class="wday">M</div><div class="wday">T</div><div class="wday">W</div><div class="wday">T</div><div class="wday">F</div><div class="wday">S</div>
                    ${daysHtml}
                </div>
            </div>
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

    renderWalkCard(id, title, icon, value, isWeekend) {
        const isSuccess = isWeekend || value >= 1;

        return `
            <div class="card habit-walk ${isSuccess ? 'success' : ''}" data-action="increment-walk">
                 <div class="icon">${icon}</div>
                 <div class="details">
                    <h3>${title}</h3>
                    <p>${value} walks completed</p>
                 </div>
                 <div class="action-hint">Tap to Add</div>
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

