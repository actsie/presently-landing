        // DOM Element Cache - for performance optimization
        const DOM = {
            quoteDisplay: null,
            taskList: null,
            taskInput: null,
            addTaskButton: null,
            timerDisplay: null,
            timerProgressBar: null,
            taskTimerDisplay: null,
            moodHistory: null,
            moodTimeline: null,
            templateList: null,
            doneTaskList: null,
            
            // Initialize cached elements
            init() {
                this.quoteDisplay = document.getElementById('quoteDisplay');
                this.taskList = document.getElementById('taskList');
                this.taskInput = document.getElementById('taskInput');
                this.addTaskButton = document.getElementById('addTask');
                this.timerDisplay = document.getElementById('timerDisplay');
                this.timerProgressBar = document.getElementById('timerProgressBar');
                this.taskTimerDisplay = document.getElementById('taskTimerDisplay');
                this.moodHistory = document.getElementById('moodHistory');
                this.moodTimeline = document.getElementById('moodTimeline');
                this.templateList = document.getElementById('templateList');
                this.doneTaskList = document.getElementById('doneTaskList');
            }
        };

        // Encouraging quotes
        const quotes = [
            "You don't have to finish, just begin.",
            "Progress, not perfection.",
            "One small step is still a step forward.",
            "You're doing better than you think.",
            "Be gentle with yourself today.",
            "It's okay to rest when you need to.",
            "You are enough, just as you are.",
            "Breathe. You've got this.",
            "Small wins are still wins.",
            "Your pace is perfect for you.",
            "Every moment is a fresh start.",
            "You're allowed to take your time."
        ];

        // Load and display random quote
        function loadQuote() {
            const quoteDisplay = DOM.quoteDisplay || document.getElementById('quoteDisplay');
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            quoteDisplay.textContent = randomQuote;
        }

        // To-Do List functionality
        let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        let pendingBreakTaskIndex = null;
        let pendingSubtaskIndex = null;
        const taskList = DOM.taskList || document.getElementById('taskList');
        const taskInput = DOM.taskInput || document.getElementById('taskInput');
        const addTaskButton = DOM.addTaskButton || document.getElementById('addTask');

        // Task Timer variables
        let currentTaskIndex = null;
        let taskTimerInterval = null;
        let taskTimeRemaining = 0;
        let selectedDuration = 0;
        let taskOriginalDuration = 0;
        let isTaskPaused = false;
        let isTimerMinimized = false;
        let pinnedTaskIndex = null;
        let pendingMoodType = null;
        let halfwayPrompted = false;
        let autoCompleteTimeout = null;

        const TimerState = {
            isActive: false,
            taskName: null,
            timeRemaining: 0,
            originalDuration: 0,
            halfwayPrompted: false,
            interval: null,

            start(name, duration) {
                this.isActive = true;
                this.taskName = name;
                this.timeRemaining = duration;
                this.originalDuration = duration;
                this.halfwayPrompted = false;
                updateTimerUI('running');
            },

            stop() {
                this.isActive = false;
                this.taskName = null;
                this.timeRemaining = 0;
                this.originalDuration = 0;
                this.halfwayPrompted = false;
                if (this.interval) {
                    clearInterval(this.interval);
                    this.interval = null;
                }
                updateTimerUI('stopped');
            },

            complete() {
                this.stop();
            }
        };

        function updateTimerUI(state) {
            const timerSection = document.getElementById('timerSection');
            const timerControls = timerSection?.querySelector('.timer-controls');

            switch(state) {
                case 'stopped':
                    if (timerControls) timerControls.style.display = 'block';
                    break;
                case 'running':
                    if (timerControls) timerControls.style.display = 'none';
                    break;
            }
        }

        function onTaskCompleteByName(name) {
            if (TimerState.isActive && TimerState.taskName === name) {
                TimerState.complete();
            }
        }

        function onTaskRestoreByName(name) {
            if (TimerState.taskName === name) {
                TimerState.stop();
            }
        }

        const monthLabelEl = document.getElementById('monthLabel');
        const dateStripEl = document.getElementById('dateStrip');
        const monthDropdownEl = document.getElementById('monthDropdown');

        function isDateToday(dateStr) {
            if (!dateStr) return false;
            const d = new Date(dateStr);
            const today = new Date();
            return d.getFullYear() === today.getFullYear() &&
                   d.getMonth() === today.getMonth() &&
                   d.getDate() === today.getDate();
        }

        function checkForNewDay() {
            const todayStr = new Date().toISOString().split('T')[0];
            const last = localStorage.getItem('lastLogDate');
            if (last && last !== todayStr) {
                const dailyLog = JSON.parse(localStorage.getItem('dailyLog')) || [];
                const moodLog = JSON.parse(localStorage.getItem('moodLog')) || [];
                const breakLog = JSON.parse(localStorage.getItem('breakLog')) || [];
                const storedTasks = JSON.parse(localStorage.getItem('tasks')) || [];

                const dayTasks = storedTasks.filter(t => {
                    const hasSession = (t.sessions || []).some(s => s.completedAt && s.completedAt.startsWith(last));
                    const completedToday = t.completed && t.completedAt && t.completedAt.startsWith(last);
                    return hasSession || completedToday;
                }).map(t => JSON.parse(JSON.stringify(t)));

                if (dayTasks.length || moodLog.length || breakLog.length) {
                    dailyLog.push({ date: last, tasks: dayTasks, moods: moodLog, breaks: breakLog });
                }

                const remaining = storedTasks.filter(t => !(t.completed && t.completedAt && t.completedAt.startsWith(last)));
                localStorage.setItem('tasks', JSON.stringify(remaining));
                localStorage.removeItem('moodLog');
                localStorage.removeItem('breakLog');
                localStorage.setItem('dailyLog', JSON.stringify(dailyLog));
                tasks = remaining;
            }
            localStorage.setItem('lastLogDate', todayStr);
        }

        function hasLog(dateStr) {
            const past = JSON.parse(localStorage.getItem('dailyLog')) || [];
            if (isDateToday(dateStr)) {
                const tasksToday = tasks.filter(t => {
                    if (t.completed && isDateToday(t.completedAt)) return true;
                    return (!t.completed && (t.sessions || []).some(s => isDateToday(s.completedAt)));
                });
                const moodsToday = JSON.parse(localStorage.getItem('moodLog')) || [];
                const breaksToday = JSON.parse(localStorage.getItem('breakLog')) || [];
                return tasksToday.length || moodsToday.length || breaksToday.length;
            }
            const entry = past.find(e => e.date === dateStr);
            return entry && (entry.tasks.length || entry.moods.length || (entry.breaks && entry.breaks.length));
        }

        function renderDateStrip() {
            const today = new Date();
            const start = new Date(today);
            start.setDate(today.getDate() - 3);
            dateStripEl.innerHTML = '';
            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                const item = document.createElement('div');
                item.classList.add('date-item');
                if (isDateToday(dateStr)) item.classList.add('today');
                item.innerHTML = `<div>${d.toLocaleDateString(undefined,{weekday:'short'})}</div><div>${d.getDate()}</div>`;
                if (hasLog(dateStr)) {
                    const icon = document.createElement('span');
                    icon.textContent = '📘';
                    icon.classList.add('log-icon');
                    item.appendChild(icon);
                }
                item.addEventListener('click', () => openDailyLog(dateStr));
                dateStripEl.appendChild(item);
            }
            monthLabelEl.textContent = today.toLocaleDateString(undefined,{month:'long'}) + ' ▾';
        }

        function toggleMonthDropdown() {
            monthDropdownEl.classList.toggle('active');
            if (monthDropdownEl.classList.contains('active')) {
                renderMonthGrid();
            }
        }

        function renderMonthGrid() {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            const first = new Date(year, month, 1);
            const last = new Date(year, month + 1, 0);
            monthDropdownEl.innerHTML = '';
            const grid = document.createElement('div');
            grid.className = 'month-grid';
            for (let i = 1; i <= last.getDate(); i++) {
                const d = new Date(year, month, i);
                const dateStr = d.toISOString().split('T')[0];
                const dayDiv = document.createElement('div');
                dayDiv.classList.add('month-day');
                if (isDateToday(dateStr)) dayDiv.classList.add('today');
                dayDiv.textContent = i;
                if (hasLog(dateStr)) {
                    dayDiv.innerHTML = `<span>${i}</span><span class='log-icon'>📘</span>`;
                }
                dayDiv.addEventListener('click', () => { openDailyLog(dateStr); monthDropdownEl.classList.remove('active'); });
                grid.appendChild(dayDiv);
            }
            monthDropdownEl.appendChild(grid);
        }

        function openDailyLog(dateStr) {
            loadDailyLog(dateStr);
            document.getElementById('dailyLogModal').classList.add('active');
        }

        function closeDailyLog() {
            document.getElementById('dailyLogModal').classList.remove('active');
        }

        function loadDailyLog(dateStr) {
            const container = document.getElementById('dailyLogContent');
            container.innerHTML = '';
            const todayStr = new Date().toISOString().split('T')[0];
            const tasksToday = tasks.filter(t => {
                if (t.completed && isDateToday(t.completedAt)) return true;
                return (!t.completed && (t.sessions || []).some(s => isDateToday(s.completedAt)));
            });
            const moodsToday = JSON.parse(localStorage.getItem('moodLog')) || [];
            const breaksToday = JSON.parse(localStorage.getItem('breakLog')) || [];
            const past = JSON.parse(localStorage.getItem('dailyLog')) || [];
            const log = [];

            if (dateStr) {
                if (dateStr === todayStr) {
                    log.push({ date: todayStr, tasks: tasksToday, moods: moodsToday, breaks: breaksToday });
                } else {
                    const entry = past.find(e => e.date === dateStr);
                    log.push(entry || { date: dateStr, tasks: [], moods: [] });
                }
            } else {
                log.push({ date: todayStr, tasks: tasksToday, moods: moodsToday, breaks: breaksToday });
                past.sort((a,b) => new Date(b.date) - new Date(a.date));
                log.push(...past);
            }

            log.forEach(entry => {
                const dayDiv = document.createElement('div');
                dayDiv.classList.add('daily-log-day');
                const dateHeader = document.createElement('h4');
                dateHeader.textContent = new Date(entry.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
                dayDiv.appendChild(dateHeader);

                if (!entry.tasks.length && !entry.moods.length && !(entry.breaks && entry.breaks.length)) {
                    const p = document.createElement('p');
                    p.textContent = "No tasks completed. That's okay. Rest counts too. 🌱";
                    dayDiv.appendChild(p);
                } else {
                    if (entry.tasks.length) {
                        const doneTasks = entry.tasks.filter(t => t.completed);
                        const inProg = entry.tasks.filter(t => !t.completed);

                        const createTaskDiv = (t) => {
                            const div = document.createElement('div');
                            div.classList.add('log-task');
                            const mins = t.totalTime ? Math.round(t.totalTime / 60) : 0;
                            const sessions = (t.sessions ? t.sessions.length : 0);
                            const prefix = t.completed ? '✅' : '🚧';
                            div.innerHTML = `<strong>${prefix} ${t.task}</strong><br>Total time: ${mins} mins<br>🧠 Pomodoro sessions: ${sessions}`;

                            const taskMoods = entry.moods.filter(m => m.task === t.task);
                            if (taskMoods.length) {
                                const toggle = document.createElement('div');
                                toggle.className = 'mood-toggle';
                                toggle.textContent = '🔽 Show moods';
                                const moodWrap = document.createElement('div');
                                moodWrap.className = 'task-moods';
                                moodWrap.style.display = 'none';

                                const generalTaskMoods = taskMoods.filter(m => m.type !== 'midway' && m.type !== 'after');
                                const midwayTaskMoods = taskMoods.filter(m => m.type === 'midway');
                                const afterTaskMoods = taskMoods.filter(m => m.type === 'after');

                                const renderMoodList = (title, moods) => {
                                    if (!moods.length) return;
                                    const header = document.createElement('div');
                                    header.className = 'mood-section-title';
                                    header.textContent = title;
                                    moodWrap.appendChild(header);
                                    const ul = document.createElement('ul');
                                    moods.forEach(m => {
                                        const li = document.createElement('li');
                                        const time = new Date(m.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                                        const minsInto = (m.minutesIntoTask !== undefined && m.minutesIntoTask !== null) ? ` (${m.minutesIntoTask} min)` : '';
                                        li.innerHTML = `${m.mood} ${time}${minsInto}`;
                                        if (m.reason) {
                                            const reasonDiv = document.createElement('div');
                                            reasonDiv.className = 'mood-reason';
                                            reasonDiv.textContent = `"${m.reason}"`;
                                            li.appendChild(reasonDiv);
                                        }
                                        if (['😐','😮‍💨','😫'].includes(m.mood)) {
                                            const edit = document.createElement('span');
                                            edit.textContent = '🖊️';
                                            edit.classList.add('edit-icon');
                                            edit.dataset.day = entry.date;
                                            edit.dataset.index = entry.moods.indexOf(m);
                                            edit.addEventListener('click', () => editMoodReason(edit.dataset.day, edit.dataset.index));
                                            li.appendChild(edit);
                                        }
                                        ul.appendChild(li);
                                    });
                                    moodWrap.appendChild(ul);
                                };

                                renderMoodList('😊 Moods:', generalTaskMoods);
                                renderMoodList('Midway:', midwayTaskMoods);
                                renderMoodList('✅ After:', afterTaskMoods);

                                toggle.addEventListener('click', () => {
                                    const show = moodWrap.style.display === 'none';
                                    moodWrap.style.display = show ? 'block' : 'none';
                                    toggle.textContent = show ? '🔼 Hide moods' : '🔽 Show moods';
                                });

                                div.appendChild(toggle);
                                div.appendChild(moodWrap);
                            }

                            return div;
                        };

                        if (doneTasks.length) {
                            const sec = document.createElement('div');
                            sec.classList.add('log-task-section', 'done');
                            const head = document.createElement('div');
                            head.className = 'mood-section-title';
                            head.textContent = '✔️ Done';
                            sec.appendChild(head);
                            doneTasks.forEach(t => sec.appendChild(createTaskDiv(t)));
                            dayDiv.appendChild(sec);
                        }

                        if (inProg.length) {
                            const sec = document.createElement('div');
                            sec.classList.add('log-task-section', 'in-progress');
                            const head = document.createElement('div');
                            head.className = 'mood-section-title';
                            head.textContent = '🚧 In Progress';
                            sec.appendChild(head);
                            inProg.forEach(t => sec.appendChild(createTaskDiv(t)));
                            dayDiv.appendChild(sec);
                        }
                    }

                    const generalMoods = entry.moods.filter(m => !m.task);
                    if (generalMoods.length) {
                        const generalList = generalMoods.filter(m => m.type !== 'midway' && m.type !== 'after');
                        const midwayList = generalMoods.filter(m => m.type === 'midway');
                        const afterList = generalMoods.filter(m => m.type === 'after');

                        const renderMoodList = (title, moods) => {
                            if (!moods.length) return;
                            const header = document.createElement('div');
                            header.innerHTML = `<strong>${title}</strong>`;
                            dayDiv.appendChild(header);
                            const ul = document.createElement('ul');
                            moods.forEach(m => {
                                const li = document.createElement('li');
                                const time = new Date(m.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                                const minsInto = (m.minutesIntoTask !== undefined && m.minutesIntoTask !== null) ? ` (${m.minutesIntoTask} min)` : '';
                                li.innerHTML = `${m.mood} ${time}${minsInto}`;
                                if (m.reason) {
                                    const reasonDiv = document.createElement('div');
                                    reasonDiv.className = 'mood-reason';
                                    reasonDiv.textContent = `"${m.reason}"`;
                                    li.appendChild(reasonDiv);
                                }
                                if (['😐','😮‍💨','😫'].includes(m.mood)) {
                                    const edit = document.createElement('span');
                                    edit.textContent = '🖊️';
                                    edit.classList.add('edit-icon');
                                    edit.dataset.day = entry.date;
                                    edit.dataset.index = entry.moods.indexOf(m);
                                    edit.addEventListener('click', () => editMoodReason(edit.dataset.day, edit.dataset.index));
                                    li.appendChild(edit);
                                }
                                ul.appendChild(li);
                            });
                            dayDiv.appendChild(ul);
                        };

                        renderMoodList('Mood Entries:', generalList);
                        renderMoodList('Midway:', midwayList);
                        renderMoodList('✅ After:', afterList);
                    }

                    if (entry.breaks && entry.breaks.length) {
                        const sec = document.createElement('div');
                        sec.classList.add('log-task-section', 'breaks');
                        const head = document.createElement('div');
                        head.className = 'mood-section-title';
                        head.textContent = '☕️ Breaks';
                        sec.appendChild(head);
                        const ul = document.createElement('ul');
                        entry.breaks.forEach(b => {
                            const li = document.createElement('li');
                            const time = new Date(b.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                            li.textContent = `Break 🧘 – ${b.duration} mins at ${time}`;
                            ul.appendChild(li);
                        });
                        sec.appendChild(ul);
                        dayDiv.appendChild(sec);
                    }
                }

            container.appendChild(dayDiv);
        });
    }

    function editMoodReason(day, index) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (day === todayStr) {
            let moodLog = JSON.parse(localStorage.getItem('moodLog')) || [];
            const entry = moodLog[index];
            openMoodReasonModal(entry.reason || '', (reason) => {
                if (reason !== null) {
                    moodLog[index].reason = reason;
                    localStorage.setItem('moodLog', JSON.stringify(moodLog));
                    updateCharts();
                    loadDailyLog(day);
                }
            });
        } else {
            let dailyLog = JSON.parse(localStorage.getItem('dailyLog')) || [];
            const logEntry = dailyLog.find(e => e.date === day);
            if (!logEntry) return;
            const entry = logEntry.moods[index];
            openMoodReasonModal(entry.reason || '', (reason) => {
                if (reason !== null) {
                    logEntry.moods[index].reason = reason;
                    localStorage.setItem('dailyLog', JSON.stringify(dailyLog));
                    loadDailyLog(day);
                }
            });
        }
    }

        function loadTasks() {
            taskList.innerHTML = '';

            let activeIndices = tasks.map((t, i) => i).filter(i => !tasks[i].completed);
            if (pinnedTaskIndex !== null && activeIndices.includes(pinnedTaskIndex)) {
                activeIndices = [pinnedTaskIndex, ...activeIndices.filter(i => i !== pinnedTaskIndex)];
            }

            activeIndices.forEach(idx => {
                const task = tasks[idx];
                const li = document.createElement('li');
                li.classList.add('task', 'task-item');
                li.dataset.index = idx;

                const isActive = idx === pinnedTaskIndex && (taskTimerInterval || isTaskPaused);
                if (isActive) li.classList.add('active-task');

                const workedMinutes = task.totalTime ? Math.round(task.totalTime / 60) : 0;
                const showInfo = task.totalTime || (task.sessions && task.sessions.length);
                const infoIcon = showInfo ? `<button class='task-info-icon' onclick='showTaskInfo(event, ${idx})'>i</button>` : '';
                const activeTag = isActive ? `<div class='active-tag' title='Active' aria-label='Active'>⏱ Active</div>` : '';
                const timeTag = workedMinutes ? `<div class='worked-tag' title='Worked ${workedMinutes} min' aria-label='Worked ${workedMinutes} min'>${task.completed ? '⌛️' : '🚧'} ${workedMinutes} min</div>` : '';
                const tagsBlock = activeTag || timeTag ? `<div class='task-tags'>${activeTag}${timeTag}</div>` : '';
                if (tagsBlock) li.classList.add('tagged-task');

                const breakData = task.activeBreak;
                const breakCollapsed = task.checklistCollapsed;
                const breakToggle = breakData && breakData.items && breakData.items.length ? true : false;
                const progressTag = (breakData && breakData.items && breakData.items.length && task.breakActive) ? `<div class='in-progress-tag'>🟡 In Progress</div>` : '';
                const breakHtml = breakData && breakData.items && breakData.items.length ?
                    progressTag +
                    `<ul class='break-checklist' style='display:${breakCollapsed ? 'none' : 'block'};'>` +
                    breakData.items.map((it,i) => `<li class='${it.done ? 'completed' : ''}'><label><input type='checkbox' ${it.done ? 'checked' : ''} onchange='toggleBreakItem(${idx},${i})'> <span>${it.text}</span></label></li>`).join('') +
                    `</ul><button class='add-break-item' onclick='addBreakListItem(${idx})'>➕ Add</button>`
                    : '';

                const subData = task.subtasks;
                const subCollapsed = task.subtasksCollapsed;
                const subToggle = subData && subData.length ? true : false;
                const subHtml = subData && subData.length ?
                    `<div class='task-subtasks'><ul class='subtask-checklist' style='display:${subCollapsed ? 'none' : 'block'};'>` +
                    subData.map((it,i) => `<li class='${it.done ? 'completed' : ''}'><label><input type='checkbox' ${it.done ? 'checked' : ''} onchange='toggleSubtaskItem(${idx},${i})'> <span>${it.text}</span></label></li>`).join('') +
                    `</ul></div>`
                    : `<div class='task-subtasks'></div>`;

                const timerBtn = (currentTaskIndex !== idx && !isActive && pinnedTaskIndex === null)
                    ? `<button class='timer-task' onclick='startTaskTimer(${idx})'>⏱️</button>`
                    : '';

                const hasToggle = breakToggle || subToggle;
                const combinedCollapsed = (subToggle ? subCollapsed : true) && (breakToggle ? breakCollapsed : true);
                const toggleBtn = hasToggle ? `<button class='task-toggle' onclick='toggleTaskContent(${idx})'>${combinedCollapsed ? '▸' : '▾'}</button>` : '';
                li.innerHTML = `
                    <div class='task-content'>
                        ${tagsBlock}
                        <div class='task-header'>
                            <div class='task-main'>
                                <input type='checkbox' ${task.completed ? 'checked' : ''} onchange='handleTaskCompletion(this, this.closest(".task-item"))'/>
                                ${toggleBtn}<span class='task-text'>${task.task}</span>${infoIcon}
                            </div>
                            <div class='task-actions'>
                                <button class='add-subtask' onclick='openSubtaskModal(${idx})'>➕</button>
                                ${timerBtn}
                                <button class='delete-task' onclick='deleteTask(${idx})'>×</button>
                            </div>
                        </div>
                        ${subHtml}${breakHtml}
                    </div>
                `;

                taskList.appendChild(li);
            });
            
        loadDoneTasks();
        }

        function loadDoneTasks() {
            const doneList = document.getElementById('doneTaskList');
            if (!doneList) return;
            doneList.innerHTML = '';
            const doneTasks = tasks
                .filter(task => task.completed && isDateToday(task.completedAt))
                .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

            const reportCont = document.getElementById('dailyReportContainer');
            if (reportCont) {
                reportCont.style.display = doneTasks.length ? 'flex' : 'none';
            }
            doneTasks.forEach(task => {
                const actualIndex = tasks.indexOf(task);
                const li = document.createElement('li');
                li.classList.add('task', 'done-task');
                const workedMinutes = task.totalTime ? Math.round(task.totalTime / 60) : 0;
                const showInfo = task.totalTime || (task.sessions && task.sessions.length);
                const infoIcon = showInfo ? `<button class='task-info-icon' onclick='showTaskInfo(event, ${actualIndex})'>i</button>` : '';
                const timeTag = workedMinutes ? `<div class='worked-tag' title='Worked ${workedMinutes} min' aria-label='Worked ${workedMinutes} min'>⌛️ ${workedMinutes} min</div>` : '';
                const tagsBlock = timeTag ? `<div class='task-tags'>${timeTag}</div>` : '';
                const subData = task.subtasks;
                const subHtml = subData && subData.length ?
                    `<div class='task-subtasks'><ul class='subtask-checklist'>` +
                    subData.map((it,i) => `<li class='${it.done ? 'completed' : ''}'><label><input type='checkbox' ${it.done ? 'checked' : ''} disabled> <span>${it.text}</span></label></li>`).join('') +
                    `</ul></div>`
                    : '';
                if (tagsBlock) li.classList.add('tagged-task');
                li.innerHTML = `
                    <div class='task-content'>
                        ${tagsBlock}
                        <div class='task-header'>
                            <div class='task-main'>
                                <input type='checkbox' ${task.completed ? 'checked' : ''} onchange='handleTaskUncheck(this, this.closest(".task"), ${actualIndex})'/>
                                <span class='task-text'>${task.task}</span>${infoIcon}
                            </div>
                            <div class='task-actions'>
                                <button class='delete-task' onclick='deleteTask(${actualIndex})'>×</button>
                            </div>
                        </div>
                        ${subHtml}
                    </div>
                `;
                doneList.appendChild(li);
            });
        }

        function renderTaskInfoCard(index) {
            const card = document.getElementById('taskInfoCard');
            const task = tasks[index];
            const total = Math.round((task.totalTime || 0) / 60);

            const sessions = task.sessions || [];
            const today = new Date();
            const sessionsToday = sessions.filter(s => {
                const d = new Date(s.completedAt);
                return d.getFullYear() === today.getFullYear() &&
                       d.getMonth() === today.getMonth() &&
                       d.getDate() === today.getDate();
            }).length;

            let lastTime = null;
            if (sessions.length) {
                const last = sessions[sessions.length - 1];
                lastTime = new Date(last.completedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
            }

            card.innerHTML = `
                <div class='info-task-name'>${task.task}</div>
                <div>Worked: ${total} min</div>
                <div>🧠 Sessions today: ${sessionsToday}</div>
                ${lastTime ? `<div>Last session: ${lastTime}</div>` : ''}
                <div>${task.completed ? 'Completed' : 'Not done yet'}</div>
            `;
            card.dataset.index = index;
        }

        function showTaskInfo(event, index) {
            event.stopPropagation();
            const card = document.getElementById('taskInfoCard');
            renderTaskInfoCard(index);
            card.style.display = 'block';
            card.style.top = (event.target.getBoundingClientRect().bottom + window.scrollY + 6) + 'px';
            card.style.left = (event.target.getBoundingClientRect().left + window.scrollX) + 'px';
        }

        document.addEventListener('click', function(e) {
            const card = document.getElementById('taskInfoCard');
            if (card.style.display === 'block' && !card.contains(e.target)) {
                card.style.display = 'none';
            }
        });

        window.addEventListener('scroll', () => {
            document.getElementById('taskInfoCard').style.display = 'none';
        });

        function addTask() {
            const taskValue = taskInput.value.trim();
            if (taskValue) {
                tasks.push({
                    task: taskValue,
                    completed: false,
                    totalTime: 0,
                    sessions: []
                });
                localStorage.setItem('tasks', JSON.stringify(tasks));
                taskInput.value = '';
                loadTasks();
            }
        }

        function handleTaskCompletion(checkbox, taskElement, preventAutoComplete = false) {
            if (!checkbox.checked) return;

            const activeTaskName = taskElement.querySelector('.task-text')?.textContent;
            const floatingTimer = document.getElementById('taskTimerDisplay');
            const timerTaskName = floatingTimer?.querySelector('#taskTimerTitle')?.textContent;

            // Only auto-complete the timer if not prevented (i.e., when user manually checks task)
            if (!preventAutoComplete && floatingTimer && timerTaskName === activeTaskName) {
                autoCompleteTimer();
            }

            const tasksContainer = document.getElementById('taskList');
            const rect = taskElement.getBoundingClientRect();
            const parentRect = tasksContainer.getBoundingClientRect();
            const top = rect.top - parentRect.top;
            const left = rect.left - parentRect.left + rect.width / 2 - 10;

            taskElement.classList.add('pop');

            setTimeout(() => {
                const sparkle = document.createElement('span');
                sparkle.className = 'task-sparkle';
                sparkle.textContent = '✨';
                sparkle.style.top = `${top}px`;
                sparkle.style.left = `${left}px`;
                sparkle.style.position = 'absolute';

                tasksContainer.style.position = 'relative';
                tasksContainer.appendChild(sparkle);

                setTimeout(() => {
                    const index = parseInt(taskElement.dataset.index);
                    toggleTask(index);
                    sparkle.remove();
                }, 1200);
            }, 600);
        }

        function handleTaskUncheck(checkbox, taskElement, index) {
            if (checkbox.checked) return;

            const taskTextElement = taskElement.querySelector('.task-text');
            if (!taskTextElement) return;
            const taskName = taskTextElement.textContent;

            if (TimerState.taskName === taskName) {
                clearTimerStates();
                updateFocusTimerDisplay();
            }

            toggleTask(index);
        }

        function toggleTask(index) {
            tasks[index].completed = !tasks[index].completed;
            if (tasks[index].completed) {
                tasks[index].completedAt = new Date().toISOString();
                onTaskCompleteByName(tasks[index].task);
            } else {
                delete tasks[index].completedAt;
                onTaskRestoreByName(tasks[index].task);
            }
            localStorage.setItem('tasks', JSON.stringify(tasks));
            updateDailyReportData();
            loadTasks();
        }

        function deleteTask(index) {
            tasks.splice(index, 1);
            localStorage.setItem('tasks', JSON.stringify(tasks));
            updateDailyReportData();
            loadTasks();
        }

        function autoCompleteTimer() {
            const floating = document.getElementById('taskTimerDisplay');
            const collapsed = document.getElementById('minimizedTaskTimer');
            const timerEl = isTimerMinimized ? collapsed : floating;
            if (!timerEl) return;

            timerEl.style.animation = 'timerCompletePop 0.8s ease-out forwards';
            if (taskTimerInterval) clearInterval(taskTimerInterval);
            taskTimerInterval = null;
            logCurrentSession();
            TimerState.complete();

            if (autoCompleteTimeout) clearTimeout(autoCompleteTimeout);
            autoCompleteTimeout = setTimeout(() => {
                if (floating) floating.style.display = 'none';
                if (collapsed) collapsed.style.display = 'none';
                currentTaskIndex = null;
                pinnedTaskIndex = null;
                isTimerMinimized = false;
                isTaskPaused = false;
                isRunning = false;
                loadTasks();
                openMoodPromptModal('after');
                autoCompleteTimeout = null;
            }, 800);
        }

        function completeCurrentTask() {
            const floating = document.getElementById('taskTimerDisplay');
            const collapsed = document.getElementById('minimizedTaskTimer');

            let taskName = null;
            if (isTimerMinimized && collapsed) {
                taskName = collapsed.querySelector('#minTaskTitle')?.textContent;
            } else if (floating) {
                taskName = floating.querySelector('#taskTimerTitle')?.textContent;
            }
            if (!taskName) return;

            // Look for task in the correct container (#taskList, not #todayTasks)
            const taskElements = document.querySelectorAll('#taskList .task');
            const matchingTask = Array.from(taskElements).find(task => {
                const taskText = task.querySelector('.task-text');
                return taskText && taskText.textContent.trim() === taskName.trim();
            });

            if (matchingTask) {
                const checkbox = matchingTask.querySelector('input[type="checkbox"]');
                if (checkbox && !checkbox.checked) {
                    checkbox.checked = true;
                    // Trigger the completion handler but prevent auto-timer closure
                    const tempPreventAutoComplete = true;
                    handleTaskCompletion(checkbox, matchingTask, tempPreventAutoComplete);
                }
            }

            // Clean up timer state FIRST
            clearTimerStates();
            hideFloatingTimer();
            
            // Wait a moment for state to fully clear, then reload tasks
            setTimeout(() => {
                loadTasks();
            }, 100);
        }

        function clearTimerStates() {
            TimerState.stop();
        }

        function hideFloatingTimer() {
            const floating = document.getElementById('taskTimerDisplay');
            const collapsed = document.getElementById('minimizedTaskTimer');
            
            if (floating) floating.style.display = 'none';
            if (collapsed) collapsed.style.display = 'none';
            
            // Clear any running timer intervals
            if (taskTimerInterval) {
                clearInterval(taskTimerInterval);
                taskTimerInterval = null;
            }
            
            // Reset ALL timer state variables
            currentTaskIndex = null;
            taskTimeRemaining = 0;
            isTaskPaused = false;
            isTimerMinimized = false;
            pinnedTaskIndex = null;  // Explicitly reset this too
            
            // Remove user from community activity feed
            removeUserFromActivityFeed();
            
            // Update UI to reflect timer is no longer running
            updateFloatingMsg();
            
            // Hide the "Active timer running elsewhere" message
            const floatingMsg = document.getElementById('floatingMsg');
            if (floatingMsg) floatingMsg.style.display = 'none';
        }

        function updateFocusTimerDisplay() {
            const timerSection = document.getElementById('timerSection');
            const timerControls = timerSection?.querySelector('.timer-controls');
            if (timerControls) {
                timerControls.style.display = 'block';
            }
        }

        function toggleBreakItem(tIndex, iIndex) {
            const items = tasks[tIndex].activeBreak?.items;
            if (!items) return;
            items[iIndex].done = !items[iIndex].done;
            localStorage.setItem('tasks', JSON.stringify(tasks));
            loadTasks();
        }

        function toggleSubtaskItem(tIndex, iIndex) {
            const items = tasks[tIndex].subtasks;
            if (!items) return;
            items[iIndex].done = !items[iIndex].done;
            localStorage.setItem('tasks', JSON.stringify(tasks));
            loadTasks();
        }

        function toggleChecklist(index) {
            tasks[index].checklistCollapsed = !tasks[index].checklistCollapsed;
            localStorage.setItem('tasks', JSON.stringify(tasks));
            loadTasks();
        }

        function toggleSubtaskList(index) {
            tasks[index].subtasksCollapsed = !tasks[index].subtasksCollapsed;
            localStorage.setItem('tasks', JSON.stringify(tasks));
            loadTasks();
        }

        function toggleTaskContent(index) {
            const task = tasks[index];
            const hasSubs = task.subtasks && task.subtasks.length;
            const hasBreak = task.activeBreak && task.activeBreak.items && task.activeBreak.items.length;
            if (hasSubs) task.subtasksCollapsed = !task.subtasksCollapsed;
            if (hasBreak) task.checklistCollapsed = !task.checklistCollapsed;
            localStorage.setItem('tasks', JSON.stringify(tasks));
            loadTasks();
        }

        function addBreakListItem(tIndex) {
            pendingBreakTaskIndex = tIndex;
            document.getElementById('breakTaskInput').value = '';
            document.getElementById('addBreakTaskModal').classList.add('active');
            document.getElementById('breakTaskInput').focus();
        }

        function closeBreakTaskModal() {
            document.getElementById('addBreakTaskModal').classList.remove('active');
            pendingBreakTaskIndex = null;
        }

        function saveBreakTask() {
            const text = document.getElementById('breakTaskInput').value.trim();
            if (!text || pendingBreakTaskIndex === null) { return; }
            if (!tasks[pendingBreakTaskIndex].activeBreak) {
                tasks[pendingBreakTaskIndex].activeBreak = { id: Date.now(), items: [] };
            }
            tasks[pendingBreakTaskIndex].activeBreak.items.push({ text, done: false });
            localStorage.setItem('tasks', JSON.stringify(tasks));
            loadTasks();
            closeBreakTaskModal();
        }

        document.getElementById('breakTaskInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') saveBreakTask();
        });

function addSubtaskRow(val = '') {
    const row = document.createElement('div');
    row.className = 'subtask-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'subtask-input';
    input.placeholder = 'Subtask';
    input.value = val;
    const delBtn = document.createElement('button');
    delBtn.textContent = '×';
    delBtn.className = 'delete-subtask';
    delBtn.addEventListener('click', () => row.remove());
    row.appendChild(input);
    row.appendChild(delBtn);
    document.getElementById('subtaskInputs').appendChild(row);
}

function openSubtaskModal(tIndex) {
    pendingSubtaskIndex = tIndex;
    const title = document.getElementById('subtaskModalTitle');
    if (title) title.textContent = `Add subtasks for: ${tasks[tIndex].task}`;
    const container = document.getElementById('subtaskInputs');
    container.innerHTML = '';
    const existing = tasks[tIndex].subtasks || [];
    if (existing.length) {
        existing.forEach(st => addSubtaskRow(st.text || st));
    } else {
        addSubtaskRow();
    }
    document.getElementById('addSubtaskModal').classList.add('active');
}

        function closeSubtaskModal() {
            document.getElementById('addSubtaskModal').classList.remove('active');
            pendingSubtaskIndex = null;
            document.getElementById('subtaskInputs').innerHTML = '';
        }

        function saveSubtasks() {
            if (pendingSubtaskIndex === null) return;
            const inputs = Array.from(document.querySelectorAll('#subtaskInputs .subtask-input'));
            const subs = inputs.map(i => i.value.trim()).filter(v => v).map(t => ({ text: t, done: false }));
            if (subs.length) {
                tasks[pendingSubtaskIndex].subtasks = subs;
            } else {
                delete tasks[pendingSubtaskIndex].subtasks;
            }
            localStorage.setItem('tasks', JSON.stringify(tasks));
            loadTasks();
            closeSubtaskModal();
        }

        document.getElementById('addSubtaskRowBtn').addEventListener('click', () => addSubtaskRow());

        // Add task on Enter key
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTask();
            }
        });

        addTaskButton.addEventListener('click', addTask);

        // Mood Tracker functionality
        const moodEmojis = document.querySelectorAll('#mainMoodContainer .emoji');
        const moodHistory = document.getElementById('moodHistory');
        const moodTimeline = document.getElementById('moodTimeline');
        const moodGaugeLabel = document.getElementById('moodGaugeLabel');
        const batteryBars = document.querySelectorAll('.battery-bar');
        const pastMoodsContent = document.getElementById('pastMoodsContent');
        const openPastMoodsBtn = document.getElementById('openPastMoodsBtn');
        let showAllMoodLog = false;
        let autoPausedByMood = false;

        function loadTodaysMood() {
            const moodLog = JSON.parse(localStorage.getItem('moodLog')) || [];

            if (moodLog.length) {
                const last = moodLog[moodLog.length - 1];
                moodEmojis.forEach(emoji => {
                    if (emoji.dataset.mood === last.mood) {
                        emoji.classList.add('selected');
                    }
                });
            }

            updateMoodHistory();
            updateMoodGauge();
        }

        function formatTime(dateStr) {
            const options = { hour: 'numeric', minute: 'numeric' };
            return new Date(dateStr).toLocaleTimeString([], options);
        }

        function updateMoodHistory() {
            const moodLog = JSON.parse(localStorage.getItem('moodLog')) || [];
            const breakLog = JSON.parse(localStorage.getItem('breakLog')) || [];

            moodTimeline.innerHTML = '';

            if (moodLog.length === 0 && breakLog.length === 0) {
                moodHistory.textContent = 'No mood logged yet';
                return;
            }

            const latestMood = moodLog[moodLog.length - 1];
            // Hide the redundant "Latest mood" display - mood timeline shows the history
            moodHistory.textContent = '';

            const entries = moodLog.map(e => ({...e, type:'mood'})).concat(
                breakLog.map(b => ({...b, type:'break'}))
            );

            const displayEntries = showAllMoodLog ? entries.slice() : entries.slice(-7);

            displayEntries.sort((a,b) => new Date(b.date) - new Date(a.date));

            displayEntries.forEach(entry => {
                const div = document.createElement('div');
                div.classList.add('mood-timeline-entry');
                if (entry.type === 'mood') {
                    const eElapsed = (entry.minutesIntoTask !== null && entry.minutesIntoTask !== undefined) ? entry.minutesIntoTask : entry.elapsed;
                    const taskInfo = entry.task ? `During "${entry.task}" (${eElapsed} min in)` : 'No task active';
                    div.textContent = `${entry.mood} – ${formatTime(entry.date)} – ${taskInfo}`;
                    if (entry.reason) {
                        const reasonDiv = document.createElement('div');
                        reasonDiv.className = 'mood-reason';
                        reasonDiv.textContent = `"${entry.reason}"`;
                        div.appendChild(reasonDiv);
                    }
                } else {
                    div.textContent = `Break – ${entry.duration} mins ended at ${formatTime(entry.date)}`;
                }
                moodTimeline.appendChild(div);
            });

            // Show/hide past moods based on count - now handled by openPastMoodsBtn modal
        }

        function updateMoodGauge() {
            const moodLog = JSON.parse(localStorage.getItem('moodLog')) || [];
            const todayStr = new Date().toISOString().split('T')[0];
            const mapping = { '😫':-5, '😮‍💨':-4, '😐':0, '🙂':4, '😄':5 };
            const moodClasses = { 1:'mood-stressed', 2:'mood-tired', 3:'mood-meh', 4:'mood-okay', 5:'mood-good' };
            const moodLabels = { 1:'Stressed', 2:'Tired', 3:'Neutral', 4:'Good', 5:'Great' };
            const contextMessages = { 
                1:'Be extra gentle with yourself today',
                2:'Maybe take it easy today', 
                3:'Small steps count today',
                4:'You\'re doing well today',
                5:'Great energy today!'
            };
            
            const todays = moodLog.filter(m => m.date.startsWith(todayStr));
            
            // Clear all bars first
            batteryBars.forEach(bar => {
                bar.className = 'battery-bar';
            });
            
            const todayEnergyLabel = document.getElementById('todayEnergyLabel');
            const moodContextMessage = document.getElementById('moodContextMessage');
            
            if (!todays.length) {
                todayEnergyLabel.textContent = 'Today\'s energy';
                moodContextMessage.textContent = 'Select your mood to see your energy';
                return;
            }
            
            // Calculate weighted average mood level with exponential impact for stress
            const avg = todays.reduce((s,m) => s + (mapping[m.mood] || 3), 0) / todays.length;
            
            // Debug logging
            console.log('Today\'s moods:', todays.map(m => m.mood));
            console.log('Weighted average:', avg);
            
            // Map symmetrical average (-5 to +5) back to 1-5 scale for display
            let level;
            if (avg < 0) level = 1;         // Any negative → Stressed (stress is draining you)
            else if (avg <= 1.5) level = 2; // 0-1.5 → Tired (low positive energy)
            else if (avg <= 3) level = 3;   // 1.5-3 → Neutral (mild positive)
            else if (avg <= 4.5) level = 4; // 3-4.5 → Good (strong positive)
            else level = 5;                 // 4.5+ → Great (very high energy)
            
            console.log('Final level:', level);
            
            // Fill bars up to the level with appropriate color
            for (let i = 0; i < level && i < batteryBars.length; i++) {
                batteryBars[i].classList.add(moodClasses[level]);
            }
            
            todayEnergyLabel.textContent = `Today's energy: ${moodLabels[level]}`;
            moodContextMessage.textContent = contextMessages[level];
        }

        moodEmojis.forEach(emoji => {
            emoji.addEventListener('click', function() {
                moodEmojis.forEach(e => e.classList.remove('selected'));
                this.classList.add('selected');

                const now = new Date();
                let moodLog = JSON.parse(localStorage.getItem('moodLog')) || [];

                let taskName = null;
                let minutesIntoTask = null;
                if (taskTimerInterval && currentTaskIndex !== null) {
                    const task = tasks[currentTaskIndex];
                    if (task) {
                        taskName = task.task;
                        minutesIntoTask = Math.floor((selectedDuration * 60 - taskTimeRemaining) / 60);
                    }
                }

                let moodType = pendingMoodType || ((taskTimerInterval || isTaskPaused) ? 'midway' : 'before');
                if (moodType === 'after') {
                    minutesIntoTask = Math.floor(taskOriginalDuration / 60);
                } else if (moodType === 'before') {
                    minutesIntoTask = 0;
                }

                const finalize = (reason) => {
                    moodLog.push({
                        date: now.toISOString(),
                        mood: emoji.dataset.mood,
                        task: taskName,
                        minutesIntoTask: minutesIntoTask,
                        type: moodType,
                        reason: reason
                    });

                    localStorage.setItem('moodLog', JSON.stringify(moodLog));
                    updateCharts();
                    updateMoodHistory();
                    updateMoodGauge();
                    pendingMoodType = null;
                };

                if (['😮‍💨','😫'].includes(this.dataset.mood) && taskTimerInterval) {
                    pauseTaskTimer();
                    autoPausedByMood = true;
                }

                if (['😐','😮‍💨','😫'].includes(this.dataset.mood)) {
                    openMoodReasonModal('', finalize, this.dataset.mood);
                } else {
                    finalize(null);
                }
            });
        });


        openPastMoodsBtn.addEventListener('click', openPastMoodsModal);
        document.getElementById('moodHelpBtn').addEventListener('click', openMoodHelpModal);

        const trendContainer = document.getElementById('moodTrends');
        const trendTooltip = document.getElementById('trendTooltip');
        const trendBtn = document.getElementById('toggleTrendView');
        let hideTrendTimeout = null;

        function getWeekBounds(date) {
            const d = new Date(date);
            const day = d.getDay();
            const diffToMonday = (day + 6) % 7;
            const start = new Date(d);
            start.setDate(d.getDate() - diffToMonday);
            start.setHours(0,0,0,0);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23,59,59,999);
            return {start, end};
        }

        const moodScore = { '😄': 2, '🙂': 1, '😐': 0, '😮‍💨': -1, '😫': -2 };

        function getCurrentWeek() { return getWeekBounds(new Date()); }
        function getLastCompleteWeek() {
            const cw = getCurrentWeek();
            const lastStart = new Date(cw.start);
            lastStart.setDate(lastStart.getDate() - 7);
            return getWeekBounds(lastStart);
        }

        function getEntriesForRange(start, end) {
            const dailyLog = JSON.parse(localStorage.getItem('dailyLog')) || [];
            const moodLog = JSON.parse(localStorage.getItem('moodLog')) || [];
            let entries = [];
            dailyLog.forEach(d => {
                const day = new Date(d.date);
                if (day >= start && day <= end && d.moods) entries = entries.concat(d.moods);
            });
            const todayStr = new Date().toISOString().split('T')[0];
            const todayDate = new Date(todayStr);
            if (todayDate >= start && todayDate <= end) entries = entries.concat(moodLog);
            return entries;
        }

        function getBestWorstDays(entries) {
            const stats = {};
            entries.forEach(e => {
                const day = new Date(e.date).getDay();
                stats[day] = stats[day] || {pos:0,total:0};
                if (e.mood === '🙂' || e.mood === '😄') stats[day].pos++;
                stats[day].total++;
            });
            let best=null,bestR=-1,worst=null,worstR=2;
            Object.keys(stats).forEach(k => {
                const r = stats[k].pos / stats[k].total;
                if (r > bestR) { bestR = r; best = parseInt(k); }
                if (r < worstR) { worstR = r; worst = parseInt(k); }
            });
            return {bestDay:best, worstDay:worst};
        }

        function getWeeklyTaskCorrelations(entries) {
            const map = {};
            entries.forEach(e => {
                if (!e.task) return;
                const t = map[e.task] || {pos:0,count:0};
                if (e.mood === '🙂' || e.mood === '😄') t.pos++;
                t.count++;
                map[e.task] = t;
            });
            return Object.entries(map)
                .sort((a,b) => b[1].count - a[1].count)
                .slice(0,2)
                .map(([task,data]) => `${task} ${Math.round((data.pos/data.count)*100)}% positive`);
        }

        function weekAverage(entries) {
            if (!entries.length) return 0;
            const sum = entries.reduce((s,e) => s + (moodScore[e.mood]||0), 0);
            return sum / entries.length;
        }

        function getWeekComparison(curr, last) {
            return weekAverage(curr) - weekAverage(last);
        }

        function showTrendTooltip() {
            clearTimeout(hideTrendTimeout);
            loadMoodTrends();
            trendTooltip.style.display = 'block';
            requestAnimationFrame(() => trendTooltip.classList.add('show'));
        }

        function scheduleHideTrendTooltip() {
            hideTrendTimeout = setTimeout(() => {
                trendTooltip.classList.remove('show');
                setTimeout(() => {
                    trendTooltip.style.display = 'none';
                }, 200);
            }, 400);
        }

        trendBtn.addEventListener('click', openTrendsModal);

        function loadMoodTrends() {
            const cw = getCurrentWeek();
            const lw = getLastCompleteWeek();
            const currentWeekEntries = getEntriesForRange(cw.start, cw.end);
            const lastWeekEntries = getEntriesForRange(lw.start, lw.end);

            let entries = [];
            let label = '';
            if (currentWeekEntries.length >= 3) {
                entries = currentWeekEntries;
                label = 'This week';
            } else if (lastWeekEntries.length >= 3) {
                entries = lastWeekEntries;
                label = 'Last week';
            } else {
                const start = new Date();
                start.setDate(start.getDate() - 6);
                entries = getEntriesForRange(start, new Date());
                label = 'Last 7 days';
            }

            if (!entries.length) {
                trendContainer.textContent = 'Track for a few more days to see patterns';
                return;
            }

            const counts = {};
            entries.forEach(e => { counts[e.mood] = (counts[e.mood] || 0) + 1; });

            const total = entries.length;
            trendContainer.innerHTML = '';
            const title = document.createElement('div');
            title.className = 'mood-section-title';
            title.textContent = label;
            trendContainer.appendChild(title);
            const moodOrder = ['😐','🙂','😄','😮‍💨','😫'];
            let positive = 0;

            moodOrder.forEach(m => {
                const c = counts[m] || 0;
                if (m === '🙂' || m === '😄') positive += c;
                const percent = Math.round((c / total) * 100);
                const div = document.createElement('div');
                div.innerHTML = `<span>${m} ${percent}%</span><div class='trend-bar'><div class='trend-bar-inner' style='width:${percent}%;'></div></div>`;
                trendContainer.appendChild(div);
            });

            const summary = document.createElement('div');
            summary.style.marginBottom = '0.5rem';
            const positivity = Math.round((positive / total) * 100);
            summary.textContent = `Positive moods ${positivity}% ${label.toLowerCase()}`;
            trendContainer.prepend(summary);

            const {bestDay, worstDay} = getBestWorstDays(entries);
            const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            if (bestDay !== null) {
                const insight1 = document.createElement('div');
                insight1.style.marginTop = '0.5rem';
                insight1.textContent = `Best day: ${days[bestDay]}`;
                trendContainer.appendChild(insight1);
            }
            if (worstDay !== null && worstDay !== bestDay) {
                const insight2 = document.createElement('div');
                insight2.textContent = `Toughest day: ${days[worstDay]}`;
                trendContainer.appendChild(insight2);
            }

            const taskInsights = getWeeklyTaskCorrelations(entries);
            if (taskInsights.length) {
                const tDiv = document.createElement('div');
                tDiv.textContent = `Tasks: ${taskInsights.join(', ')}`;
                trendContainer.appendChild(tDiv);
            }

            if (currentWeekEntries.length >= 3 && lastWeekEntries.length >= 3) {
                const diff = getWeekComparison(currentWeekEntries, lastWeekEntries);
                const diffDiv = document.createElement('div');
                if (Math.abs(diff) > 0.01) {
                    diffDiv.textContent = `${diff > 0 ? 'Up' : 'Down'} ${Math.abs(diff).toFixed(2)} vs last week`;
                } else {
                    diffDiv.textContent = 'No change vs last week';
                }
                trendContainer.appendChild(diffDiv);
            }
        }

        const energyContainer = document.getElementById('energyInsights');
        const energyTooltip = document.getElementById('energyTooltip');
        const energyBtn = document.getElementById('toggleEnergyView');
        let hideEnergyTimeout = null;

        function getAllMoodEntries() {
            const dailyLog = JSON.parse(localStorage.getItem('dailyLog')) || [];
            const moodLog = JSON.parse(localStorage.getItem('moodLog')) || [];
            let entries = [];
            dailyLog.forEach(d => { if (d.moods) entries = entries.concat(d.moods); });
            return entries.concat(moodLog);
        }

        function hourLabel(h) {
            const period = h >= 12 ? 'pm' : 'am';
            let hr = h % 12;
            if (hr === 0) hr = 12;
            return `${hr}${period}`;
        }

        function loadEnergyInsights() {
            const entries = getAllMoodEntries();
            energyContainer.innerHTML = '';
            if (entries.length < 14) {
                energyContainer.textContent = 'Track a bit more to find your optimal hours ⏰';
                return;
            }

            const useNarrow = entries.length >= 21;
            const segments = [];
            if (useNarrow) {
                for (let h = 6; h < 22; h += 2) {
                    segments.push({ start: h, end: h + 2, label: `${hourLabel(h)}-${hourLabel(h + 2)}` });
                }
            } else {
                segments.push({ start: 6, end: 11, label: 'morning (6-11am)' });
                segments.push({ start: 11, end: 15, label: 'midday (11am-3pm)' });
                segments.push({ start: 15, end: 18, label: 'afternoon (3-6pm)' });
                segments.push({ start: 18, end: 22, label: 'evening (6-10pm)' });
            }

            segments.forEach(s => { s.score = 0; s.count = 0; });
            entries.forEach(e => {
                const h = new Date(e.date).getHours();
                const score = moodScore[e.mood] || 0;
                segments.forEach(s => { if (h >= s.start && h < s.end) { s.score += score; s.count++; } });
            });
            segments.forEach(s => { s.avg = s.count ? s.score / s.count : -Infinity; });
            const valid = segments.filter(s => s.count > 0);
            if (!valid.length) {
                energyContainer.textContent = 'Track a bit more to see patterns';
                return;
            }

            const best = valid.reduce((a, b) => (b.avg > a.avg ? b : a));
            const worst = valid.reduce((a, b) => (b.avg < a.avg ? b : a));

            const summary = document.createElement('div');
            if (entries.length >= 21) {
                summary.textContent = `Your peak energy: ${best.label} ⚡ (based on ${entries.length} sessions)`;
            } else {
                summary.textContent = `You seem most focused in the ${best.label.split(' ')[0]} ☀️`;
            }
            energyContainer.appendChild(summary);

            if (worst.avg < best.avg - 0.5) {
                const crash = document.createElement('div');
                crash.textContent = `Avoid heavy tasks ${useNarrow ? 'around ' + worst.label : 'after ' + worst.label.split(' ')[0]} 😴`;
                energyContainer.appendChild(crash);
            }

            if (entries.length >= 35) {
                const weekdays = entries.filter(e => { const d = new Date(e.date).getDay(); return d >= 1 && d <= 5; });
                const weekends = entries.filter(e => { const d = new Date(e.date).getDay(); return d === 0 || d === 6; });
                const weekAvg = weekAverage(weekdays);
                const endAvg = weekAverage(weekends);
                if (Math.abs(weekAvg - endAvg) > 0.1) {
                    const wd = document.createElement('div');
                    wd.textContent = weekAvg > endAvg ? 'Weekdays show higher energy than weekends' : 'Weekends show higher energy than weekdays';
                    energyContainer.appendChild(wd);
                }
            }
        }

        function showEnergyTooltip() {
            clearTimeout(hideEnergyTimeout);
            loadEnergyInsights();
            energyTooltip.style.display = 'block';
            requestAnimationFrame(() => energyTooltip.classList.add('show'));
        }

        function scheduleHideEnergyTooltip() {
            hideEnergyTimeout = setTimeout(() => {
                energyTooltip.classList.remove('show');
                setTimeout(() => { energyTooltip.style.display = 'none'; }, 200);
            }, 400);
        }

        energyBtn.addEventListener('click', openEnergyModal);

        const reportContainer = document.getElementById('dailyReportContent');
        const reportTooltip = document.getElementById('dailyReportTooltip');
        const reportBtn = document.getElementById('viewDailyReport');
        let hideReportTimeout = null;
        let currentReportMsg = null;

        function updateDailyReportData() {
            const doneTasks = tasks.filter(t => t.completed && isDateToday(t.completedAt));
            let focusMinutes = 0;
            tasks.forEach(t => {
                (t.sessions || []).forEach(s => {
                    if (isDateToday(s.completedAt)) focusMinutes += s.duration || 0;
                });
            });
            localStorage.setItem('dailyReportData', JSON.stringify({
                date: new Date().toISOString().split('T')[0],
                completed: doneTasks.length,
                focusMinutes
            }));
        }

        function formatDuration(mins) {
            const h = Math.floor(mins / 60);
            const m = Math.round(mins % 60);
            return h ? `${h}h ${m}m` : `${m}m`;
        }

        function loadDailyReport(msg) {
            const doneTasks = tasks.filter(t => t.completed && isDateToday(t.completedAt));
            const taskCount = doneTasks.length;

            let focusMinutes = 0;
            tasks.forEach(t => {
                (t.sessions || []).forEach(s => {
                    if (isDateToday(s.completedAt)) focusMinutes += s.duration || 0;
                });
            });

            const avgMinutes = taskCount ? focusMinutes / taskCount : 0;

            const hourBuckets = {};
            tasks.forEach(t => {
                (t.sessions || []).forEach(s => {
                    if (isDateToday(s.completedAt)) {
                        const h = new Date(s.completedAt).getHours();
                        hourBuckets[h] = (hourBuckets[h] || 0) + s.duration;
                    }
                });
            });
            const peakHour = Object.keys(hourBuckets).reduce((a,b)=> hourBuckets[b] > (hourBuckets[a]||0) ? b : a, null);
            const peakLabel = peakHour !== null ? `${((peakHour%12)||12)}${peakHour>=12?'pm':'am'}-${(((parseInt(peakHour)+1)%12)||12)}${peakHour+1>=12?'pm':'am'}` : null;

            const moodLog = JSON.parse(localStorage.getItem('moodLog')) || [];
            const afterMoods = moodLog.filter(m => m.type === 'after' && isDateToday(m.date));
            const moodCounts = {};
            afterMoods.forEach(m => { moodCounts[m.mood] = (moodCounts[m.mood]||0)+1; });
            const topMood = Object.keys(moodCounts).reduce((a,b)=> moodCounts[b] > (moodCounts[a]||0) ? b : a, afterMoods[0]?.mood || '');
            const moodPercent = afterMoods.length ? Math.round((moodCounts[topMood]/afterMoods.length)*100) : 0;

            const breakLog = JSON.parse(localStorage.getItem('breakLog')) || [];
            const breaksToday = breakLog.filter(b => isDateToday(b.date));
            const breakCount = breaksToday.length;
            const avgBreak = breakCount ? breaksToday.reduce((a,b)=>a+b.duration,0)/breakCount : 0;

            const past = JSON.parse(localStorage.getItem('dailyLog')) || [];
            let streak = 0;
            const day = new Date();
            while (true) {
                const dStr = day.toISOString().split('T')[0];
                let has = false;
                if (isDateToday(dStr)) {
                    has = taskCount > 0;
                } else {
                    const entry = past.find(e => e.date === dStr);
                    if (entry && entry.tasks.some(t => t.completed)) has = true;
                }
                if (has) {
                    streak++;
                    day.setDate(day.getDate()-1);
                } else {
                    break;
                }
            }

            const progressMsgs = {
                empty: [
                    "Blank doesn’t mean nothing. It means potential. 💪",
                    "This space will fill up as you go. No rush. ✨",
                    "Nothing here yet — but that’s okay. Starting is the hardest part. 🌱"
                ],
                minimal: [
                    "Nice start! Keep the momentum going 🚀",
                    "Every task counts! 💫",
                    "Building good habits today ⭐"
                ],
                good: [
                    "Great momentum today! 🔥",
                    "You're on a roll! 🌟",
                    "Productive day in progress! ✨"
                ],
                high: [
                    "Amazing productivity today! 🎉",
                    "You're crushing it! 💪",
                    "Incredible focus today! 🏆"
                ]
            };
            let msgGroup = "empty";
            if (taskCount === 0) msgGroup = "empty";
            else if (taskCount <= 2) msgGroup = "minimal";
            else if (taskCount <= 5) msgGroup = "good";
            else msgGroup = "high";
            const randMsgs = progressMsgs[msgGroup];
            const reportMsg = msg || randMsgs[Math.floor(Math.random() * randMsgs.length)];

            reportContainer.innerHTML =
                `<div class='mood-section-title'>📊 Today's Progress</div>`+
                `<div>✅ ${taskCount} task${taskCount===1?'':'s'} completed</div>`+
                `<div>⏱️ ${formatDuration(focusMinutes)} focused work</div>`+
                (peakLabel?`<div>📈 Peak focus: ${peakLabel}</div>`:'')+
                (topMood?`<div>😊 ${topMood} after ${moodPercent}% of tasks</div>`:'')+
                (breakCount?`<div>☕️ ${breakCount} breaks, avg ${formatDuration(avgBreak)}</div>`:'')+
                `<div>🔥 ${streak}-day completion streak</div>`+
                `<div style='margin-top:0.25rem;'>${reportMsg}</div>`;
            return reportMsg;
        }

        function showDailyReport() {
            clearTimeout(hideReportTimeout);
            currentReportMsg = loadDailyReport(currentReportMsg);
            reportTooltip.style.display = 'block';
            requestAnimationFrame(() => reportTooltip.classList.add('show'));
        }

        function scheduleHideDailyReport() {
            hideReportTimeout = setTimeout(() => {
                reportTooltip.classList.remove('show');
                setTimeout(() => { reportTooltip.style.display = 'none'; currentReportMsg = null; }, 200);
            }, 400);
        }

        reportBtn.addEventListener('mouseenter', showDailyReport);
        reportBtn.addEventListener('mouseleave', scheduleHideDailyReport);
        reportTooltip.addEventListener('mouseenter', showDailyReport);
        reportTooltip.addEventListener('mouseleave', scheduleHideDailyReport);

        // Timer functionality
        let timerInterval;
        let totalTime = 25 * 60; // default timer length in seconds
        let timeRemaining = totalTime;
        let isRunning = false;
        let isEditingTimer = false;
        const timerDisplay = document.getElementById('timerDisplay');
        const timerInput = document.getElementById('timerInput');
        const startBtn = document.getElementById('startTimer');
        const pauseBtn = document.getElementById('pauseTimer');
        const resetBtn = document.getElementById('resetTimer');
        const progressBar = document.getElementById('timerProgressBar');

        function updateTimerDisplay() {
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if (isRunning || !isEditingTimer) {
                timerDisplay.style.display = 'inline';
            } else {
                timerDisplay.style.display = 'none';
            }

            if (isEditingTimer) {
                timerInput.style.display = 'inline';
                timerInput.value = Math.floor(totalTime / 60);
            } else {
                timerInput.style.display = 'none';
            }

            const progress = ((totalTime - timeRemaining) / totalTime) * 100;
            progressBar.style.width = `${progress}%`;
        }

        function startEditingTimer() {
            if (isRunning) return;
            isEditingTimer = true;
            updateTimerDisplay();
            timerInput.focus();
            timerInput.select();
        }

        function finishEditingTimer() {
            const minutes = parseInt(timerInput.value);
            if (minutes && minutes > 0) {
                totalTime = minutes * 60;
                timeRemaining = totalTime;
            }
            isEditingTimer = false;
            updateTimerDisplay();
        }

        function startTimer() {
            if (isRunning) return;
            if (isEditingTimer) finishEditingTimer();
            document.getElementById('focusTaskName').value = '';
            document.getElementById('focusTaskModal').classList.add('active');
        }

        function pauseTimer() {
            if (isRunning) {
                clearInterval(timerInterval);
                isRunning = false;
                startBtn.disabled = false;
                pauseBtn.disabled = true;
            }
        }

        function resetTimer() {
            clearInterval(timerInterval);
            isRunning = false;
            timeRemaining = totalTime;
            updateTimerDisplay();
            const startBtn = document.getElementById('startTimer');
            const pauseBtn = document.getElementById('pauseTimer');
            const progressBar = document.getElementById('timerProgressBar');
            if (startBtn) {
                startBtn.textContent = 'Start';
                startBtn.disabled = false;
            }
            if (pauseBtn) {
                pauseBtn.disabled = true;
            }
            if (progressBar) {
                progressBar.style.width = '0%';
            }
        }

        // Initialize timer display
        updateTimerDisplay();

        startBtn.addEventListener('click', startTimer);
        pauseBtn.addEventListener('click', pauseTimer);
        resetBtn.addEventListener('click', resetTimer);
        timerDisplay.addEventListener('click', startEditingTimer);
        timerInput.addEventListener('blur', finishEditingTimer);
        timerInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') finishEditingTimer(); });

        // Focus task modal handler
        document.getElementById('startFocusTask').addEventListener('click', () => {
            const nameInput = document.getElementById('focusTaskName');
            const taskName = nameInput.value.trim() || 'Focus Session';
            closeFocusTaskModal();
            if (isEditingTimer) finishEditingTimer();
            const minutes = parseInt(timerInput.value) || 25;
            totalTime = minutes * 60;
            timeRemaining = totalTime;
            tasks.push({ task: taskName, completed: false, totalTime: 0, sessions: [] });
            localStorage.setItem('tasks', JSON.stringify(tasks));
            loadTasks();
            currentTaskIndex = tasks.length - 1;
            selectedDuration = minutes;
            openMoodPromptModal('before', startTaskCountdown);
        });

        function closeFocusTaskModal() {
            document.getElementById('focusTaskModal').classList.remove('active');
        }


        let moodReasonCallback = null;

        function openMoodReasonModal(initial, cb, mood) {
            moodReasonCallback = cb;
            const modal = document.getElementById('moodReasonModal');
            const input = document.getElementById('moodReasonInput');
            input.value = initial || '';
            modal.classList.add('active');
            input.focus();
            
            // Reset break error and clear break steps for fresh start
            const breakError = document.getElementById('breakError');
            breakError.style.display = 'none';
            breakError.classList.remove('show');
            
            // Reset break steps to default 3 empty items
            const breakSteps = document.getElementById('breakSteps');
            breakSteps.innerHTML = `
                <div class="break-item">
                    <input type="checkbox" class="break-checkbox">
                    <input type="text" class="break-input" placeholder="e.g., write intro paragraph">
                    <button class="remove-break-item" onclick="removeBreakItem(this)">✕</button>
                </div>
                <div class="break-item">
                    <input type="checkbox" class="break-checkbox">
                    <input type="text" class="break-input" placeholder="e.g., find supporting images">
                    <button class="remove-break-item" onclick="removeBreakItem(this)">✕</button>
                </div>
                <div class="break-item">
                    <input type="checkbox" class="break-checkbox">
                    <input type="text" class="break-input" placeholder="e.g., review and edit">
                    <button class="remove-break-item" onclick="removeBreakItem(this)">✕</button>
                </div>
            `;
            
            // Reset duration buttons
            document.querySelectorAll('.duration-quick-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.getElementById('breakDuration').value = 15;
            const header = document.getElementById('moodReasonHeader');
            const suggestion = document.getElementById('breakSuggestion');
            if (mood === '😮‍💨') {
                header.textContent = "Feeling tired? Let's understand what's draining you.";
                suggestion.style.display = 'block';
            } else if (mood === '😫') {
                header.textContent = "Feeling overwhelmed? Let's identify what's causing stress.";
                suggestion.style.display = 'block';
            } else {
                header.textContent = 'Want to share why you felt this way?';
                suggestion.style.display = 'none';
            }
        }

        function closeMoodReasonModal() {
            document.getElementById('moodReasonModal').classList.remove('active');
        }

        document.getElementById('saveMoodReason').addEventListener('click', () => {
            const val = document.getElementById('moodReasonInput').value.trim();
            closeMoodReasonModal();
            if (moodReasonCallback) moodReasonCallback(val);
        });

        document.getElementById('skipMoodReason').addEventListener('click', () => {
            closeMoodReasonModal();
            if (moodReasonCallback) moodReasonCallback(null);
        });

        document.getElementById('moodReasonModal').addEventListener('click', (e) => {
            if (e.target.id === 'moodReasonModal') {
                closeMoodReasonModal();
                if (moodReasonCallback) moodReasonCallback(null);
            }
        });

        document.getElementById('addBreakStep').addEventListener('click', () => {
            const container = document.getElementById('breakSteps');
            const div = document.createElement('div');
            div.className = 'break-item';
            div.innerHTML = `
                <input type="checkbox" class="break-checkbox">
                <input type="text" class="break-input" placeholder="e.g., review section 1">
                <button class="remove-break-item" onclick="removeBreakItem(this)">✕</button>
            `;
            container.appendChild(div);
        });

        document.getElementById('startBreakBtn').addEventListener('click', () => {
            const duration = parseInt(document.getElementById('breakDuration').value) || 15;

            const stepInputs = Array.from(document.querySelectorAll('#breakSteps .break-input'));
            const steps = stepInputs.map(el => el.value.trim());

            if (stepInputs.some(el => !el.value.trim())) {
                const err = document.getElementById('breakError');
                err.textContent = 'Please fill or remove empty tasks.';
                err.style.display = 'block';
                return;
            }

            const cleanSteps = steps.filter(v => v);

            if (cleanSteps.length) {
                if (currentTaskIndex !== null) {
                    tasks[currentTaskIndex].activeBreak = {
                        id: Date.now(),
                        items: cleanSteps.map(t => ({ text: t, done: false }))
                    };
                    tasks[currentTaskIndex].breakActive = true;
                    localStorage.setItem('tasks', JSON.stringify(tasks));
                    loadTasks();
                } else {
                    if (confirm('Add as standalone tasks to Today\'s Tasks?')) {
                        cleanSteps.forEach(t => tasks.push({ task: t }));
                        localStorage.setItem('tasks', JSON.stringify(tasks));
                        loadTasks();
                    }
                }
            }

            document.getElementById('breakError').style.display = 'none';
            closeMoodReasonModal();
            if (taskTimerInterval) pauseTaskTimer();
            startBreakTimer(duration);
            if (autoPausedByMood) {
                showBreakAssistantModal('⏸️ Your task has been paused while you take this break', false);
                autoPausedByMood = false;
            }
            if (moodReasonCallback) moodReasonCallback(document.getElementById('moodReasonInput').value.trim());
        });

        // New mood reason modal functions - make them global
        window.removeBreakItem = function(button) {
            const breakItem = button.closest('.break-item');
            breakItem.remove();
        }

        window.setBreakDuration = function(minutes) {
            document.getElementById('breakDuration').value = minutes;
            
            // Update active state for quick buttons
            document.querySelectorAll('.duration-quick-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
        }

        // Save break tasks as subtasks or standalone tasks
        document.getElementById('saveBreakTasks').addEventListener('click', () => {
            const stepInputs = Array.from(document.querySelectorAll('#breakSteps .break-input'));
            const steps = stepInputs.map(el => el.value.trim()).filter(step => step.length > 0);
            
            if (steps.length === 0) {
                const err = document.getElementById('breakError');
                err.textContent = 'Add at least one task step to save.';
                err.classList.add('show');
                setTimeout(() => err.classList.remove('show'), 3000);
                return;
            }

            const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
            
            // Check if user is currently working on a task (has active timer)
            if (typeof pinnedTaskIndex !== 'undefined' && pinnedTaskIndex !== null && tasks[pinnedTaskIndex]) {
                // Add as subtasks to current task
                const currentTask = tasks[pinnedTaskIndex];
                if (!currentTask.subtasks) {
                    currentTask.subtasks = [];
                }
                
                steps.forEach(step => {
                    currentTask.subtasks.push({
                        text: step,
                        completed: false,
                        id: Date.now() + Math.random()
                    });
                });
                
                localStorage.setItem('tasks', JSON.stringify(tasks));
                loadTasks(); // Refresh the task list
                
                // Show success feedback
                const saveBtn = document.getElementById('saveBreakTasks');
                const originalText = saveBtn.textContent;
                saveBtn.textContent = '✅ Added to current task';
                saveBtn.style.background = '#22c55e';
                
                setTimeout(() => {
                    saveBtn.textContent = originalText;
                    saveBtn.style.background = '';
                }, 2000);
                
            } else {
                // Add as standalone tasks
                steps.forEach(step => {
                    tasks.push({
                        text: step,
                        completed: false,
                        totalTime: 0,
                        sessions: [],
                        id: Date.now() + Math.random()
                    });
                });
                
                localStorage.setItem('tasks', JSON.stringify(tasks));
                loadTasks(); // Refresh the task list
                
                // Show success feedback
                const saveBtn = document.getElementById('saveBreakTasks');
                const originalText = saveBtn.textContent;
                saveBtn.textContent = '✅ Added as new tasks';
                saveBtn.style.background = '#22c55e';
                
                setTimeout(() => {
                    saveBtn.textContent = originalText;
                    saveBtn.style.background = '';
                }, 2000);
            }
        });


        // Notes functionality
        let notes = JSON.parse(localStorage.getItem('notes')) || [];
        let currentNoteId = null;
        let autoSaveTimeout = null;

        const notesList = document.getElementById('notesList');
        const noteEditor = document.getElementById('noteEditor');
        const emptyState = document.getElementById('emptyState');
        const noteTitleInput = document.getElementById('noteTitleInput');
        const noteContent = document.getElementById('noteContent');
        const addNoteBtn = document.getElementById('addNoteBtn');

        function generateNoteId() {
            return Date.now().toString();
        }

        function formatDate(date) {
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            return new Date(date).toLocaleDateString('en-US', options);
        }

        function loadNotes() {
            notesList.innerHTML = '';
            
            notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            notes.forEach(note => {
                const noteItem = document.createElement('div');
                noteItem.classList.add('note-item');
                if (note.id === currentNoteId) {
                    noteItem.classList.add('active');
                }
                
                noteItem.innerHTML = `
                    <div class="note-item-title">${note.title || 'Untitled Note'}</div>
                    <div class="note-item-date">${formatDate(note.createdAt)}</div>
                    <div class="note-actions">
                        <button class="delete-note" onclick="event.stopPropagation(); deleteNote('${note.id}')">×</button>
                    </div>
                `;
                
                noteItem.onclick = () => selectNote(note.id);
                notesList.appendChild(noteItem);
            });
        }

        function selectNote(noteId) {
            currentNoteId = noteId;
            const note = notes.find(n => n.id === noteId);
            
            if (note) {
                noteTitleInput.value = note.title || '';
                noteContent.innerHTML = note.content || '';
                noteEditor.style.display = 'flex';
                emptyState.style.display = 'none';
                loadNotes();
            }
        }

        function createNote() {
            const newNote = {
                id: generateNoteId(),
                title: 'New Note',
                content: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            notes.push(newNote);
            localStorage.setItem('notes', JSON.stringify(notes));
            selectNote(newNote.id);
            loadNotes();
            noteTitleInput.focus();
            noteTitleInput.select();
        }

        function deleteNote(noteId) {
            if (confirm('Are you sure you want to delete this note?')) {
                notes = notes.filter(n => n.id !== noteId);
                localStorage.setItem('notes', JSON.stringify(notes));
                
                if (noteId === currentNoteId) {
                    currentNoteId = null;
                    noteEditor.style.display = 'none';
                    emptyState.style.display = 'block';
                }
                
                loadNotes();
            }
        }

        function autoSaveNote() {
            if (currentNoteId) {
                const note = notes.find(n => n.id === currentNoteId);
                if (note) {
                    note.title = noteTitleInput.value || 'Untitled Note';
                    note.content = noteContent.innerHTML;
                    note.updatedAt = new Date().toISOString();
                    localStorage.setItem('notes', JSON.stringify(notes));
                    loadNotes();
                }
            }
        }

        function handleNoteInput() {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(autoSaveNote, 500);
        }

        // Add event listeners for notes
        addNoteBtn.addEventListener('click', createNote);
        noteTitleInput.addEventListener('input', handleNoteInput);
        noteContent.addEventListener('input', handleNoteInput);

        // Floating formatting toolbar
        const formatToolbar = document.getElementById('formatToolbar');

        function applyFormat(tag) {
            const commandMap = {
                strong: 'bold',
                em: 'italic',
                del: 'strikeThrough',
                u: 'underline'
            };

            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            if (range.collapsed || !noteContent.contains(sel.anchorNode)) return;

            if (tag === 'mark') {
                if (isSelectionFullyWrapped(range, 'mark')) {
                    document.execCommand('hiliteColor', false, 'transparent');
                } else {
                    document.execCommand('hiliteColor', false, 'yellow');
                }
            } else if (tag === 'del') {
                document.execCommand('strikeThrough');
            } else {
                document.execCommand(commandMap[tag]);
            }
            normalizeFormatting();

            hideFormatToolbar();
            autoSaveNote();
        }

        function normalizeFormatting() {
            noteContent.querySelectorAll('b').forEach(el => {
                const strong = document.createElement('strong');
                strong.innerHTML = el.innerHTML;
                el.replaceWith(strong);
            });
            noteContent.querySelectorAll('i').forEach(el => {
                const em = document.createElement('em');
                em.innerHTML = el.innerHTML;
                el.replaceWith(em);
            });
            noteContent.querySelectorAll('strike').forEach(el => {
                const del = document.createElement('del');
                del.innerHTML = el.innerHTML;
                el.replaceWith(del);
            });
            noteContent.querySelectorAll('span[style*="background"]').forEach(el => {
                const bg = el.style.backgroundColor;
                if (bg === 'yellow' || bg === 'rgb(255, 255, 0)') {
                    const mark = document.createElement('mark');
                    mark.innerHTML = el.innerHTML;
                    el.replaceWith(mark);
                } else if (bg === 'transparent' || bg === '') {
                    while (el.firstChild) {
                        el.parentNode.insertBefore(el.firstChild, el);
                    }
                    el.remove();
                }
            });
        }

        function isSelectionFullyWrapped(range, tag) {
            const frag = range.cloneContents();
            const walker = document.createTreeWalker(frag, NodeFilter.SHOW_TEXT, null);
            while (walker.nextNode()) {
                const node = walker.currentNode;
                if (node.nodeValue.trim() === '') continue;
                let parent = node.parentNode;
                let inside = false;
                while (parent) {
                    if (parent.nodeType === 1 && parent.tagName.toLowerCase() === tag) {
                        inside = true;
                        break;
                    }
                    parent = parent.parentNode;
                }
                if (!inside) return false;
            }
            return true;
        }




        function positionToolbar() {
            const sel = window.getSelection();
            if (!sel.rangeCount || sel.isCollapsed || !noteContent.contains(sel.anchorNode)) {
                hideFormatToolbar();
                return;
            }
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            formatToolbar.style.display = 'flex';
            const toolbarRect = formatToolbar.getBoundingClientRect();
            const top = rect.top + window.scrollY - toolbarRect.height - 6;
            const left = rect.left + window.scrollX + (rect.width - toolbarRect.width) / 2;
            formatToolbar.style.top = `${top}px`;
            formatToolbar.style.left = `${left}px`;
            requestAnimationFrame(() => formatToolbar.classList.add('show'));
        }

        function hideFormatToolbar() {
            formatToolbar.classList.remove('show');
            formatToolbar.style.display = 'none';
        }

        formatToolbar.addEventListener('mousedown', e => {
            e.preventDefault();
        });

        formatToolbar.addEventListener('click', e => {
            const tag = e.target.getAttribute('data-tag');
            if (tag) {
                applyFormat(tag);
            }
        });

        noteContent.addEventListener('mouseup', positionToolbar);
        noteContent.addEventListener('keyup', positionToolbar);
        noteContent.addEventListener('blur', () => setTimeout(hideFormatToolbar, 100));
        document.addEventListener('scroll', hideFormatToolbar);

        noteContent.addEventListener('keydown', function(e) {
            if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
                const key = e.key.toLowerCase();
                if (['b','i','s','u','h'].includes(key)) {
                    e.preventDefault();
                    const map = { b:'strong', i:'em', s:'del', u:'u', h:'mark' };
                    applyFormat(map[key]);
                }
            }
        });

        // Allow renaming by clicking on title
        noteTitleInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                noteContent.focus();
            }
        });

        // Template Management
        let templates = JSON.parse(localStorage.getItem('taskTemplates')) || [];
        let editingTemplateId = null;

        const templateList = document.getElementById('templateList');
        const templateFilter = document.getElementById('templateFilter');
        const addTemplateBtn = document.getElementById('addTemplateBtn');
        const addToTodayBtn = document.getElementById('addToTodayBtn');
        const templateToast = document.getElementById('templateToast');
        const templateNameInput = document.getElementById('templateNameInput');
        const templateSubtasks = document.getElementById('templateSubtasks');
        const addSubtaskBtn = document.getElementById('addSubtaskBtn');

        function generateTemplateId() {
            return Date.now().toString();
        }

        function saveTemplates() {
            localStorage.setItem('taskTemplates', JSON.stringify(templates));
        }

        function addSubtaskInput(val = '') {
            const row = document.createElement('div');
            row.className = 'subtask-row';
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'subtask-input template-subtask-input';
            input.placeholder = 'Subtask';
            input.value = val;
            const delBtn = document.createElement('button');
            delBtn.textContent = '×';
            delBtn.className = 'delete-subtask';
            delBtn.addEventListener('click', () => row.remove());
            row.appendChild(input);
            row.appendChild(delBtn);
            templateSubtasks.appendChild(row);
        }

        function openTemplateModal(id = null) {
            editingTemplateId = id;
            templateNameInput.value = '';
            templateSubtasks.innerHTML = '';
            if (id) {
                const t = templates.find(t => t.id === id);
                if (t) {
                    templateNameInput.value = t.name;
                    (t.subtasks || []).forEach(st => addSubtaskInput(st));
                }
                document.getElementById('templateModalTitle').textContent = 'Edit Template';
            } else {
                document.getElementById('templateModalTitle').textContent = 'New Template';
            }
            document.getElementById('templateModal').classList.add('active');
        }

        function closeTemplateModal() {
            document.getElementById('templateModal').classList.remove('active');
            editingTemplateId = null;
        }

        function saveTemplate() {
            const name = templateNameInput.value.trim();
            if (!name) return;
            const subs = Array.from(templateSubtasks.querySelectorAll('.subtask-input')).map(i => i.value.trim()).filter(v => v);
            if (editingTemplateId) {
                const t = templates.find(t => t.id === editingTemplateId);
                if (t) { t.name = name; t.subtasks = subs; }
            } else {
                templates.push({ id: generateTemplateId(), name, subtasks: subs });
            }
            saveTemplates();
            closeTemplateModal();
            loadTemplates();
        }

        function renderTemplateItem(t) {
            const li = document.createElement('li');
            li.className = 'template-item';
            li.dataset.id = t.id;
            li.draggable = true;

            li.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', t.id);
            });
            li.addEventListener('dragover', e => e.preventDefault());
            li.addEventListener('drop', e => {
                e.preventDefault();
                const srcId = e.dataTransfer.getData('text/plain');
                reorderTemplates(srcId, t.id);
            });

            const header = document.createElement('div');
            header.className = 'template-header';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'select-template';
            checkbox.addEventListener('change', updateAddButton);
            header.appendChild(checkbox);

            if (t.subtasks && t.subtasks.length) {
                const dropBtn = document.createElement('button');
                dropBtn.textContent = '▸';
                dropBtn.className = 'dropdown template-expand-icon';
                dropBtn.addEventListener('click', () => {
                    const list = li.querySelector('.subtask-list');
                    const hidden = list.style.display === 'none';
                    list.style.display = hidden ? 'block' : 'none';
                    dropBtn.textContent = hidden ? '▾' : '▸';
                });
                header.appendChild(dropBtn);
            }

            const nameSpan = document.createElement('span');
            nameSpan.textContent = t.name;
            header.appendChild(nameSpan);

            const controls = document.createElement('div');
            controls.className = 'template-controls';

            const editBtn = document.createElement('button');
            editBtn.textContent = 'edit';
            editBtn.addEventListener('click', e => { e.stopPropagation(); openTemplateModal(t.id); });
            controls.appendChild(editBtn);

            const delBtn = document.createElement('button');
            delBtn.textContent = '×';
            delBtn.className = 'delete-template';
            delBtn.addEventListener('click', e => { e.stopPropagation(); openDeleteTemplateModal(t.id); });
            controls.appendChild(delBtn);

            header.appendChild(controls);

            li.appendChild(header);

            if (t.subtasks && t.subtasks.length) {
                const ul = document.createElement('ul');
                ul.className = 'subtask-list';
                ul.style.display = 'none';
                t.subtasks.forEach(s => {
                    const it = document.createElement('li');
                    it.textContent = s;
                    ul.appendChild(it);
                });
                li.appendChild(ul);
            }

            return li;
        }

        function loadTemplates() {
            templateList.innerHTML = '';
            const filter = templateFilter.value.trim().toLowerCase();
            templates.forEach(t => {
                if (filter && !t.name.toLowerCase().includes(filter)) return;
                const li = renderTemplateItem(t);
                templateList.appendChild(li);
            });
            updateAddButton();
        }

        function reorderTemplates(srcId, targetId) {
            if (srcId === targetId) return;
            const srcIndex = templates.findIndex(t => t.id === srcId);
            const targetIndex = templates.findIndex(t => t.id === targetId);
            if (srcIndex < 0 || targetIndex < 0) return;
            const [moved] = templates.splice(srcIndex, 1);
            templates.splice(targetIndex, 0, moved);
            saveTemplates();
            loadTemplates();
        }

        function updateAddButton() {
            const any = templateList.querySelectorAll('.select-template:checked').length > 0;
            addToTodayBtn.style.display = any ? 'block' : 'none';
        }

        function addTemplatesToToday() {
            const selected = Array.from(templateList.querySelectorAll('.select-template:checked'));
            if (!selected.length) return;
            const names = [];
            selected.forEach(cb => {
                const id = cb.closest('.template-item').dataset.id;
                const t = templates.find(tmp => tmp.id === id);
                if (!t) return;
                const newTask = { task: t.name, completed: false, totalTime: 0, sessions: [] };
                if (t.subtasks && t.subtasks.length) {
                    newTask.subtasks = t.subtasks.map(s => ({ text: s, done: false }));
                }
                tasks.push(newTask);
                names.push(t.name);
                cb.checked = false;
            });
            localStorage.setItem('tasks', JSON.stringify(tasks));
            loadTasks();
            updateAddButton();
            let msg;
            if (names.length === 1) {
                msg = `"${names[0]}" added to today's tasks`;
            } else {
                msg = `${names.length} templates added to Today's Tasks`;
            }
            showTemplateToast(msg);
        }

        function showTemplateToast(msg) {
            templateToast.textContent = msg;
            templateToast.classList.remove('fade-out');
            templateToast.style.display = 'block';
            setTimeout(() => {
                templateToast.classList.add('fade-out');
                setTimeout(() => templateToast.style.display = 'none', 400);
            }, 1500);
        }

        let deletingTemplateId = null;

        function openDeleteTemplateModal(id) {
            deletingTemplateId = id;
            document.getElementById('deleteTemplateModal').classList.add('active');
        }

        function closeDeleteTemplateModal() {
            document.getElementById('deleteTemplateModal').classList.remove('active');
            deletingTemplateId = null;
        }

        function confirmDeleteTemplate() {
            if (!deletingTemplateId) return;
            templates = templates.filter(t => t.id !== deletingTemplateId);
            saveTemplates();
            loadTemplates();
            closeDeleteTemplateModal();
        }

        addSubtaskBtn.addEventListener('click', () => addSubtaskInput());
        addTemplateBtn.addEventListener('click', () => openTemplateModal());
        templateFilter.addEventListener('input', loadTemplates);
        addToTodayBtn.addEventListener('click', addTemplatesToToday);

        let currentTab = 'tasksTab';

        function animateTabSwitch(fromId, toId) {
            const from = document.getElementById(fromId);
            const to = document.getElementById(toId);
            if (from === to) return;
            from.classList.remove('active');
            setTimeout(() => {
                from.style.display = 'none';
                to.style.display = 'block';
                requestAnimationFrame(() => to.classList.add('active'));
            }, 300);
        }

        function switchTab(tabId) {
            if (currentTab === tabId) return;
            animateTabSwitch(currentTab, tabId);
            currentTab = tabId;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.getElementById(tabId + 'Btn').classList.add('active');
            if (tabId === 'templateTab') loadTemplates();
            if (tabId === 'doneTab') loadDoneTasks();
        }

        document.getElementById('tasksTabBtn').addEventListener('click', () => switchTab('tasksTab'));
        document.getElementById('templateTabBtn').addEventListener('click', () => switchTab('templateTab'));
        document.getElementById('doneTabBtn').addEventListener('click', () => switchTab('doneTab'));

        // Task Timer Functions
       function startTaskTimer(index) {
            TimerState.stop();
            if (autoCompleteTimeout) {
                clearTimeout(autoCompleteTimeout);
                autoCompleteTimeout = null;
            }
            currentTaskIndex = index;
            document.getElementById('durationModal').classList.add('active');
        }

        function selectDuration(minutes) {
            selectedDuration = minutes;
            closeDurationModal();
            openMoodPromptModal('before', startTaskCountdown);
        }

        function selectCustomDuration() {
            const customInput = document.getElementById('customDuration');
            const minutes = parseInt(customInput.value);
            if (minutes && minutes > 0 && minutes <= 60) {
                selectedDuration = minutes;
                closeDurationModal();
                openMoodPromptModal('before', startTaskCountdown);
            }
        }

        function closeDurationModal() {
            document.getElementById('durationModal').classList.remove('active');
            document.getElementById('customDuration').value = '';
        }

       function startTaskCountdown() {
           if (currentTaskIndex === null) return;

            if (autoCompleteTimeout) {
                clearTimeout(autoCompleteTimeout);
                autoCompleteTimeout = null;
            }

           // Clear the main focus timer since we're using task timer
           clearInterval(timerInterval);
           isRunning = false;
           
           updateTimerDisplay();
           updateFocusTimerVisibility(); // Hide focus timer, show task timer
           
           updateCommunityButtons(); // Update context-aware buttons
           updateStatusFromActiveTask(); // Update focus room status if joined

            pendingMoodType = null;
            halfwayPrompted = false;

            const task = tasks[currentTaskIndex];
            taskOriginalDuration = selectedDuration * 60;
            taskTimeRemaining = taskOriginalDuration;
            TimerState.start(task.task, taskOriginalDuration);
            isTaskPaused = false;
            isTimerMinimized = false;
            pinnedTaskIndex = currentTaskIndex;

            // Add user to community activity feed
            addUserToActivityFeed();

            const display = document.getElementById('taskTimerDisplay');
            const titleEl = document.getElementById('taskTimerTitle');
            const timeEl = document.getElementById('taskTimerTime');

            display.classList.remove('task-timer-display-hidden');
            display.style.display = 'block';
            document.getElementById('minimizedTaskTimer').style.display = 'none';
            document.getElementById('pauseTaskBtn').style.display = 'inline';
            document.getElementById('resumeTaskBtn').style.display = 'none';
            document.getElementById('minPauseBtn').style.display = 'inline';
            document.getElementById('minResumeBtn').style.display = 'none';
            titleEl.textContent = task.task;
            document.getElementById('minTaskTitle').textContent = task.task;

            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }

            startTaskInterval();
            updateTaskTimerDisplay();
            updateFloatingMsg();
            loadTasks();
        }

        function startTaskInterval() {
            clearInterval(taskTimerInterval);
            taskTimerInterval = setInterval(() => {
                if (taskTimeRemaining > 0) {
                    taskTimeRemaining--;
                    TimerState.timeRemaining--;
                    if (taskTimeRemaining % 30 === 0) {
                        console.log('Timer check:', taskTimeRemaining, 'of', taskOriginalDuration, 'halfway at:', taskOriginalDuration/2);
                    }
                    if (!halfwayPrompted && taskOriginalDuration >= 10 * 60 && taskTimeRemaining <= taskOriginalDuration / 2) {
                        halfwayPrompted = true;
                        TimerState.halfwayPrompted = true;
                        openMoodPromptModal('midway');
                    }
                    updateTaskTimerDisplay();
                } else {
                    clearInterval(taskTimerInterval);
                    taskTimerInterval = null;
                    taskTimerComplete();
                }
            }, 1000);
            TimerState.interval = taskTimerInterval;
        }

        function updateTaskTimerDisplay() {
            const minutes = Math.floor(taskTimeRemaining / 60);
            const seconds = taskTimeRemaining % 60;
            document.getElementById('taskTimerTime').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            document.getElementById('minTaskTime').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            const progress = ((taskOriginalDuration - taskTimeRemaining) / taskOriginalDuration) * 100;
            document.getElementById('taskProgressBar').style.width = `${progress}%`;
            document.getElementById('minTaskProgressBar').style.width = `${progress}%`;
        }

        function taskTimerComplete() {
            TimerState.complete();
            // Show notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Timer Complete!', {
                    body: `Time's up for: ${tasks[currentTaskIndex].task}`,
                    icon: '⏱️'
                });
            }
            
            // Play a gentle sound (optional)
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGG2S48+OZURE');
            audio.volume = 0.3;
            audio.play().catch(() => {});

            // Don't show mood prompt immediately - wait for completion modal response
            pinnedTaskIndex = null;
            
            // Remove user from community activity feed
            removeUserFromActivityFeed();
            
            document.getElementById('completionModal').classList.add('active');
            loadTasks();
        }

        function logCurrentSession() {
            if (currentTaskIndex === null) return;
            const elapsed = taskOriginalDuration - taskTimeRemaining;
            if (elapsed <= 0) return;
            tasks[currentTaskIndex].totalTime = (tasks[currentTaskIndex].totalTime || 0) + elapsed;
            tasks[currentTaskIndex].sessions = tasks[currentTaskIndex].sessions || [];
            tasks[currentTaskIndex].sessions.push({
                duration: elapsed / 60,
                completedAt: new Date().toISOString()
            });
            localStorage.setItem('tasks', JSON.stringify(tasks));
            updateDailyReportData();

            const card = document.getElementById('taskInfoCard');
            if (card.style.display === 'block' && parseInt(card.dataset.index) === currentTaskIndex) {
                renderTaskInfoCard(currentTaskIndex);
            }
        }

        function completeTask() {
            if (currentTaskIndex === null) return;
            logCurrentSession();
            tasks[currentTaskIndex].completed = true;
            tasks[currentTaskIndex].completedAt = new Date().toISOString();
            localStorage.setItem('tasks', JSON.stringify(tasks));
            TimerState.complete();
            closeCompletionModal();
            // Show mood prompt after user confirms task completion
            openMoodPromptModal('after');
        }

        function addMoreTime() {
            logCurrentSession();
            document.getElementById('completionModal').classList.remove('active');
            document.getElementById('durationModal').classList.add('active');
        }

        function keepTaskActive() {
            if (currentTaskIndex === null) return;
            logCurrentSession();
            closeCompletionModal();
        }

       function closeCompletionModal() {
            TimerState.stop();
            document.getElementById('completionModal').classList.remove('active');
            const taskDisplay = document.getElementById('taskTimerDisplay');
            taskDisplay.style.display = 'none';
            taskDisplay.classList.add('task-timer-display-hidden');
            document.getElementById('minimizedTaskTimer').style.display = 'none';
            document.getElementById('floatingMsg').style.display = 'none';
            clearInterval(taskTimerInterval);
            taskTimerInterval = null;
            currentTaskIndex = null;
            pinnedTaskIndex = null;
            isTimerMinimized = false;
            isRunning = false;
            updateTimerDisplay();
            loadTasks();
            updateFocusTimerVisibility();
        }

        function minimizeTaskTimer() {
            isTimerMinimized = true;
            document.getElementById('taskTimerDisplay').style.display = 'none';
            document.getElementById('minimizedTaskTimer').style.display = 'flex';
            updateFloatingMsg();
        }

        function maximizeTaskTimer() {
            isTimerMinimized = false;
            document.getElementById('taskTimerDisplay').style.display = 'block';
            document.getElementById('minimizedTaskTimer').style.display = 'none';
            updateFloatingMsg();
        }

       function updateFloatingMsg() {
           const msg = document.getElementById('floatingMsg');
           if ((taskTimerInterval || isTaskPaused) && !isTimerMinimized) {
               msg.style.display = 'block';
           } else {
               msg.style.display = 'none';
           }
            updateFocusTimerVisibility();
       }

        function updateFocusTimerVisibility() {
            const focusDisplay = document.getElementById('timerDisplay');
            const focusControls = document.getElementById('focusTimerControls');
            const focusProgress = document.querySelector('.timer-progress');
            
            // Hide focus timer display and controls whenever task timer is active (running or paused)
            if (taskTimerInterval || isTaskPaused) {
                focusDisplay.style.display = 'none';
                focusControls.style.display = 'none';
                focusProgress.style.display = 'none';
            } else {
                focusDisplay.style.display = 'block';
                focusControls.style.display = 'flex';
                focusProgress.style.display = 'block';
            }
        }

       function pauseTaskTimer() {
           if (taskTimerInterval) {
               clearInterval(taskTimerInterval);
               taskTimerInterval = null;
               isTaskPaused = true;
               document.getElementById('minPauseBtn').style.display = 'none';
               document.getElementById('minResumeBtn').style.display = 'inline';
               document.getElementById('pauseTaskBtn').style.display = 'none';
               document.getElementById('resumeTaskBtn').style.display = 'inline';
               updateFloatingMsg();
               updateCommunityButtons(); // Update context-aware buttons
           }
       }

       function resumeTaskTimer() {
           if (isTaskPaused) {
               startTaskInterval();
               isTaskPaused = false;
               document.getElementById('minPauseBtn').style.display = 'inline';
               document.getElementById('minResumeBtn').style.display = 'none';
               document.getElementById('pauseTaskBtn').style.display = 'inline';
               document.getElementById('resumeTaskBtn').style.display = 'none';
               updateFloatingMsg();
               updateCommunityButtons(); // Update context-aware buttons
           }
       }

       function cancelTaskTimer() {
           if (currentTaskIndex === null) return;
            TimerState.stop();
            logCurrentSession();
            closeCompletionModal();
            hideFloatingTimer();
            loadTasks(); // Reload to show timer buttons again
            updateCommunityButtons(); // Update context-aware buttons
       }

        function addMoreTimeDuringRun() {
            openAddTimeModal();
        }

        function openAddTimeModal() {
            const input = document.getElementById('addTimeInput');
            input.value = '5';
            document.getElementById('addTimeModal').classList.add('active');
            input.focus();
        }

        function closeAddTimeModal() {
            document.getElementById('addTimeModal').classList.remove('active');
            document.getElementById('addTimeInput').value = '';
        }

       function confirmAddTime() {
           const extra = parseInt(document.getElementById('addTimeInput').value);
           if (extra && extra > 0) {
               taskTimeRemaining += extra * 60;
               taskOriginalDuration += extra * 60;
               updateTaskTimerDisplay();
           }
           closeAddTimeModal();
       }

        document.getElementById('confirmAddTime').addEventListener('click', confirmAddTime);
        document.getElementById('addTimeInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') confirmAddTime();
        });

        let breakTimerInterval = null;
        let breakOriginalDuration = 0;
        let breakTimeRemaining = 0;

        function startBreakTimer(mins) {
            breakOriginalDuration = (mins + 1) * 60;
            breakTimeRemaining = breakOriginalDuration;
            updateBreakTimerDisplay();
            document.getElementById('breakTimerDisplay').style.display = 'block';
            showBreakAssistantModal('Hope you don\'t mind, I added 1 extra minute to your break… just \'cause you deserve it.', true);
            updateCommunityButtons(); // Update context-aware buttons
            breakTimerInterval = setInterval(() => {
                if (breakTimeRemaining > 0) {
                    breakTimeRemaining--;
                    updateBreakTimerDisplay();
                } else {
                    clearInterval(breakTimerInterval);
                    breakTimerInterval = null;
                    completeBreak();
                }
            }, 1000);
        }

        function updateBreakTimerDisplay() {
            const minutes = Math.floor(breakTimeRemaining / 60);
            const seconds = breakTimeRemaining % 60;
            document.getElementById('breakTimerTime').textContent = `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
            const progress = ((breakOriginalDuration - breakTimeRemaining) / breakOriginalDuration) * 100;
            document.getElementById('breakProgressBar').style.width = `${progress}%`;
        }

        function cancelBreakTimer() {
            if (breakTimerInterval) clearInterval(breakTimerInterval);
            breakTimerInterval = null;
            document.getElementById('breakTimerDisplay').style.display = 'none';
            updateCommunityButtons(); // Update context-aware buttons
        }

        function completeBreak() {
            document.getElementById('breakTimerDisplay').style.display = 'none';
            updateCommunityButtons(); // Update context-aware buttons
            const breakLog = JSON.parse(localStorage.getItem('breakLog')) || [];
            const entry = { date: new Date().toISOString(), duration: breakOriginalDuration / 60 };
            if (currentTaskIndex !== null && tasks[currentTaskIndex].activeBreak) {
                entry.taskId = currentTaskIndex;
                entry.checklist = tasks[currentTaskIndex].activeBreak.items;
                tasks[currentTaskIndex].breakActive = false;
                localStorage.setItem('tasks', JSON.stringify(tasks));
                loadTasks();
            }
            breakLog.push(entry);
            localStorage.setItem('breakLog', JSON.stringify(breakLog));
        }

        let moodPromptType = null;
        let moodPromptSelected = null;
        let moodPromptCallback = null;

        function openMoodPromptModal(type, cb) {
            moodPromptType = type;
            moodPromptCallback = cb || null;
            moodPromptSelected = null;
            const titleEl = document.getElementById('moodPromptTitle');
            const reasonInput = document.getElementById('moodPromptReason');
            const submitBtn = document.getElementById('submitMoodPrompt');
            if (type === 'midway') {
                titleEl.textContent = "How's it going so far?";
                reasonInput.placeholder = 'What made it difficult?';
                reasonInput.style.display = 'none';
                submitBtn.style.display = 'none';
            } else if (type === 'after') {
                titleEl.textContent = 'Session complete. How did that feel?';
                reasonInput.placeholder = 'What made it difficult?';
                reasonInput.style.display = 'none';
                submitBtn.style.display = 'none';
            } else {
                titleEl.textContent = 'How are you feeling as you begin this task?';
                reasonInput.placeholder = 'Anything on your mind?';
                reasonInput.value = '';
                reasonInput.style.display = 'block';
                submitBtn.style.display = 'inline-block';
            }
            reasonInput.value = '';
            document.querySelectorAll('#moodPromptModal .emoji').forEach(e => e.classList.remove('selected'));
            document.getElementById('moodPromptModal').classList.add('active');
        }

        function closeMoodPromptModal() {
            document.getElementById('moodPromptModal').classList.remove('active');
            if (moodPromptType === 'before' && moodPromptCallback) {
                const cb = moodPromptCallback;
                moodPromptCallback = null;
                cb();
            }
            moodPromptType = null;
            moodPromptSelected = null;
            moodPromptCallback = null;
        }

        function selectPromptMood(el) {
            document.querySelectorAll('#moodPromptModal .emoji').forEach(e => e.classList.remove('selected'));
            el.classList.add('selected');
            moodPromptSelected = el.dataset.mood;
            if (moodPromptType === 'before') {
                document.getElementById('moodPromptReason').focus();
                document.getElementById('submitMoodPrompt').style.display = 'inline-block';
                return;
            }
            if (['😐','😮‍💨','😫'].includes(moodPromptSelected)) {
                document.getElementById('moodPromptReason').style.display = 'block';
                document.getElementById('submitMoodPrompt').style.display = 'inline-block';
                document.getElementById('moodPromptReason').focus();
            } else {
                finalizeMoodPrompt(null);
            }
        }

        function finalizeMoodPrompt(reason) {
            if (!moodPromptSelected) { closeMoodPromptModal(); return; }
            const now = new Date();
            const moodLog = JSON.parse(localStorage.getItem('moodLog')) || [];

            let taskName = null;
            let minutesIntoTask = null;
            if (currentTaskIndex !== null) {
                const task = tasks[currentTaskIndex];
                if (task) {
                    taskName = task.task;
                    if (moodPromptType === 'after') {
                        minutesIntoTask = Math.floor(taskOriginalDuration / 60);
                    } else if (moodPromptType === 'before') {
                        minutesIntoTask = 0;
                    } else {
                        minutesIntoTask = Math.floor((selectedDuration * 60 - taskTimeRemaining) / 60);
                    }
                }
            }

            moodLog.push({
                date: now.toISOString(),
                mood: moodPromptSelected,
                task: taskName,
                minutesIntoTask: minutesIntoTask,
                type: moodPromptType,
                reason: reason
            });
            localStorage.setItem('moodLog', JSON.stringify(moodLog));
            updateCharts();
            updateMoodHistory();
            closeMoodPromptModal();
            
            // Execute callback if provided (e.g., start timer)
            if (moodPromptCallback) {
                moodPromptCallback();
            }
        }

        function initMoodPromptModal() {
            document.querySelectorAll('#moodPromptModal .emoji').forEach(el => {
                el.addEventListener('click', () => selectPromptMood(el));
            });
            document.getElementById('submitMoodPrompt').addEventListener('click', () => {
                const val = document.getElementById('moodPromptReason').value.trim();
                finalizeMoodPrompt(val || null);
            });
            document.getElementById('moodPromptReason').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('submitMoodPrompt').click();
                }
            });
        }

        function openPastMoodsModal() {
            const moodLog = JSON.parse(localStorage.getItem('moodLog')) || [];
            pastMoodsContent.innerHTML = '';
            if (moodLog.length === 0) {
                pastMoodsContent.textContent = 'No moods logged yet';
            } else {
                moodLog.slice().reverse().forEach(m => {
                    const div = document.createElement('div');
                    div.className = 'mood-timeline-entry';
                    div.textContent = `${m.mood} – ${formatTime(m.date)}`;
                    pastMoodsContent.appendChild(div);
                });
            }
            document.getElementById('pastMoodsModal').classList.add('active');
        }

        function closePastMoodsModal() {
            document.getElementById('pastMoodsModal').classList.remove('active');
        }

        function openMoodHelpModal() {
            document.getElementById('moodHelpModal').classList.add('active');
        }

        function closeMoodHelpModal() {
            document.getElementById('moodHelpModal').classList.remove('active');
        }

        function openTrendsModal() {
            populateTrendsModal();
            document.getElementById('trendsModal').classList.add('active');
        }

        function closeTrendsModal() {
            document.getElementById('trendsModal').classList.remove('active');
        }

        function openEnergyModal() {
            populateEnergyModal();
            document.getElementById('energyModal').classList.add('active');
        }

        function closeEnergyModal() {
            document.getElementById('energyModal').classList.remove('active');
        }

        function showBreakAssistantModal(message, showExtraTime) {
            const modal = document.getElementById('breakAssistantModal');
            const messageElement = document.getElementById('breakAssistantMessage');
            const statusElement = document.getElementById('breakTaskStatus');
            
            messageElement.textContent = message;
            
            if (showExtraTime) {
                statusElement.textContent = '✨ Added 1 extra minute because you deserve it';
            } else {
                statusElement.textContent = '⏸️ Your task has been paused while you take this break';
            }
            
            modal.classList.add('active');
        }

        function closeBreakAssistantModal() {
            document.getElementById('breakAssistantModal').classList.remove('active');
        }

        // Make closeBreakAssistantModal global for HTML onclick
        window.closeBreakAssistantModal = closeBreakAssistantModal;

        function populateTrendsModal() {
            const moodLog = JSON.parse(localStorage.getItem('moodLog')) || [];
            const mapping = { '😫':-5, '😮‍💨':-4, '😐':0, '🙂':4, '😄':5 };
            const moodClasses = { 1:'mood-stressed', 2:'mood-tired', 3:'mood-meh', 4:'mood-okay', 5:'mood-good' };
            const moodLabels = { 1:'Stressed', 2:'Tired', 3:'Neutral', 4:'Good', 5:'Great' };
            
            const weeklyTrends = document.getElementById('weeklyTrends');
            const trendsInsight = document.getElementById('trendsInsight');
            
            // Get last 7 days
            const days = [];
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                days.push(date);
            }
            
            weeklyTrends.innerHTML = '';
            let weekData = [];
            
            days.forEach(date => {
                const dateStr = date.toISOString().split('T')[0];
                const dayMoods = moodLog.filter(m => m.date.startsWith(dateStr));
                
                let level = 0;
                let levelLabel = 'No data';
                let percentage = 0;
                let moodClass = 'mood-meh';
                
                if (dayMoods.length > 0) {
                    const avg = dayMoods.reduce((s,m) => s + (mapping[m.mood] || 0), 0) / dayMoods.length;
                    
                    if (avg < 0) level = 1;
                    else if (avg <= 1.5) level = 2;
                    else if (avg <= 3) level = 3;
                    else if (avg <= 4.5) level = 4;
                    else level = 5;
                    
                    levelLabel = moodLabels[level];
                    percentage = (level / 5) * 100;
                    moodClass = moodClasses[level];
                }
                
                weekData.push({ date, level, levelLabel, dayMoods: dayMoods.length });
                
                const dayDiv = document.createElement('div');
                dayDiv.className = 'trend-day';
                
                const dayName = date.toLocaleDateString(undefined, { weekday: 'short' });
                dayDiv.innerHTML = `
                    <div class="trend-day-name">${dayName}</div>
                    <div class="trend-battery">
                        <div class="trend-battery-fill ${moodClass}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="trend-day-label">${levelLabel}</div>
                `;
                
                weeklyTrends.appendChild(dayDiv);
            });
            
            // Generate insight
            const insightText = generateTrendInsight(weekData);
            const insightTextElement = trendsInsight.querySelector('.insight-text');
            if (insightTextElement) {
                insightTextElement.textContent = insightText;
            }
        }
        
        function generateTrendInsight(weekData) {
            const validDays = weekData.filter(d => d.dayMoods > 0);
            if (validDays.length === 0) return "Start logging your moods to see patterns emerge!";
            
            const avgLevel = validDays.reduce((s, d) => s + d.level, 0) / validDays.length;
            const trend = validDays.length >= 3 ? getTrend(validDays) : null;
            
            if (trend === 'improving') {
                return "Your energy has been trending upward this week. Keep nurturing what's working!";
            } else if (trend === 'declining') {
                return "This week has been challenging. Remember that tough periods are temporary - be gentle with yourself.";
            } else if (avgLevel >= 4) {
                return "You've had great energy this week! Your positive moments are shining through.";
            } else if (avgLevel <= 2) {
                return "This week has required extra resilience from you. Small steps and self-compassion count.";
            } else {
                return "Your energy levels show the natural ups and downs of being human. You're managing well.";
            }
        }
        
        function getTrend(days) {
            if (days.length < 3) return null;
            const firstHalf = days.slice(0, Math.floor(days.length / 2));
            const secondHalf = days.slice(Math.ceil(days.length / 2));
            const firstAvg = firstHalf.reduce((s, d) => s + d.level, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((s, d) => s + d.level, 0) / secondHalf.length;
            const diff = secondAvg - firstAvg;
            if (diff > 0.5) return 'improving';
            if (diff < -0.5) return 'declining';
            return 'stable';
        }

        function populateEnergyModal() {
            const moodLog = JSON.parse(localStorage.getItem('moodLog')) || [];
            const mapping = { '😫':-5, '😮‍💨':-4, '😐':0, '🙂':4, '😄':5 };
            
            const energyChart = document.getElementById('energyChart');
            const patternInsights = {
                peakFocusTime: document.getElementById('peakFocusTime'),
                productiveDays: document.getElementById('productiveDays'),
                moodCorrelation: document.getElementById('moodCorrelation')
            };
            const energyInsightText = document.getElementById('energyInsightText');
            
            // Get last 30 days of data
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentMoods = moodLog.filter(m => new Date(m.date) >= thirtyDaysAgo);
            
            if (recentMoods.length === 0) {
                energyChart.innerHTML = '<p style="text-align: center; color: #718096;">Start logging moods to see your energy insights!</p>';
                patternInsights.peakFocusTime.textContent = 'Analyzing...';
                patternInsights.productiveDays.textContent = 'Discovering...';
                patternInsights.moodCorrelation.textContent = 'Learning...';
                const insightTextElement = energyInsightText.querySelector('.insight-text');
                if (insightTextElement) {
                    insightTextElement.textContent = 'Begin your mood tracking journey to discover your unique energy patterns.';
                }
                return;
            }
            
            // Energy Distribution
            const levels = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            recentMoods.forEach(m => {
                const val = mapping[m.mood] || 0;
                let level;
                if (val < 0) level = 1;
                else if (val <= 1.5) level = 2;
                else if (val <= 3) level = 3;
                else if (val <= 4.5) level = 4;
                else level = 5;
                levels[level]++;
            });
            
            const total = recentMoods.length;
            const energyData = [
                { label: 'Great days', level: 5, count: levels[5], class: 'mood-good' },
                { label: 'Good days', level: 4, count: levels[4], class: 'mood-okay' },
                { label: 'Neutral days', level: 3, count: levels[3], class: 'mood-meh' },
                { label: 'Tired days', level: 2, count: levels[2], class: 'mood-tired' },
                { label: 'Stressed days', level: 1, count: levels[1], class: 'mood-stressed' }
            ];
            
            energyChart.innerHTML = '';
            energyData.forEach(item => {
                const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
                const barDiv = document.createElement('div');
                barDiv.className = 'energy-bar';
                barDiv.innerHTML = `
                    <div class="energy-bar-label">${item.label}</div>
                    <div class="energy-bar-visual">
                        <div class="energy-bar-fill ${item.class}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="energy-bar-percentage">${percentage}%</div>
                `;
                energyChart.appendChild(barDiv);
            });
            
            // Generate pattern insights
            generatePatternInsights(recentMoods, patternInsights);
            
            // Generate insight
            const insight = generateEnergyInsight(energyData, recentMoods);
            const insightTextElement = energyInsightText.querySelector('.insight-text');
            if (insightTextElement) {
                insightTextElement.textContent = insight;
            }
        }
        
        function generatePatternInsights(moods, insights) {
            const mapping = { '😫':-5, '😮‍💨':-4, '😐':0, '🙂':4, '😄':5 };
            
            // Analyze peak focus time
            const timeRanges = {
                'Morning (6AM-12PM)': { start: 6, end: 12, moods: [] },
                'Afternoon (12PM-6PM)': { start: 12, end: 18, moods: [] },
                'Evening (6PM-12AM)': { start: 18, end: 24, moods: [] }
            };
            
            moods.forEach(m => {
                const hour = new Date(m.date).getHours();
                if (hour >= 6 && hour < 12) timeRanges['Morning (6AM-12PM)'].moods.push(m);
                else if (hour >= 12 && hour < 18) timeRanges['Afternoon (12PM-6PM)'].moods.push(m);
                else if (hour >= 18 && hour < 24) timeRanges['Evening (6PM-12AM)'].moods.push(m);
            });
            
            let bestTime = 'Morning (6AM-12PM)';
            let bestAvg = -6;
            Object.entries(timeRanges).forEach(([name, range]) => {
                if (range.moods.length > 0) {
                    const avg = range.moods.reduce((s, m) => s + (mapping[m.mood] || 0), 0) / range.moods.length;
                    if (avg > bestAvg) {
                        bestAvg = avg;
                        bestTime = name;
                    }
                }
            });
            insights.peakFocusTime.textContent = bestTime;
            
            // Analyze most productive days
            const dayMoods = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            
            moods.forEach(m => {
                const day = new Date(m.date).getDay();
                dayMoods[day].push(m);
            });
            
            const dayAverages = [];
            Object.entries(dayMoods).forEach(([day, moodList]) => {
                if (moodList.length > 0) {
                    const avg = moodList.reduce((s, m) => s + (mapping[m.mood] || 0), 0) / moodList.length;
                    dayAverages.push({ day: parseInt(day), avg, name: dayNames[day] });
                }
            });
            
            dayAverages.sort((a, b) => b.avg - a.avg);
            const topDays = dayAverages.slice(0, 2).map(d => d.name).join(', ');
            insights.productiveDays.textContent = topDays || 'Discovering...';
            
            // Analyze mood-energy correlation
            const positiveCount = moods.filter(m => mapping[m.mood] > 0).length;
            const totalCount = moods.length;
            const positiveRatio = positiveCount / totalCount;
            
            let correlation;
            if (positiveRatio >= 0.7) correlation = 'High positive';
            else if (positiveRatio >= 0.5) correlation = 'Balanced';
            else if (positiveRatio >= 0.3) correlation = 'Moderate';
            else correlation = 'Needs attention';
            
            insights.moodCorrelation.textContent = correlation;
        }
        
        function getEnergyBarClass(energy) {
            if (energy >= 4.5) return 'mood-good';
            if (energy >= 3.5) return 'mood-okay';
            if (energy >= 2.5) return 'mood-meh';
            if (energy >= 1.5) return 'mood-tired';
            return 'mood-stressed';
        }
        
        function generateEnergyInsight(energyData, moods) {
            const total = moods.length;
            const positiveRatio = (energyData[0].count + energyData[1].count) / total;
            const negativeRatio = (energyData[3].count + energyData[4].count) / total;
            
            if (positiveRatio >= 0.6) {
                return "Your energy patterns show remarkable resilience. You're navigating life with notable strength and finding ways to maintain positive energy even during challenges.";
            } else if (negativeRatio >= 0.6) {
                return "You've been carrying a heavy load lately. Your awareness of these patterns is the first step toward lighter days. Consider what small changes might support your energy.";
            } else {
                return "Your energy shows the natural rhythm of human experience - a mix of high and low moments. You're doing well managing life's ups and downs.";
            }
        }

        function initUnifiedModals() {
            document.querySelectorAll('.unified-modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target.classList.contains('unified-modal')) {
                        const closeBtn = modal.querySelector('.modal-close');
                        if (closeBtn) closeBtn.click();
                    }
                });
            });
        }

        // Initialize page
        window.onload = () => {
            DOM.init(); // Initialize cached DOM elements
            checkForNewDay();
            loadQuote();
            loadTasks();
            loadTemplates();
            loadDoneTasks();
            loadTodaysMood();
            updateMoodGauge();
            updateTimerDisplay();
            updateFocusTimerVisibility();
            loadNotes();
            renderDateStrip();
            initUnifiedModals();
            initMoodPromptModal();
            initChatSystem();
        };

        monthLabelEl.addEventListener('click', toggleMonthDropdown);

        // =================================
        // CHAT SYSTEM FUNCTIONALITY
        // =================================

        // Chat state management
        let currentChatRoom = null;
        let chatConnected = false;
        let userFocusStatus = 'Click to update';
        let isAway = false;
        let muteUntil = null;

        // Mock data for demonstration (replace with real backend)
        const mockChatData = {
            focusRoom: {
                participants: [
                    { name: 'Alex', status: 'Writing blog post', time: '12 min' },
                    { name: 'Sam', status: 'Coding feature', time: '5 min' },
                    { name: 'Jordan', status: 'Reading documentation', time: '8 min' }
                ],
                count: 4
            },
            breakRoom: {
                messages: [
                    { user: 'Sam', message: 'Just finished that thing! 🎉', own: false },
                    { user: 'Alex', message: 'Congrats! Taking a quick walk', own: false },
                    { user: 'You', message: 'Anyone else feel scattered today?', own: true },
                    { user: 'Jordan', message: 'YES. Brain fog is real today', own: false }
                ],
                count: 7
            }
        };

        // Initialize chat system
        function initChatSystem() {
            // Event listeners for community buttons
            // Community buttons disabled during development
            document.getElementById('joinCommunityBtn').addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Community features coming soon!');
            });

            // Chat modal event listeners - use event delegation for dynamic elements
            document.addEventListener('click', (e) => {
                console.log('Click detected on:', e.target.id, e.target.className);
                
                if (e.target.id === 'updateFocusStatus') {
                    console.log('Update focus status button clicked');
                    openUpdateStatusModal();
                }
                if (e.target.id === 'switchToFocusFromBreak') {
                    switchToFocusFromBreak();
                }
                if (e.target.id === 'stepAwayFocusBtn') {
                    stepAwayFromChat();
                }
                if (e.target.id === 'muteNotifications') {
                    muteNotifications();
                }
            });

            // Status update modal
            document.getElementById('saveStatus').addEventListener('click', saveUserStatus);
            
            // Use event delegation for dynamically created ownFocusStatus
            document.addEventListener('click', (e) => {
                if (e.target && e.target.id === 'ownFocusStatus') {
                    openUpdateStatusModal();
                }
            });

            // Message sending
            document.getElementById('sendMessage').addEventListener('click', sendChatMessage);
            document.getElementById('chatInput').addEventListener('input', updateCharCount);
            document.getElementById('chatInput').addEventListener('keydown', handleChatKeydown);

            // Quick responses
            document.querySelectorAll('.quick-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const response = e.target.dataset.response;
                    if (response) sendQuickResponse(response);
                });
            });

            // Reactions - use event delegation for dynamically created elements
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('reaction-btn')) {
                    const reaction = e.target.dataset.reaction;
                    if (reaction) {
                        sendReaction(reaction, e.target);
                        console.log('Reaction sent:', reaction);
                    }
                }
            });

            // Quick response buttons - use event delegation
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('quick-btn')) {
                    const response = e.target.dataset.response;
                    if (response) {
                        sendQuickResponse(response);
                        console.log('Quick response sent:', response);
                    }
                }
            });

            // Initialize community features
            initCommunityActivity();
        }

        // Modal management for separate room modals
        function openChatModal() {
            document.getElementById('chatModal').classList.add('active');
            updateRoomCounts();
            updateRoomOptionsVisibility();
        }

        function closeChatModal() {
            document.getElementById('chatModal').classList.remove('active');
            currentChatRoom = null;
            isAway = false;
        }

        function enterFocusRoom() {
            // Close room selection modal
            document.getElementById('chatModal').classList.remove('active');
            
            // Open focus room modal with animation
            setTimeout(() => {
                document.getElementById('focusRoomModal').classList.add('active');
                loadFocusRoom();
                currentChatRoom = 'focus';
                chatConnected = true;
                isAway = false;
                showWelcomeMessage('focus');
            }, 200);
        }

        function enterBreakRoom() {
            // Close room selection modal
            document.getElementById('chatModal').classList.remove('active');
            
            // Open break room modal with animation
            setTimeout(() => {
                document.getElementById('breakRoomModal').classList.add('active');
                loadBreakRoom();
                currentChatRoom = 'break';
                chatConnected = true;
                isAway = false;
                showWelcomeMessage('break');
            }, 200);
        }

        function returnToRoomSelection() {
            console.log('Back button clicked - returning to room selection');
            
            // Close whichever room modal is open
            document.getElementById('focusRoomModal').classList.remove('active');
            document.getElementById('breakRoomModal').classList.remove('active');
            
            // Show room selection again with animation
            setTimeout(() => {
                document.getElementById('chatModal').classList.add('active');
                currentChatRoom = null;
                chatConnected = false;
                isAway = false;
                console.log('Returned to room selection');
            }, 200);
        }
        
        function updateRoomOptionsVisibility() {
            const focusRoomBtn = document.querySelector('.room-btn.focus-room');
            const breakRoomBtn = document.querySelector('.room-btn.break-room');
            
            if (!focusRoomBtn || !breakRoomBtn) return;
            
            // Check if user has active timer
            const isFocusTimerRunning = taskTimerInterval !== null;
            const isMainTimerRunning = document.getElementById('startTimer')?.textContent === 'Pause';
            const hasActiveTimer = isFocusTimerRunning || isMainTimerRunning;
            
            if (hasActiveTimer) {
                // During active work: only show Focus Together room
                focusRoomBtn.style.display = 'block';
                breakRoomBtn.style.display = 'none';
            } else {
                // No active timer: show both room options
                focusRoomBtn.style.display = 'block';
                breakRoomBtn.style.display = 'block';
            }
        }


        function quickJoinBreakRoom() {
            enterBreakRoom();
        }

        function quickJoinFocusRoom() {
            enterFocusRoom();
        }

        // Room selection functions (simplified - no detailed interfaces)

        // Simplified community functions (no complex status management needed)

        // Room loading functions
        function loadFocusRoom() {
            const statusList = document.getElementById('focusStatusList');
            const participants = mockChatData.focusRoom.participants;
            
            // Clear existing content
            statusList.innerHTML = '';
            
            // Add other participants
            participants.forEach(p => {
                const statusDiv = document.createElement('div');
                statusDiv.className = 'status-item';
                statusDiv.innerHTML = `<span>👤 ${p.name} • ${p.status} • ${p.time}</span>`;
                statusList.appendChild(statusDiv);
            });
            
            // Add own status with current task info
            const ownStatusDiv = document.createElement('div');
            ownStatusDiv.className = 'status-item own-status';
            ownStatusDiv.innerHTML = `<span>👤 You • <span id="ownFocusStatus">Click to update</span></span>`;
            statusList.appendChild(ownStatusDiv);
            
            // Click handler is already attached globally
            
            // Update the user's status from active task
            updateStatusFromActiveTask();
            
            // Update count
            document.getElementById('focusParticipantCount').textContent = `${mockChatData.focusRoom.count} people`;
        }

        function loadBreakRoom() {
            const chatMessages = document.getElementById('chatMessages');
            const messages = mockChatData.breakRoom.messages;
            
            chatMessages.innerHTML = '';
            
            messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `chat-message ${msg.own ? 'own-message' : ''}`;
                messageDiv.innerHTML = `<span class="chat-user">${msg.user}:</span> ${msg.message}`;
                chatMessages.appendChild(messageDiv);
            });
            
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // Status update functionality
        function openUpdateStatusModal() {
            console.log('Opening status modal...');
            const modal = document.getElementById('updateStatusModal');
            const input = document.getElementById('statusInput');
            
            if (!modal) {
                console.error('Status modal not found!');
                return;
            }
            
            if (!input) {
                console.error('Status input not found!');
                return;
            }
            
            input.value = userFocusStatus === 'Click to update' ? '' : userFocusStatus;
            modal.classList.add('active');
            input.focus();
            console.log('Status modal opened successfully');
        }

        function closeUpdateStatusModal() {
            document.getElementById('updateStatusModal').classList.remove('active');
        }

        function saveUserStatus() {
            const newStatus = document.getElementById('statusInput').value.trim();
            if (newStatus) {
                userFocusStatus = newStatus;
                document.getElementById('ownFocusStatus').textContent = newStatus;
                
                // Show brief success feedback
                const saveBtn = document.getElementById('saveStatus');
                const originalText = saveBtn.textContent;
                saveBtn.textContent = 'Updated!';
                saveBtn.style.background = '#7c9885';
                
                setTimeout(() => {
                    saveBtn.textContent = originalText;
                    saveBtn.style.background = '';
                    closeUpdateStatusModal();
                }, 1000);
                
                // If currently showing active task, update from that
                updateStatusFromActiveTask();
            }
        }

        // Message functionality
        function sendChatMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            
            if (message && currentChatRoom === 'break') {
                // Add message to chat
                addMessageToChat('You', message, true);
                input.value = '';
                updateCharCount();
                
                // Show brief success feedback
                const sendBtn = document.getElementById('sendMessage');
                const originalText = sendBtn.textContent;
                sendBtn.textContent = 'Sent!';
                sendBtn.style.background = '#7c9885';
                
                setTimeout(() => {
                    sendBtn.textContent = originalText;
                    sendBtn.style.background = '';
                }, 1000);
                
                // Simulate responses occasionally
                if (Math.random() < 0.3) {
                    setTimeout(() => simulateResponse(), 2000 + Math.random() * 3000);
                }
            }
        }

        function sendQuickResponse(response) {
            if (currentChatRoom === 'break') {
                addMessageToChat('You', response, true);
                
                // Brief visual feedback
                event.target.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    event.target.style.transform = '';
                }, 150);
            }
        }

        function sendReaction(reaction, buttonElement) {
            // Always show effects for testing, regardless of room state
            console.log(`Sending reaction: ${reaction}`);
            
            // Show sender feedback first
            showSenderFeedback(buttonElement);
            
            // Create envelope animation
            createEnvelopeAnimation(reaction);
            
            // Create confetti animation
            setTimeout(() => {
                createConfettiAnimation(reaction);
            }, 800); // Start confetti when envelope reaches center
            
            console.log(`✨ Encouragement sent: ${reaction} - Check the screen for animations!`);
        }

        function showSenderFeedback(buttonElement) {
            // Animate the button that was clicked
            buttonElement.style.transform = 'scale(1.3)';
            buttonElement.style.background = 'var(--accent-color)';
            
            // Show "Sent!" text briefly
            const originalText = buttonElement.textContent;
            buttonElement.textContent = '✓';
            
            setTimeout(() => {
                buttonElement.style.transform = '';
                buttonElement.style.background = '';
                buttonElement.textContent = originalText;
            }, 1000);
        }

        function createEnvelopeAnimation(reaction) {
            const envelope = document.createElement('div');
            envelope.innerHTML = '📩';
            envelope.style.cssText = `
                position: fixed;
                left: 20px;
                top: 50%;
                font-size: 1.5rem;
                z-index: 10001;
                pointer-events: none;
                transform: translateY(-50%);
                opacity: 0;
                animation: envelopeFloat 1.5s ease-out forwards;
            `;
            
            document.body.appendChild(envelope);
            
            setTimeout(() => {
                if (envelope.parentNode) {
                    document.body.removeChild(envelope);
                }
            }, 1500);
        }

        function createConfettiAnimation(reaction) {
            // Create multiple confetti pieces
            for (let i = 0; i < 8; i++) {
                setTimeout(() => {
                    createConfettiPiece(reaction);
                }, i * 100); // Stagger the confetti
            }
        }

        function createConfettiPiece(reaction) {
            const confetti = document.createElement('div');
            confetti.textContent = reaction;
            confetti.style.cssText = `
                position: fixed;
                top: -20px;
                left: ${40 + Math.random() * 20}%; /* Center area */
                font-size: 1.2rem;
                z-index: 10000;
                pointer-events: none;
                animation: confettiFall 2s ease-out forwards;
                transform: rotate(${Math.random() * 360}deg);
            `;
            
            document.body.appendChild(confetti);
            
            setTimeout(() => {
                if (confetti.parentNode) {
                    document.body.removeChild(confetti);
                }
            }, 2000);
        }

        function addMessageToChat(user, message, isOwn) {
            const chatMessages = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${isOwn ? 'own-message' : ''}`;
            messageDiv.innerHTML = `<span class="chat-user">${user}:</span> ${message}`;
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function updateCharCount() {
            const input = document.getElementById('chatInput');
            const charCount = document.getElementById('charCount');
            const count = input.value.length;
            
            charCount.textContent = count;
            charCount.parentElement.classList.toggle('warning', count > 450);
        }

        function handleChatKeydown(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        }

        function stepAwayFromChat() {
            isAway = true;
            showStepAwayFeedback();
            
            // Auto-return after 15 minutes
            setTimeout(() => {
                if (isAway) {
                    isAway = false;
                    showReturnFeedback();
                }
            }, 15 * 60 * 1000);
        }

        function muteNotifications() {
            muteUntil = Date.now() + (30 * 60 * 1000); // 30 minutes
            
            const muteBtn = document.getElementById('muteNotifications');
            muteBtn.textContent = '🔇 Muted';
            muteBtn.style.color = '#a0aec0';
            
            setTimeout(() => {
                muteBtn.textContent = '🔇';
                muteBtn.style.color = '';
                muteUntil = null;
            }, 30 * 60 * 1000);
        }

        function switchToFocusFromBreak() {
            // Close break room and open focus room
            document.getElementById('breakRoomModal').classList.remove('active');
            setTimeout(() => {
                enterFocusRoom();
            }, 200);
        }

        // Integration with existing features
        function updateStatusFromActiveTask() {
            // If there's an active task with timer, use it for status
            if (typeof pinnedTaskIndex !== 'undefined' && pinnedTaskIndex !== null) {
                const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                const activeTask = tasks[pinnedTaskIndex];
                if (activeTask) {
                    userFocusStatus = `Working on: ${activeTask.task}`;
                    const statusEl = document.getElementById('ownFocusStatus');
                    if (statusEl) {
                        statusEl.textContent = userFocusStatus;
                    }
                }
            }
        }

        // Utility functions for community features
        function showWelcomeMessage(roomType) {
            // Show a gentle welcome notification
            const welcomeMessages = {
                focus: "🎯 Joined Focus Room - others are working quietly alongside you",
                break: "☕ Joined Break Room - feel free to chat and share support"
            };
            
            // Could show a temporary notification here
            console.log(welcomeMessages[roomType]);
        }

        function showReactionFeedback(reaction) {
            // Show a brief reaction animation
            const reactionDiv = document.createElement('div');
            reactionDiv.textContent = reaction;
            reactionDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 2rem;
                pointer-events: none;
                z-index: 10000;
                animation: reactionPop 1s ease-out forwards;
            `;
            
            document.body.appendChild(reactionDiv);
            
            setTimeout(() => {
                document.body.removeChild(reactionDiv);
            }, 1000);
        }

        function showStepAwayFeedback() {
            // Show feedback when stepping away
            console.log("Stepped away from chat - you can return anytime");
        }

        function showReturnFeedback() {
            // Show feedback when returning
            console.log("Welcome back to the community space");
        }

        function simulateResponse() {
            // Simulate occasional community responses
            const responses = [
                { user: 'Alex', message: 'Keep going! 💪' },
                { user: 'Sam', message: 'You got this!' },
                { user: 'Jordan', message: 'Taking a quick break too ☕' }
            ];
            
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            addMessageToChat(randomResponse.user, randomResponse.message, false);
        }

        // Simplified community integration

        function updateRoomCounts() {
            // Update room participant counts with slight variation
            const focusCount = mockChatData.focusRoom.count + Math.floor(Math.random() * 3) - 1;
            const breakCount = mockChatData.breakRoom.count + Math.floor(Math.random() * 3) - 1;
            
            document.getElementById('focusRoomCount').textContent = `${Math.max(1, focusCount)} focusing`;
            document.getElementById('breakRoomCount').textContent = `${Math.max(1, breakCount)} chatting`;
        }

        // Feedback and animations
        function showWelcomeMessage(roomType) {
            const messages = {
                focus: 'Welcome to the focus room! Others are working quietly alongside you.',
                break: 'Welcome to the break room! Feel free to share or just observe.'
            };
            
            if (roomType === 'break') {
                setTimeout(() => {
                    addMessageToChat('System', messages[roomType], false);
                    const lastMessage = document.querySelector('.chat-message:last-child');
                    if (lastMessage) {
                        lastMessage.classList.add('system-message');
                    }
                }, 500);
            }
        }

        function showReactionFeedback(reaction) {
            const feedback = document.createElement('div');
            feedback.textContent = reaction;
            feedback.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 2rem;
                z-index: 2000;
                pointer-events: none;
                animation: reactionPop 1s ease-out forwards;
            `;
            
            document.body.appendChild(feedback);
            setTimeout(() => feedback.remove(), 1000);
        }

        function showStepAwayFeedback() {
            const roomMood = document.getElementById('roomMood');
            if (roomMood) {
                const original = roomMood.textContent;
                roomMood.textContent = 'Taking a break • Back soon';
                roomMood.style.color = '#a0aec0';
                
                setTimeout(() => {
                    roomMood.textContent = original;
                    roomMood.style.color = '';
                }, 3000);
            }
        }

        function showReturnFeedback() {
            if (currentChatRoom) {
                const roomMood = document.getElementById('roomMood');
                if (roomMood) {
                    const original = roomMood.textContent;
                    roomMood.textContent = 'Welcome back! 👋';
                    roomMood.style.color = '#7c9885';
                    
                    setTimeout(() => {
                        roomMood.textContent = original;
                        roomMood.style.color = '';
                    }, 3000);
                }
            }
        }

        function simulateResponse() {
            const responses = [
                { user: 'Alex', message: 'You got this! 💪' },
                { user: 'Sam', message: 'Same here, taking it slow today' },
                { user: 'Jordan', message: 'Just taking a quick break too ☕' },
                { user: 'Casey', message: 'Sending good vibes! ✨' }
            ];
            
            const response = responses[Math.floor(Math.random() * responses.length)];
            if (currentChatRoom === 'break') {
                addMessageToChat(response.user, response.message, false);
            }
        }

        // Community Activity Management
        function initCommunityActivity() {
            updateCommunityStats();
            updateActivityFeed();
            
            // Periodic updates for community section
            setInterval(() => {
                updateCommunityStats();
                if (Math.random() < 0.3) updateActivityFeed();
            }, 15000); // Every 15 seconds
        }

        function updateCommunityStats() {
            // Update online and focusing counts with realistic variation
            const baseOnline = 12;
            const baseFocusing = 5;
            
            const onlineCount = baseOnline + Math.floor(Math.random() * 6) - 3;
            const focusingCount = Math.min(onlineCount, baseFocusing + Math.floor(Math.random() * 4) - 2);
            
            document.getElementById('totalOnline').textContent = Math.max(1, onlineCount);
            document.getElementById('totalFocusing').textContent = Math.max(0, focusingCount);
        }

        function updateActivityFeed() {
            const activityFeed = document.getElementById('activityFeed');
            if (!activityFeed) return; // Exit if element doesn't exist
            
            const activities = [
                { type: 'working', user: 'Alex', description: 'Writing blog post • 12 min' },
                { type: 'working', user: 'Sam', description: 'Coding feature • 5 min' },
                { type: 'working', user: 'Jordan', description: 'Reading documentation • 8 min' },
                { type: 'working', user: 'Maya', description: 'Designing mockups • 15 min' },
                { type: 'break', user: 'Casey', description: 'Taking a break ☕' },
                { type: 'break', user: 'Taylor', description: 'Quick walk outside 🚶' },
                { type: 'completed', user: 'Riley', description: 'Just completed a task! 🎉' },
                { type: 'completed', user: 'Avery', description: 'Finished project milestone ✨' },
                { type: 'working', user: 'Quinn', description: 'Email cleanup • 3 min' },
                { type: 'working', user: 'Sage', description: 'Research task • 20 min' }
            ];

            // Shuffle and pick 4 activities
            const shuffled = activities.sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 4);

            activityFeed.innerHTML = '';
            
            selected.forEach(activity => {
                const activityDiv = document.createElement('div');
                activityDiv.className = `activity-item ${activity.type}`;
                
                const dotClass = activity.type === 'working' ? 'working-dot' : 
                                activity.type === 'break' ? 'break-dot' : 'completed-dot';
                
                activityDiv.innerHTML = `
                    <div class="activity-status">
                        <span class="${dotClass}"></span>
                        <span class="activity-user">👤 ${activity.user}</span>
                    </div>
                    <span class="activity-description">${activity.description}</span>
                `;
                
                activityFeed.appendChild(activityDiv);
            });
        }

        // Integration with existing timer functionality
        function addUserToActivityFeed() {
            // When user starts a timer, add them to the activity feed
            if (typeof pinnedTaskIndex !== 'undefined' && pinnedTaskIndex !== null) {
                const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                const activeTask = tasks[pinnedTaskIndex];
                if (activeTask) {
                    const activityFeed = document.getElementById('activityFeed');
                    const userActivity = document.createElement('div');
                    userActivity.className = 'activity-item working own-activity';
                    userActivity.innerHTML = `
                        <div class="activity-status">
                            <span class="working-dot"></span>
                            <span class="activity-user">👤 You</span>
                        </div>
                        <span class="activity-description">Working on: ${activeTask.text}</span>
                    `;
                    
                    // Remove any existing user activity
                    const existingUserActivity = activityFeed ? activityFeed.querySelector('.own-activity') : null;
                    if (existingUserActivity) {
                        existingUserActivity.remove();
                    }
                    
                    // Add to top of feed
                    if (activityFeed) {
                        activityFeed.insertBefore(userActivity, activityFeed.firstChild);
                    }
                }
            }
        }

        function removeUserFromActivityFeed() {
            // When user stops timer, remove them from activity feed
            const existingUserActivity = document.querySelector('.own-activity');
            if (existingUserActivity) {
                existingUserActivity.remove();
            }
        }

        // Periodic updates
        setInterval(() => {
            if (Math.random() < 0.05) updateRoomCounts();
        }, 30000); // Every 30 seconds

        // CSS animation for reactions
        const reactionStyle = document.createElement('style');
        reactionStyle.textContent = `
            @keyframes reactionPop {
                0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1) translateY(-20px); opacity: 0; }
            }
        `;
        document.head.appendChild(reactionStyle);

        // =================================
        // THEME SYSTEM
        // =================================

        // Simple light/dark theme system
        const themes = {
            'light': {
                name: 'Light Mode',
                primaryColor: '#7c9885',
                secondaryColor: '#c9b3a3',
                backgroundColor: '#faf8f3',
                surfaceColor: '#ffffff',
                surfaceSecondary: '#f8f6f2',
                textPrimary: '#4a5568',
                textSecondary: '#718096',
                textTertiary: '#a0aec0',
                borderColor: '#e8dfd6',
                borderHover: '#d8cfc6',
                accentColor: '#22c55e',
                warningColor: '#e2a823',
                errorColor: '#e53e3e'
            },
            'dark': {
                name: 'Dark Mode',
                primaryColor: '#910A67',
                secondaryColor: '#720455',
                backgroundColor: '#030637',
                surfaceColor: '#0c1247',
                surfaceSecondary: '#152157',
                textPrimary: '#ffffff',
                textSecondary: '#e5e7eb',
                textTertiary: '#9ca3af',
                borderColor: '#374151',
                borderHover: '#6b7280',
                accentColor: '#33ff8c',
                warningColor: '#ffc640',
                errorColor: '#ef4444'
            }
        };

        let currentTheme = 'light';

        function initThemeSystem() {
            // Load saved theme
            const savedTheme = localStorage.getItem('selectedTheme');
            if (savedTheme && themes[savedTheme]) {
                currentTheme = savedTheme;
            }

            // Apply current theme
            applyTheme(currentTheme);

            // Add event listener for simple toggle
            document.getElementById('themeToggle').addEventListener('click', toggleDarkMode);
            
            // Update icon based on current theme
            updateThemeIcon();
        }

        function toggleDarkMode() {
            currentTheme = currentTheme === 'light' ? 'dark' : 'light';
            applyTheme(currentTheme);
            localStorage.setItem('selectedTheme', currentTheme);
            updateThemeIcon();
        }

        function updateThemeIcon() {
            const themeIcon = document.querySelector('.theme-icon');
            themeIcon.textContent = currentTheme === 'light' ? '🌙' : '☀️';
        }

        function applyTheme(themeKey) {
            const theme = themes[themeKey];
            if (!theme) return;

            const root = document.documentElement;
            root.style.setProperty('--primary-color', theme.primaryColor);
            root.style.setProperty('--secondary-color', theme.secondaryColor);
            root.style.setProperty('--background-color', theme.backgroundColor);
            root.style.setProperty('--surface-color', theme.surfaceColor);
            root.style.setProperty('--surface-secondary', theme.surfaceSecondary);
            root.style.setProperty('--text-primary', theme.textPrimary);
            root.style.setProperty('--text-secondary', theme.textSecondary);
            root.style.setProperty('--text-tertiary', theme.textTertiary);
            root.style.setProperty('--border-color', theme.borderColor);
            root.style.setProperty('--border-hover', theme.borderHover);
            root.style.setProperty('--accent-color', theme.accentColor);
            root.style.setProperty('--warning-color', theme.warningColor);
            root.style.setProperty('--error-color', theme.errorColor);

            // Add data-theme attribute to body for CSS targeting
            document.body.setAttribute('data-theme', themeKey);
        }

        function addTheme(themeKey, themeData) {
            themes[themeKey] = themeData;
            populateThemeSwatches();
        }

        // Initialize theme system
        initThemeSystem();

        // Function to populate the weekly pattern chart with actual mood data
        function populatePatternChart() {
            const patternChart = document.getElementById('patternChart');
            if (!patternChart) {
                console.warn('Pattern chart element not found');
                return;
            }

            const moodLog = JSON.parse(localStorage.getItem('moodLog')) || [];
            const moodMapping = { '😫': 1, '😮‍💨': 2, '😐': 3, '🙂': 4, '😄': 5 };
            
            // Get data for the last 7 days
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
            const today = new Date();
            const weekData = [];

            // Calculate averages for each day of the week
            for (let i = 0; i < 7; i++) {
                const dayMoods = moodLog.filter(entry => {
                    const entryDate = new Date(entry.date);
                    return entryDate.getDay() === i; // 0 = Sunday, 1 = Monday, etc.
                });

                let avgMood = 0;
                if (dayMoods.length > 0) {
                    const total = dayMoods.reduce((sum, entry) => sum + (moodMapping[entry.mood] || 3), 0);
                    avgMood = total / dayMoods.length;
                }

                weekData.push({
                    day: dayNames[i],
                    label: dayLabels[i],
                    average: avgMood,
                    count: dayMoods.length
                });
            }

            // Clear existing chart content
            patternChart.innerHTML = '';

            // Create chart bars for each day
            weekData.forEach(dayData => {
                const chartDay = document.createElement('div');
                chartDay.className = 'chart-day';

                const chartBar = document.createElement('div');
                chartBar.className = 'chart-bar';
                
                // Only show bar if there's data, otherwise hide it
                if (dayData.count > 0) {
                    const height = Math.max(10, (dayData.average / 5) * 100); // Convert 1-5 scale to percentage
                    chartBar.style.height = `${height}%`;
                    chartBar.style.opacity = '1';
                    
                    // Add mood-based color class
                    if (dayData.average >= 4.5) {
                        chartBar.classList.add('chart-bar-excellent');
                    } else if (dayData.average >= 3.5) {
                        chartBar.classList.add('chart-bar-good');
                    } else if (dayData.average >= 2.5) {
                        chartBar.classList.add('chart-bar-neutral');
                    } else if (dayData.average >= 1.5) {
                        chartBar.classList.add('chart-bar-tired');
                    } else {
                        chartBar.classList.add('chart-bar-stressed');
                    }
                } else {
                    // Show sample data if no mood data exists
                    const sampleHeights = [60, 80, 40, 90, 70, 50, 85];
                    const dayIndex = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].indexOf(dayData.label);
                    chartBar.style.height = `${sampleHeights[dayIndex] || 60}%`;
                    chartBar.style.opacity = '0.6';
                    chartBar.classList.add('chart-bar-neutral');
                }

                const chartLabel = document.createElement('div');
                chartLabel.className = 'chart-label';
                chartLabel.textContent = dayData.label;

                chartDay.appendChild(chartBar);
                chartDay.appendChild(chartLabel);
                patternChart.appendChild(chartDay);
            });
        }

        // Call this function whenever mood data changes
        function updateCharts() {
            populatePatternChart();
            if (document.getElementById('energyModal').classList.contains('active')) {
                populateEnergyModal();
            }
        }

        // Context-aware community button management
        function updateCommunityButtons() {
            const defaultBtn = document.getElementById('joinCommunityBtn');
            const focusBtn = document.getElementById('contextJoinFocus');
            const breakBtn = document.getElementById('contextJoinBreak');
            
            if (!defaultBtn || !focusBtn || !breakBtn) return;
            
            // Check timer states
            const isFocusTimerRunning = taskTimerInterval !== null;
            const isBreakTimerRunning = breakTimerInterval !== null;
            const isMainTimerRunning = document.getElementById('startTimer')?.textContent === 'Pause';
            
            // Reset all buttons to hidden
            defaultBtn.classList.add('context-btn-hidden');
            focusBtn.classList.add('context-btn-hidden');
            breakBtn.classList.add('context-btn-hidden');
            
            // Show appropriate button based on context - all disabled during development
            if (isFocusTimerRunning || isMainTimerRunning) {
                // During focus: show Focus Together button (disabled)
                focusBtn.classList.remove('context-btn-hidden');
                focusBtn.classList.add('disabled');
                focusBtn.disabled = true;
                focusBtn.title = "Community features coming soon!";
                focusBtn.onclick = null;
            } else if (isBreakTimerRunning) {
                // During break: show Break Room button (disabled)
                breakBtn.classList.remove('context-btn-hidden');
                breakBtn.classList.add('disabled');
                breakBtn.disabled = true;
                breakBtn.title = "Community features coming soon!";
                breakBtn.onclick = null;
            } else {
                // Default: show Join Community button (disabled)
                defaultBtn.classList.remove('context-btn-hidden');
                defaultBtn.classList.add('disabled');
                defaultBtn.disabled = true;
                defaultBtn.title = "This feature isn't live yet. Check back soon!";
            }
        }
        
        // Initialize charts and context-aware buttons on page load
        document.addEventListener('DOMContentLoaded', function() {
            populatePatternChart();
            updateCommunityButtons();
            
            // Update buttons periodically to catch timer state changes
            setInterval(updateCommunityButtons, 1000);
        });
