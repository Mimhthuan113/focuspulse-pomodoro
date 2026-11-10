/**
 * FocusPulse - Unit Test Suite (Node.js)
 * Tests core logic, time formatting, task management, and boundary cases.
 */

const {
  TIMER_MODES,
  StorageService,
  formatTime,
  TaskManager,
  PomodoroTimer,
} = require('./app.js');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  FAIL: ${testName}`);
    failedTests++;
  }
}

console.log('--- TEST SUITE 1: formatTime Helper & Boundary Cases ---');
assert(formatTime(1500) === '25:00', '1500 seconds should format to 25:00');
assert(formatTime(300) === '05:00', '300 seconds should format to 05:00');
assert(formatTime(65) === '01:05', '65 seconds should format to 01:05');
assert(formatTime(9) === '00:09', '9 seconds should pad to 00:09');
assert(formatTime(0) === '00:00', '0 seconds should format to 00:00');
// Boundary / Invalid inputs
assert(formatTime(-10) === '00:00', 'Negative seconds should return 00:00');
assert(formatTime(null) === '00:00', 'null should return 00:00');
assert(formatTime(undefined) === '00:00', 'undefined should return 00:00');
assert(formatTime('invalid') === '00:00', 'string should return 00:00');
assert(formatTime(NaN) === '00:00', 'NaN should return 00:00');

console.log('\n--- TEST SUITE 2: StorageService Memory Fallback ---');
const storage = new StorageService();
assert(storage.isStorageAvailable === false, 'Storage in Node environment correctly falls back to memory');
storage.setItem('sample_key', { count: 42 });
const retrieved = storage.getItem('sample_key');
assert(retrieved && retrieved.count === 42, 'Memory fallback successfully writes and reads objects');
assert(storage.getItem('non_existent', 'default') === 'default', 'Missing key returns default value');

console.log('\n--- TEST SUITE 3: TaskManager CRUD & Boundary Cases ---');
const taskMgr = new TaskManager(storage);
// Empty input checks
const emptyRes1 = taskMgr.add('');
assert(emptyRes1.success === false && emptyRes1.error, 'Empty task string rejected');
const emptyRes2 = taskMgr.add('   ');
assert(emptyRes2.success === false, 'Whitespace-only task string rejected');
const nullRes = taskMgr.add(null);
assert(nullRes.success === false, 'null task rejected');

// Overlength check (>200 chars)
const longText = 'a'.repeat(250);
const longRes = taskMgr.add(longText);
assert(longRes.success === false, 'Task exceeding 200 chars rejected');

// Valid add
const addRes = taskMgr.add('Complete MLH challenge submission');
assert(addRes.success === true && addRes.task.text === 'Complete MLH challenge submission', 'Valid task added');
const taskId = addRes.task.id;

// Toggle completion
const toggleRes1 = taskMgr.toggle(taskId);
assert(toggleRes1.success === true && toggleRes1.task.completed === true, 'Task toggled to completed');
const toggleRes2 = taskMgr.toggle(taskId);
assert(toggleRes2.success === true && toggleRes2.task.completed === false, 'Task toggled back to active');

// Toggle non-existent
assert(taskMgr.toggle('ghost_id').success === false, 'Toggling non-existent task fails gracefully');

// Clear completed tasks
taskMgr.toggle(taskId); // make completed
taskMgr.add('Active task 2');
const clearRes = taskMgr.clearCompleted();
assert(clearRes.success === true && clearRes.cleared === 1, 'Clear completed removed 1 task');
assert(taskMgr.getAll().length === 1 && taskMgr.getAll()[0].text === 'Active task 2', 'Active task preserved');

// Delete task
const remainingId = taskMgr.getAll()[0].id;
assert(taskMgr.delete(remainingId).success === true, 'Task deleted');
assert(taskMgr.getAll().length === 0, 'Task list is now empty');
assert(taskMgr.delete('ghost_id').success === false, 'Deleting non-existent task fails gracefully');

console.log('\n--- TEST SUITE 4: PomodoroTimer State & Countdown ---');
const timer = new PomodoroTimer(storage);
assert(timer.currentMode === 'focus', 'Default mode is focus');
assert(timer.timeLeft === TIMER_MODES.focus.duration, 'Initial timeLeft matches 25m');

// Mode switching
const modeRes = timer.setMode('shortBreak');
assert(modeRes.success === true && timer.timeLeft === 300, 'Switched to shortBreak (300s)');
const invalidMode = timer.setMode('invalid_mode');
assert(invalidMode.success === false, 'Invalid mode change rejected gracefully');

// Reset
timer.setMode('focus');
timer.timeLeft = 500;
timer.reset();
assert(timer.timeLeft === 1500, 'Reset restored original mode duration');

// Tick countdown & session completion
let completedNotified = false;
timer.onCompleteCallback = (mode, totalSessions) => {
  completedNotified = true;
};
timer.timeLeft = 2;
timer.tick();
assert(timer.timeLeft === 1, 'Tick decrements timeLeft by 1');
timer.tick();
assert(timer.timeLeft === 0, 'Tick reaches 0');
assert(completedNotified === true, 'Completion callback invoked when timer hits 0');
assert(timer.getStats().sessions >= 1, 'Focus session stats incremented on completion');

console.log('\n=======================================');
console.log(`TOTAL TESTS: ${passedTests + failedTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('=======================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

