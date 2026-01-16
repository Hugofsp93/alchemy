# NoteBan

A minimalist note-taking app, built with **Tauri 2.0**, **React**, and **Rust**.

## ✨ Features

- 📝 **Markdown Notes** — Write in plain text with live preview
- 📊 **Kanban Boards** — Organize tasks visually (coming soon)
- 🌙 **Dark Mode** — Automatic system theme detection
- 💾 **Local Storage** — Your notes stay on your machine as `.md` files
- ⚡ **Blazing Fast** — Native performance with Tauri's Rust backend

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | React + Vite |
| Backend | Rust (Tauri) |
| Storage | Local filesystem |
| Styling | Vanilla CSS (Bear-inspired) |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install)
- [Xcode Command Line Tools](https://developer.apple.com/xcode/) (macOS only)

### Installation

```bash
# Clone the repository
git clone https://github.com/Hugofsp93/noteban.git
cd noteban

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

## 📁 Project Structure

```
noteban/
├── src/              # React frontend
│   ├── App.jsx       # Main application
│   └── App.css       # Styles & design system
├── src-tauri/        # Rust backend
│   ├── src/
│   │   └── main.rs   # Tauri commands
│   └── Cargo.toml    # Rust dependencies
└── package.json      # Node dependencies
```

---

> Built with ❤️ using [Tauri](https://tauri.app/)
