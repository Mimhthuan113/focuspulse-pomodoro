# ⚡ FocusPulse

> **A minimalist, responsive Pomodoro timer and micro-task tracker built with vanilla web technologies and Web Audio API.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![MLH: Global Hack Week](https://img.shields.io/badge/MLH-Global%20Hack%20Week%3A%20Builders%20Week-red.svg)](https://events.mlh.io/events/14729-global-hack-week-builders-week)

Developed for **Global Hack Week: Builders Week** — *CHALLENGE 1: Build a Mini App with Cursor*.

---

## ✨ Features

- **⏱️ Flexible Pomodoro Cycles**: Seamlessly switch between **25m Deep Focus**, **5m Short Break**, and **15m Long Break**.
- **🔔 Native Web Audio Chime**: Clean audio notifications synthesized via the native Web Audio API (Sine oscillator frequency sweep) — zero external mp3 dependencies.
- **📝 Focus Objective Tracker**: Add, complete, and clear micro-tasks to stay accountable during each session.
- **📊 Daily Productivity Stats**: Automatically tracks completed focus sessions and accumulated focus minutes for today.
- **🌓 Dark & Light Modes**: Sleek, eye-friendly design system with instant theme switching persisted across reloads.
- **💾 LocalStorage & Fallback Persistence**: Your preferences and tasks persist reliably in local storage with automated in-memory fallbacks.
- **📱 Fully Responsive**: Optimized for desktop workstations, tablets, and mobile screens.

---

## 🛠️ Built With

- **HTML5**: Semantic tags, ARIA accessibility attributes, SVG circular progress ring.
- **CSS3**: CSS Custom Properties (Variables), Flexbox & CSS Grid, responsive media queries.
- **Vanilla JavaScript (ES6+)**: Modular state controller, custom StorageService, Web Audio API synthesis.
- **Node.js**: Zero-dependency automated test runner (`test_app.js` with 35 assertions).

---

## 🤖 AI Collaboration Statement (for MLH Challenge 1)

> *Cursor assisted in scaffolding the initial modular Pomodoro architecture and writing the Web Audio API synthesizer chime. It also helped rapidly troubleshoot the countdown boundary conditions and localStorage state synchronization.*

---

## 🚀 Getting Started

### Method 1: Direct in Browser
Simply double-click `index.html` or open it with any web browser (Chrome, Edge, Firefox, Safari).

### Method 2: Local HTTP Server (Python)
```bash
cd focuspulse-pomodoro
python -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

### Run Automated Unit Tests
```bash
node test_app.js
```

---

## 📦 Publishing to GitHub (2-Minute Guide)

1. Initialize git and commit:
   ```bash
   cd d:\a23\focuspulse-pomodoro
   git init
   git add .
   git commit -m "feat: initial commit for FocusPulse mini app"
   ```
2. Create a new public repository on [GitHub](https://github.com/new) named `focuspulse-pomodoro`.
3. Push your repository:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/focuspulse-pomodoro.git
   git push -u origin main
   ```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
