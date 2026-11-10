/**
 * FocusPulse - Core Logic & State Management
 * Minimalist Pomodoro & Focus Companion
 */

// Timer configuration (in seconds)
const TIMER_MODES = {
  focus: { label: 'Focus', duration: 25 * 60 },
  shortBreak: { label: 'Short Break', duration: 5 * 60 },
  longBreak: { label: 'Long Break', duration: 15 * 60 },
};

/**
 * Storage Manager with in-memory fallback
 */
class StorageService {
  constructor() {
    this.memoryStore = {};
    this.isStorageAvailable = this.checkAvailability();
  }

  checkAvailability() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      const testKey = '__test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  getItem(key, defaultValue = null) {
    try {
      if (this.isStorageAvailable) {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      }
      return this.memoryStore[key] !== undefined ? this.memoryStore[key] : defaultValue;
    } catch (e) {
      console.warn('Storage read error, using fallback:', e);
      return defaultValue;
    }
  }

  setItem(key, value) {
    try {
      if (this.isStorageAvailable) {
        window.localStorage.setItem(key, JSON.stringify(value));
      } else {
        this.memoryStore[key] = value;
      }
      return true;
    } catch (e) {
      console.warn('Storage write error:', e);
      this.memoryStore[key] = value;
      return false;
    }
  }
}

/**
 * Pure helper functions for time formatting & calculations
 */
function formatTime(totalSeconds) {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds < 0) {
    return '00:00';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Task Management Logic
 */
class TaskManager {
  constructor(storageService = new StorageService()) {
    this.storage = storageService;
    this.tasksKey = 'focuspulse_tasks';
    this.tasks = this.storage.getItem(this.tasksKey, []);
  }

  getAll() {
    return [...this.tasks];
  }

  add(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return { success: false, error: 'Task content cannot be empty' };
    }
    const sanitizedText = text.trim();
    if (sanitizedText.length > 200) {
      return { success: false, error: 'Task content exceeds maximum length (200 characters)' };
    }

    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      text: sanitizedText,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    this.tasks.unshift(newTask);
    this.storage.setItem(this.tasksKey, this.tasks);
    return { success: true, task: newTask };
  }

  toggle(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }
    task.completed = !task.completed;
    this.storage.setItem(this.tasksKey, this.tasks);
    return { success: true, task };
  }

  delete(taskId) {
    const initialLength = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== taskId);
    if (this.tasks.length === initialLength) {
      return { success: false, error: 'Task not found' };
    }
    this.storage.setItem(this.tasksKey, this.tasks);
    return { success: true };
  }

  clearCompleted() {
    const countBefore = this.tasks.length;
    this.tasks = this.tasks.filter((t) => !t.completed);
    this.storage.setItem(this.tasksKey, this.tasks);
    return { success: true, cleared: countBefore - this.tasks.length };
  }
}

/**
 * Pomodoro Timer State Controller
 */
class PomodoroTimer {
  constructor(storageService = new StorageService()) {
    this.storage = storageService;
    this.statsKey = 'focuspulse_stats';
    this.currentMode = 'focus';
    this.timeLeft = TIMER_MODES.focus.duration;
    this.isRunning = false;
    this.intervalId = null;
    this.onTickCallback = null;
    this.onCompleteCallback = null;
    this.onModeChangeCallback = null;

    // Load stats
    const today = new Date().toISOString().slice(0, 10);
    const savedStats = this.storage.getItem(this.statsKey, { date: today, sessions: 0 });
    this.stats = savedStats.date === today ? savedStats : { date: today, sessions: 0 };
  }

  getStats() {
    return { ...this.stats };
  }

  setMode(mode) {
    if (!TIMER_MODES[mode]) {
      return { success: false, error: `Invalid mode: ${mode}` };
    }
    this.pause();
    this.currentMode = mode;
    this.timeLeft = TIMER_MODES[mode].duration;
    if (this.onModeChangeCallback) this.onModeChangeCallback(this.currentMode, this.timeLeft);
    if (this.onTickCallback) this.onTickCallback(this.timeLeft, this.getFormattedTime());
    return { success: true, mode: this.currentMode, timeLeft: this.timeLeft };
  }

  getFormattedTime() {
    return formatTime(this.timeLeft);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.pause();
    this.timeLeft = TIMER_MODES[this.currentMode].duration;
    if (this.onTickCallback) this.onTickCallback(this.timeLeft, this.getFormattedTime());
  }

  tick() {
    if (this.timeLeft > 0) {
      this.timeLeft -= 1;
      if (this.onTickCallback) this.onTickCallback(this.timeLeft, this.getFormattedTime());
    }

    if (this.timeLeft === 0) {
      this.pause();
      if (this.currentMode === 'focus') {
        this.stats.sessions += 1;
        this.storage.setItem(this.statsKey, this.stats);
      }
      if (this.onCompleteCallback) {
        this.onCompleteCallback(this.currentMode, this.stats.sessions);
      }
    }
  }
}

/**
 * Web Audio API synthesizer for bell chime
 */
function playChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (err) {
    console.warn('Audio playback error (Web Audio API):', err);
  }
}

// Export for Node.js unit tests and Browser module compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TIMER_MODES,
    StorageService,
    formatTime,
    TaskManager,
    PomodoroTimer,
    playChime,
  };
}

/**
 * Browser DOM Event Binding & UI Controller
 */
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const storageService = new StorageService();
    const taskManager = new TaskManager(storageService);
    const timer = new PomodoroTimer(storageService);

    // DOM Elements - Theme
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const savedTheme = storageService.getItem('focuspulse_theme', 'dark');
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (themeIcon) themeIcon.textContent = savedTheme === 'dark' ? '🌙' : '☀️';

    themeToggleBtn?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      storageService.setItem('focuspulse_theme', next);
      if (themeIcon) themeIcon.textContent = next === 'dark' ? '🌙' : '☀️';
    });

    // DOM Elements - Timer
    const timeDisplay = document.getElementById('time-display');
    const startBtn = document.getElementById('start-btn');
    const startBtnLabel = document.getElementById('start-btn-label');
    const resetBtn = document.getElementById('reset-btn');
    const chimeTestBtn = document.getElementById('chime-test-btn');
    const modeTabs = document.querySelectorAll('.mode-tab');
    const modeBadge = document.getElementById('mode-badge');
    const progressCircle = document.getElementById('progress-circle');
    const statsSessions = document.getElementById('stats-sessions');
    const statsMinutes = document.getElementById('stats-minutes');

    const CIRCUMFERENCE = 2 * Math.PI * 105; // 659.73px

    function updateProgress(timeLeft, totalDuration) {
      if (!progressCircle) return;
      const fraction = timeLeft / totalDuration;
      const offset = CIRCUMFERENCE * (1 - fraction);
      progressCircle.style.strokeDashoffset = offset;
    }

    function updateStatsUI() {
      const stats = timer.getStats();
      if (statsSessions) statsSessions.textContent = stats.sessions;
      if (statsMinutes) statsMinutes.textContent = stats.sessions * 25;
    }

    function syncTimerUI(timeLeft, formattedTime) {
      if (timeDisplay) timeDisplay.textContent = formattedTime;
      const totalDuration = TIMER_MODES[timer.currentMode].duration;
      updateProgress(timeLeft, totalDuration);
      document.title = `${formattedTime} - FocusPulse`;
    }

    timer.onTickCallback = (timeLeft, formatted) => syncTimerUI(timeLeft, formatted);

    timer.onModeChangeCallback = (mode) => {
      modeTabs.forEach((tab) => {
        const isCurrent = tab.getAttribute('data-mode') === mode;
        tab.classList.toggle('active', isCurrent);
        tab.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
      });
      if (modeBadge) {
        modeBadge.textContent =
          mode === 'focus' ? 'Deep Focus' : mode === 'shortBreak' ? 'Short Break' : 'Long Break';
      }
      if (startBtn && startBtnLabel) {
        startBtnLabel.textContent = `Start ${TIMER_MODES[mode].label}`;
        startBtn.querySelector('.btn-icon').textContent = '▶';
      }
    };

    timer.onCompleteCallback = (mode, totalSessions) => {
      playChime();
      updateStatsUI();
      alert(`🎉 Session completed! Time for a well-deserved ${mode === 'focus' ? 'break' : 'focus session'}!`);
      if (startBtn && startBtnLabel) {
        startBtnLabel.textContent = `Start ${TIMER_MODES[timer.currentMode].label}`;
        startBtn.querySelector('.btn-icon').textContent = '▶';
      }
    };

    startBtn?.addEventListener('click', () => {
      if (timer.isRunning) {
        timer.pause();
        if (startBtnLabel) startBtnLabel.textContent = 'Resume';
        startBtn.querySelector('.btn-icon').textContent = '▶';
      } else {
        timer.start();
        if (startBtnLabel) startBtnLabel.textContent = 'Pause';
        startBtn.querySelector('.btn-icon').textContent = '⏸';
      }
    });

    resetBtn?.addEventListener('click', () => {
      timer.reset();
      if (startBtn && startBtnLabel) {
        startBtnLabel.textContent = `Start ${TIMER_MODES[timer.currentMode].label}`;
        startBtn.querySelector('.btn-icon').textContent = '▶';
      }
      const totalDuration = TIMER_MODES[timer.currentMode].duration;
      updateProgress(timer.timeLeft, totalDuration);
    });

    chimeTestBtn?.addEventListener('click', () => {
      playChime();
    });

    modeTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.getAttribute('data-mode');
        timer.setMode(mode);
      });
    });

    // DOM Elements - Tasks
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const tasksCounter = document.getElementById('tasks-counter');
    const emptyState = document.getElementById('empty-state');
    const clearCompletedBtn = document.getElementById('clear-completed-btn');

    function renderTasks() {
      const tasks = taskManager.getAll();
      if (taskList) taskList.innerHTML = '';

      if (tasksCounter) {
        const activeCount = tasks.filter((t) => !t.completed).length;
        tasksCounter.textContent = `${activeCount} active`;
      }

      if (emptyState) {
        emptyState.style.display = tasks.length === 0 ? 'flex' : 'none';
      }

      tasks.forEach((t) => {
        const li = document.createElement('li');
        li.className = `task-item ${t.completed ? 'completed' : ''}`;
        li.dataset.id = t.id;

        li.innerHTML = `
          <input type="checkbox" class="task-checkbox" ${t.completed ? 'checked' : ''} aria-label="Mark task done" />
          <span class="task-text">${escapeHtml(t.text)}</span>
          <button class="task-delete-btn" title="Delete task" aria-label="Delete task">✕</button>
        `;
        taskList?.appendChild(li);
      });
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    taskForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = taskInput?.value;
      if (!val) return;
      const res = taskManager.add(val);
      if (res.success) {
        if (taskInput) taskInput.value = '';
        renderTasks();
      }
    });

    taskList?.addEventListener('click', (e) => {
      const target = e.target;
      const li = target.closest('.task-item');
      if (!li) return;
      const id = li.dataset.id;

      if (target.classList.contains('task-checkbox')) {
        taskManager.toggle(id);
        renderTasks();
      } else if (target.classList.contains('task-delete-btn')) {
        taskManager.delete(id);
        renderTasks();
      }
    });

    clearCompletedBtn?.addEventListener('click', () => {
      taskManager.clearCompleted();
      renderTasks();
    });

    // Initial render
    updateStatsUI();
    renderTasks();
    syncTimerUI(timer.timeLeft, timer.getFormattedTime());
  });
}


