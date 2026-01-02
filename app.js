
// --- Constants & Config ---
const CONFIG = {
    STORAGE_KEY: 'tracker_2026_data',
    HABIT_IDS: {
        NO_MCDONALDS: 'no_mcdonalds',
        READ_PAGES: 'read_pages', // Restored
        DUOLINGO: 'duolingo', // Restored
        CREATIVITY: 'creativity', // Added
        LOW_SOCIAL_MEDIA: 'low_social_media',
        READ_BOOK: 'read_book',
        INBOX_REVIEW: 'inbox_review',
        CALENDAR_REVIEW: 'calendar_review',
        EXCERCISE_BREAK: 'excercise_break',
        CONNECT: 'connect', // Added
        REF_HAPPY: 'ref_happy',
        REF_HEALTHY: 'ref_healthy',
        REF_ACCOMPLISHED: 'ref_accomplished',
        DAILY_REFLECTION: 'daily_reflection'
    },
    STORAGE_KEY_CONNECTIONS: 'tracker_2026_connections',
    INITIAL_CONTACTS: [
        "Howard, Penny", "Howard, Jim", "Hendricks, Nancy", "Sheehan, Maggie", "Sheehan, Vincent",
        "Jimenez, Jennifer", "Jimenez, Molly", "Jimenez, Lucy", "Bickley, John", "Bonsib, Sandy",
        "Grand, Robert", "Grdina, Madeline", "Fox, Lora", "Lewis, Tim", "Moore, Christy",
        "Ondrik, Christina", "McKee, Alaina", "Cavaness, Brandon", "Paul, Logan", "Hurtubise, Jen",
        "Chambers, Cam", "Borra, Emily", "Clune, Julie", "Gast, Angie", "Chandran, Allison",
        "Leftwich, Anne", "Whitesell, John", "Stowers, Annie", "Chaora, Anesu", "McKay, Beth",
        "McKay, Stan", "Hoffman, Jim", "Snyder, Susan"
    ]
};

// --- Business Logic ---
class HabitLogic {
    static isWeekend(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        const day = date.getDay();
        return day === 0 || day === 6;
    }

    static checkSuccess(habitId, dayData, dateStr) {
        const isWeekend = this.isWeekend(dateStr);
        if (isWeekend) return true;

        switch (habitId) {
            case CONFIG.HABIT_IDS.NO_MCDONALDS:
            case CONFIG.HABIT_IDS.LOW_SOCIAL_MEDIA:
            case CONFIG.HABIT_IDS.READ_BOOK:
                return dayData[habitId] === true;
            case CONFIG.HABIT_IDS.WALKS:
                return dayData[CONFIG.HABIT_IDS.WALKS] >= 1;
            default:
                return false;
        }
    }

    static calculateDailyScore(dayData, dateStr) {
        const isWeekend = this.isWeekend(dateStr);
        const dayType = dayData.dayType || (isWeekend ? 'play' : 'work');
        let score = 0;

        if (dayData[CONFIG.HABIT_IDS.NO_MCDONALDS]) score++;
        if (dayData[CONFIG.HABIT_IDS.READ_PAGES]) score++;
        if (dayData[CONFIG.HABIT_IDS.DUOLINGO]) score++;
        if (dayData[CONFIG.HABIT_IDS.CREATIVITY]) score++;
        if (dayData[CONFIG.HABIT_IDS.CONNECT]) score++;
        if (dayData[CONFIG.HABIT_IDS.LOW_SOCIAL_MEDIA]) score++;

        if (dayType === 'work') {
            if (dayData[CONFIG.HABIT_IDS.INBOX_REVIEW]) score++;
            if (dayData[CONFIG.HABIT_IDS.CALENDAR_REVIEW]) score++;
            if (dayData[CONFIG.HABIT_IDS.EXCERCISE_BREAK]) score++;
        }

        // Derived: Daily Reflection Habit
        const hasReflections = (dayData[CONFIG.HABIT_IDS.REF_HAPPY] && dayData[CONFIG.HABIT_IDS.REF_HAPPY] !== 'na') &&
            (dayData[CONFIG.HABIT_IDS.REF_HEALTHY] && dayData[CONFIG.HABIT_IDS.REF_HEALTHY] !== 'na') &&
            (dayData[CONFIG.HABIT_IDS.REF_ACCOMPLISHED] && dayData[CONFIG.HABIT_IDS.REF_ACCOMPLISHED] !== 'na');

        if (hasReflections) score++;

        return score;
    }

    static getStatusColor(score, dayType) {
        const isWork = dayType === 'work';
        const maxScore = isWork ? 10 : 7;
        if (score === maxScore) return 'var(--status-gold)';
        if (isWork) {
            if (score >= 7) return 'var(--status-green)';
            if (score >= 4) return 'var(--status-yellow)';
        } else {
            if (score >= 5) return 'var(--status-green)';
            if (score >= 3) return 'var(--status-yellow)';
        }
        return 'var(--status-red)';
    }
}

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
            const isWeekend = HabitLogic.isWeekend(dateStr);
            return {
                dayType: isWeekend ? 'play' : 'work',
                [CONFIG.HABIT_IDS.NO_MCDONALDS]: false,
                [CONFIG.HABIT_IDS.READ_PAGES]: false,
                [CONFIG.HABIT_IDS.DUOLINGO]: false,
                [CONFIG.HABIT_IDS.CREATIVITY]: false,
                [CONFIG.HABIT_IDS.LOW_SOCIAL_MEDIA]: false,
                [CONFIG.HABIT_IDS.READ_BOOK]: false,
                [CONFIG.HABIT_IDS.WALKS]: 0,
                [CONFIG.HABIT_IDS.INBOX_REVIEW]: false,
                [CONFIG.HABIT_IDS.CALENDAR_REVIEW]: false,
                [CONFIG.HABIT_IDS.EXCERCISE_BREAK]: false,
                [CONFIG.HABIT_IDS.REF_HAPPY]: 'na',
                [CONFIG.HABIT_IDS.REF_HEALTHY]: 'na',
                [CONFIG.HABIT_IDS.REF_ACCOMPLISHED]: 'na'
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

    static clearData() {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        localStorage.removeItem(CONFIG.STORAGE_KEY_CONNECTIONS);
    }

    static getConnections() {
        let contacts = [];
        try {
            const raw = localStorage.getItem(CONFIG.STORAGE_KEY_CONNECTIONS);
            if (raw) contacts = JSON.parse(raw);
        } catch (e) { console.error(e); }

        if (contacts.length === 0) {
            contacts = CONFIG.INITIAL_CONTACTS.map(name => ({
                name: name,
                lastContact: null,
                history: []
            }));
            this.saveConnections(contacts);
        }
        return contacts;
    }

    static saveConnections(contacts) {
        localStorage.setItem(CONFIG.STORAGE_KEY_CONNECTIONS, JSON.stringify(contacts));
    }

    static logConnection(name, dateStr) {
        const contacts = this.getConnections();
        let person = contacts.find(c => c.name === name);
        if (!person) {
            person = { name: name, lastContact: dateStr, history: [dateStr] };
            contacts.push(person);
        } else {
            person.lastContact = dateStr;
            if (!person.history.includes(dateStr)) person.history.push(dateStr);
        }
        this.saveConnections(contacts);
    }

    static revertConnection(name, dateStr) {
        const contacts = this.getConnections();
        let person = contacts.find(c => c.name === name);
        if (person) {
            person.history = person.history.filter(d => d !== dateStr);
            person.history.sort();
            person.lastContact = person.history.length > 0 ? person.history[person.history.length - 1] : null;
            this.saveConnections(contacts);
        }
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
            if (!actionEl) {
                // FALLBACK: Check for calendar day click
                const dayEl = e.target.closest('.day-cell');
                if (dayEl && dayEl.dataset.date) {
                    this.navigateTo(dayEl.dataset.date);
                }
                return;
            }

            const action = actionEl.dataset.action;
            const id = actionEl.dataset.id;

            this.handleAction(action, id);
        });
    }

    handleAction(action, id) {
        const dayData = App.Storage.getDay(this.currentDate);

        switch (action) {
            case 'toggle-habit':
                if (id === App.Config.HABIT_IDS.READ_BOOK) {
                    const currentVal = dayData[id];
                    if (!currentVal) {
                        this.openBookModal();
                        return;
                    } else {
                        App.Storage.updateDay(this.currentDate, { [id]: false });
                    }
                } else if (id === App.Config.HABIT_IDS.CONNECT) {
                    // Always Open Modal (even if already checked, to allow clearing/updating)
                    this.openConnectModal();
                    return;
                } else {
                    App.Storage.updateDay(this.currentDate, { [id]: !dayData[id] });
                }
                break;

            case 'cycle-reflection': {
                const states = ['na', 'pos', 'neu', 'neg'];
                const currentState = dayData[id] || 'na';
                const nextIndex = (states.indexOf(currentState) + 1) % states.length;
                App.Storage.updateDay(this.currentDate, { [id]: states[nextIndex] });
                this.render();
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

    openConnectModal() {
        const modal = document.getElementById('connect-modal');
        const form = document.getElementById('connect-form');
        const input = document.getElementById('connect-name');
        const select = document.getElementById('connect-select');
        const suggestionsDiv = document.getElementById('suggestions-list');
        const cancelBtn = document.getElementById('cancel-connect-btn');
        const clearBtn = document.getElementById('clear-connect-btn');

        if (!modal) return;

        // 1. Load Data
        const contacts = App.Storage.getConnections();
        const today = new Date().setHours(0, 0, 0, 0);
        const dayData = App.Storage.getDay(this.currentDate);
        const currentName = typeof dayData[App.Config.HABIT_IDS.CONNECT] === 'string'
            ? dayData[App.Config.HABIT_IDS.CONNECT]
            : null;

        // Pre-fill if exists
        if (currentName) {
            input.value = currentName;
            clearBtn.style.display = 'block';
        } else {
            input.value = '';
            clearBtn.style.display = 'none';
        }

        // 2. Sort for Dropdown (Alphabetical)
        contacts.sort((a, b) => a.name.localeCompare(b.name));

        // 3. Populate Select
        select.innerHTML = '<option value="">-- Select Person --</option>';
        contacts.forEach(c => {
            let label = c.name;
            if (c.lastContact) {
                const diffTime = Math.abs(today - new Date(c.lastContact + 'T00:00:00'));
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                label += ` (${diffDays} days ago)`;
            } else {
                label += ` (Never)`;
            }
            const opt = document.createElement('option');
            opt.value = c.name;
            opt.textContent = label;
            if (c.name === currentName) opt.selected = true; // Select if matches
            select.appendChild(opt);
        });

        // 4. Generate Suggestions (Random 5 from bottom 10 least recently contacted)
        // Sort by lastContact (Nulls first, then oldest dates)
        const sortedByDate = [...contacts].sort((a, b) => {
            if (!a.lastContact) return -1;
            if (!b.lastContact) return 1;
            return a.lastContact.localeCompare(b.lastContact);
        });

        const bottom10 = sortedByDate.slice(0, 10);
        // Shuffle and pick 5
        const suggestions = bottom10.sort(() => 0.5 - Math.random()).slice(0, 5);

        suggestionsDiv.innerHTML = '';
        suggestions.forEach(c => {
            const chip = document.createElement('div');
            chip.className = 'suggestion-chip';
            chip.textContent = c.name;
            chip.onclick = () => {
                input.value = c.name;
                select.value = c.name; // Try to sync select
            };
            suggestionsDiv.appendChild(chip);
        });

        // 5. Handlers
        select.onchange = () => {
            if (select.value) input.value = select.value;
        };

        // Reset not needed here as we manually handle values
        modal.showModal();

        const closeHandler = () => {
            modal.close();
            cleanup();
        };

        const submitHandler = (e) => {
            e.preventDefault();
            const name = input.value.trim();
            if (name) {
                // Determine if we need to remove OLD connection first (e.g. changing name)
                if (currentName && currentName !== name) {
                    App.Storage.revertConnection(currentName, this.currentDate);
                }

                // Log NEW Connection
                App.Storage.logConnection(name, this.currentDate);
                App.Storage.updateDay(this.currentDate, {
                    [App.Config.HABIT_IDS.CONNECT]: name
                });
                this.render();
            }
            modal.close();
        };

        const clearHandler = () => {
            if (currentName) {
                App.Storage.revertConnection(currentName, this.currentDate);
                App.Storage.updateDay(this.currentDate, {
                    [App.Config.HABIT_IDS.CONNECT]: false
                });
                this.render();
            }
            modal.close();
        };

        const cleanup = () => {
            cancelBtn.removeEventListener('click', closeHandler);
            form.removeEventListener('submit', submitHandler);
            clearBtn.removeEventListener('click', clearHandler);
        };

        cancelBtn.addEventListener('click', closeHandler);
        form.addEventListener('submit', submitHandler);
        clearBtn.addEventListener('click', clearHandler);
    }

    changeDay(offset) {
        const date = new Date(this.currentDate);
        date.setDate(date.getDate() + offset);
        this.currentDate = date.toISOString().split('T')[0];
    }

    render() {
        this.app.innerHTML = `
            ${this.renderHeader(this.currentDate)}
            <main class="content">
                ${this.currentView === 'dashboard' ? this.renderDashboard() : this.renderStats()}
            </main>
        `;
    }

    renderHeader(dateStr) {
        const isDashboard = this.currentView === 'dashboard';

        // Left Slot content
        let leftContent = '';
        if (isDashboard) {
            // Empty or app logo if desired
        } else {
            leftContent = `<button class="view-btn icon-btn" data-action="switch-view" aria-label="Return to Dashboard">⬅</button>`;
        }

        // Center Slot content
        let centerContent = '';
        if (isDashboard) {
            const prettyDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric'
            });
            centerContent = `
                <div class="date-nav">
                    <button class="nav-btn" data-action="prev-day" aria-label="Previous Day">←</button>
                    <div class="current-date">${prettyDate}</div>
                    <button class="nav-btn" data-action="next-day" aria-label="Next Day">→</button>
                </div>
            `;
        } else {
            centerContent = '';
        }

        // Right Slot content
        let rightContent = '';
        if (isDashboard) {
            rightContent = `<button class="view-btn icon-btn" data-action="switch-view" aria-label="Open Menu">☰</button>`;
        }

        return `
            <header class="app-header">
                <div class="header-left">${leftContent}</div>
                <div class="header-center">${centerContent}</div>
                <div class="header-right">${rightContent}</div>
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
                
                <!-- Section 1: Personal Habits -->
                <div class="section-header">Personal Habits</div>
                ${this.renderToggleCard(
            App.Config.HABIT_IDS.NO_MCDONALDS,
            "No McDonalds Breakfast",
            "🍔",
            data[App.Config.HABIT_IDS.NO_MCDONALDS],
            false
        )}
                ${this.renderToggleCard(
            App.Config.HABIT_IDS.LOW_SOCIAL_MEDIA,
            "Social Media < 30m",
            "📱",
            data[App.Config.HABIT_IDS.LOW_SOCIAL_MEDIA],
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
            App.Config.HABIT_IDS.CREATIVITY,
            "Creativity",
            "🏺",
            data[App.Config.HABIT_IDS.CREATIVITY],
            false
        )}
                ${this.renderToggleCard(
            App.Config.HABIT_IDS.CONNECT,
            "Connect",
            "🤝",
            data[App.Config.HABIT_IDS.CONNECT],
            false
        )}
                ${this.renderToggleCard(
            App.Config.HABIT_IDS.DAILY_REFLECTION,
            "Daily Reflection",
            "🧘",
            (data[App.Config.HABIT_IDS.REF_HAPPY] && data[App.Config.HABIT_IDS.REF_HAPPY] !== 'na') &&
            (data[App.Config.HABIT_IDS.REF_HEALTHY] && data[App.Config.HABIT_IDS.REF_HEALTHY] !== 'na') &&
            (data[App.Config.HABIT_IDS.REF_ACCOMPLISHED] && data[App.Config.HABIT_IDS.REF_ACCOMPLISHED] !== 'na'),
            false,
            true // Read Only
        )}

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
            App.Config.HABIT_IDS.CALENDAR_REVIEW,
            "Calendar Review",
            "📅",
            data[App.Config.HABIT_IDS.CALENDAR_REVIEW],
            false
        )}
                ${this.renderToggleCard(
            App.Config.HABIT_IDS.EXCERCISE_BREAK,
            "Exercise / Break",
            "🧘",
            data[App.Config.HABIT_IDS.EXCERCISE_BREAK],
            false
        )}
                ` : ''}

                <!-- Section 3: Daily Reflection -->
                <div class="section-header">Daily Reflection</div>
                <div class="reflections-grid">
                    ${this.renderReflectionCard(App.Config.HABIT_IDS.REF_HAPPY, "Happy", "😊", data[App.Config.HABIT_IDS.REF_HAPPY])}
                    ${this.renderReflectionCard(App.Config.HABIT_IDS.REF_HEALTHY, "Healthy", "🥦", data[App.Config.HABIT_IDS.REF_HEALTHY])}
                    ${this.renderReflectionCard(App.Config.HABIT_IDS.REF_ACCOMPLISHED, "Accomplished", "🏆", data[App.Config.HABIT_IDS.REF_ACCOMPLISHED])}
                </div>

                <!-- Section 4: Tracking Only -->
                <div class="section-header">Tracking Only</div>
                <div class="habit-group tracking-only">

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

    renderReflectionCard(id, title, emoji, state) {
        const stateColors = {
            'pos': 'var(--status-green)',
            'neu': 'var(--status-yellow)',
            'neg': 'var(--status-red)',
            'na': 'rgba(0, 0, 0, 0.05)'
        };
        const stateLabels = {
            'pos': '(+)',
            'neu': '(~)',
            'neg': '(-)',
            'na': '(No Answer)'
        };
        const color = stateColors[state] || 'rgba(0, 0, 0, 0.05)';
        const labelIndicator = stateLabels[state] || '(No Answer)';
        const iconColor = state === 'na' ? 'var(--text-primary)' : 'white';

        return `
            <div class="reflection-card" data-action="cycle-reflection" data-id="${id}" style="border-color: ${color === 'rgba(0, 0, 0, 0.05)' ? 'var(--border-color)' : color}">
                <div class="reflection-icon" style="background: ${color}; color: ${iconColor}">
                    ${emoji}
                </div>
                <div class="reflection-label" style="text-align:center;">${title}<br/>${labelIndicator}</div>
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
            </div >
    `;
    }

    renderDayStatus(data, dateStr) {
        const score = App.Logic.calculateDailyScore(data, dateStr);
        const dayType = data.dayType || (App.Logic.isWeekend(dateStr) ? 'play' : 'work');
        const maxScore = dayType === 'work' ? 10 : 7;
        const color = App.Logic.getStatusColor(score, dayType);

        let icon = '🔴';
        if (color === 'var(--status-gold)') icon = '⭐';
        else if (color === 'var(--status-green)') icon = '🟢';
        else if (color === 'var(--status-yellow)') icon = '🟡';

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
                    <div class="stat-box">
                        <span class="stat-value">${stats.totalConnects}</span>
                        <span class="stat-label">Connections Made</span>
                    </div>
                </div>

                <!-- Daily Reflections Stats -->
                <div class="reflections-stats">
                    <h2 style="text-align:center; margin-bottom: var(--spacing-sm); font-size: 1.1rem;">Daily Reflections</h2>
                    ${[
                { id: App.Config.HABIT_IDS.REF_HAPPY, label: 'Happy' },
                { id: App.Config.HABIT_IDS.REF_HEALTHY, label: 'Healthy' },
                { id: App.Config.HABIT_IDS.REF_ACCOMPLISHED, label: 'Accomplished' }
            ].map(ref => {
                const counts = stats.reflectionCounts[ref.id];
                const total = stats.validDays || 1;
                const getPct = (cnt) => Math.round((cnt / total) * 100);

                return `
                        <div class="reflection-stat-group" style="margin-bottom: var(--spacing-xs); border-bottom: 1px solid var(--border-color); padding-bottom: var(--spacing-sm);">
                            <h3 style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 4px;">${ref.label}</h3>
                            <div style="display:flex; gap:10px; justify-content: space-between;">
                                <div style="color: var(--status-green); font-size: 0.8rem;">Pos: ${getPct(counts.pos)}%</div>
                                <div style="color: var(--status-yellow); font-size: 0.8rem;">Neu: ${getPct(counts.neu)}%</div>
                                <div style="color: var(--status-red); font-size: 0.8rem;">Neg: ${getPct(counts.neg)}%</div>
                                <div style="color: var(--status-gray); font-size: 0.8rem;">N/A: ${getPct(counts.na)}%</div>
                            </div>
                        </div>
                        `;
            }).join('')}
                </div>

                <!-- Connections Stats -->
                <details style="margin-bottom: var(--spacing-xs);">
                    <summary>${stats.totalConnects} Connections Recorded</summary>
                    <div style="padding: var(--spacing-sm) 0;">
                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9rem; line-height: 1.6;">
                            ${Object.keys(stats.connectionCounts)
                .sort((a, b) => stats.connectionCounts[b] - stats.connectionCounts[a])
                .map(name => `
                                    <li style="border-bottom: 1px solid var(--border-color); padding: 4px 0;">
                                        ${name} (${stats.connectionCounts[name]})
                                    </li>
                                `).join('')}
                        </ul>
                    </div>
                </details>

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
                    <div class="legend-item"><span class="dot" style="background:var(--status-green)"></span> Good</div>
                    <div class="legend-item"><span class="dot" style="background:var(--status-yellow)"></span> OK</div>
                    <div class="legend-item"><span class="dot" style="background:var(--status-red)"></span> Low</div>
                </div>

                <div style="text-align:center; margin-top:var(--spacing-lg); display:flex; flex-direction:column; gap:10px; align-items:center;">

                    
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
        let totalConnects = 0;
        const connectionCounts = {};
        const reflectionCounts = {
            [App.Config.HABIT_IDS.REF_HAPPY]: { pos: 0, neu: 0, neg: 0, na: 0 },
            [App.Config.HABIT_IDS.REF_HEALTHY]: { pos: 0, neu: 0, neg: 0, na: 0 },
            [App.Config.HABIT_IDS.REF_ACCOMPLISHED]: { pos: 0, neu: 0, neg: 0, na: 0 }
        };
        let validDays = 0;
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        Object.keys(allData).forEach(dateStr => {
            if (!dateStr.startsWith(year)) return;

            const dayData = allData[dateStr];

            // Stats
            const connectionName = dayData[App.Config.HABIT_IDS.CONNECT];
            if (connectionName) {
                totalConnects++;
                if (typeof connectionName === 'string') {
                    connectionCounts[connectionName] = (connectionCounts[connectionName] || 0) + 1;
                }
            }

            const targetD = new Date(dateStr + 'T00:00:00');
            if (targetD <= now) {
                validDays++;
                [App.Config.HABIT_IDS.REF_HAPPY, App.Config.HABIT_IDS.REF_HEALTHY, App.Config.HABIT_IDS.REF_ACCOMPLISHED].forEach(id => {
                    const state = dayData[id] || 'na';
                    if (reflectionCounts[id][state] !== undefined) reflectionCounts[id][state]++;
                });
            }

            // Check if day matches filter criteria (if any) or existing logic
            // Note: calculateYearlyStats iterates existing keys, so data exists by definition.

            const score = App.Logic.calculateDailyScore(dayData, dateStr);
            const dayType = dayData.dayType || (App.Logic.isWeekend(dateStr) ? 'play' : 'work');
            const maxScore = dayType === 'work' ? 10 : 7;

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

        return { perfectDays, books, bookCount: books.length, totalRating, totalConnects, reflectionCounts, validDays, connectionCounts };
    }

    renderCalendar(year) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const months = [];
        for (let m = 0; m < 12; m++) {
            // Only show month if it has started
            if (year < currentYear || (year === currentYear && m <= currentMonth)) {
                months.push(this.renderMonth(year, m));
            }
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
                    const maxScore = dayType === 'work' ? 10 : 7;

                    totalScore += score;
                    totalMax += maxScore;
                } else {
                    // No data entered -> 0 score, but it IS a day that passed, so it adds to Max
                    // Default day type logic
                    const isWeekend = App.Logic.isWeekend(dateStr);
                    const maxScore = isWeekend ? 7 : 10;
                    totalMax += maxScore;
                    // totalScore += 0;
                }
            }
        }

        const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
        // Don't show % for future months (totalMax 0)
        const headerText = totalMax > 0 ? `${monthName} (${pct}%)` : monthName;

        // Render Grid
        let grid = '';
        // Empty days
        for (let i = 0; i < startDay; i++) {
            grid += '<div class="day-cell empty"></div>';
        }
        // Actual days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const targetD = new Date(dateStr + 'T00:00:00');
            const isFuture = targetD > now;

            const dayData = allData[dateStr] || {};
            const score = App.Logic.calculateDailyScore(dayData, dateStr);
            const dayType = dayData.dayType || (App.Logic.isWeekend(dateStr) ? 'play' : 'work');

            let color = App.Logic.getStatusColor(score, dayType);
            if (isFuture) color = 'var(--status-gray)';

            const isGold = color === 'var(--status-gold)';
            const isYellow = color === 'var(--status-yellow)';
            const isGray = color === 'var(--status-gray)';
            const textColor = (isGold || isYellow || isGray) ? 'black' : 'white';

            grid += `
                <div class="day-cell" data-date="${dateStr}">
                    <div class="status-indicator" style="background:${color}; color:${textColor}">
                        ${d}
                        ${isGold ? '<span class="star">⭐</span>' : ''}
                    </div>
                </div>`;
        }

        return `
            <div class="month-block">
                <details>
                    <summary>${headerText}</summary>
                    <div class="month-grid">
                        ${grid}
                    </div>
                </details>
            </div>
        `;
    }

    navigateTo(dateStr) {
        this.currentDate = dateStr;
        this.currentView = 'dashboard';
        this.render();
    }

    renderToggleCard(id, title, icon, isActive, isWeekend, readOnly = false) {
        // If weekend, always show as "success" visually, but maybe disabled or indicated auto-complete
        const success = isWeekend || isActive;
        const actionAttr = readOnly ? '' : `data-action="toggle-habit" data-id="${id}"`;

        return `
            <div class="card habit-toggle ${success ? 'success' : ''} ${readOnly ? 'read-only' : ''}" ${actionAttr} style="${readOnly ? 'cursor: default; opacity: 0.9;' : ''}">
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

