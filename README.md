# 🔺 Cracker Barrel Peg Game

The classic triangle peg solitaire puzzle from Cracker Barrel — now in your browser.

Jump pegs to remove them. Leave as few as possible. Leave just one and you're a genius!

## ✨ Features

- **Chess.com-style drag & drop** — hold and drag pegs with smooth animations
- **Illegal move feedback** — pegs shake back to their origin, just like chess pieces
- **Captured peg animation** — jumped pegs fade out with a satisfying scale effect
- **Sound effects** — pickup, place, capture, and illegal move audio via Web Audio API
- **Choose your starting hole** — pick which hole starts empty
- **Undo & best score tracking** — take back moves and beat your record
- **Fully responsive** — works on desktop, tablet, and mobile
- **Touch-optimized** — native touch handling with no lag

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📦 Deploy to GitHub Pages

### Option A: GitHub Actions (recommended)

1. Push this repo to GitHub
2. Go to **Settings → Pages → Source** → select **GitHub Actions**
3. Every push to `main` auto-deploys via the included workflow at `.github/workflows/deploy.yml`

> **Important:** Update `base` in `vite.config.js` to match your repo name:
> ```js
> base: '/your-repo-name/',
> ```

### Option B: Manual deploy with `gh-pages`

```bash
# Update "homepage" in package.json with your GitHub username
npm run deploy
```

## 🎮 How to Play

1. The board starts with 14 pegs and one empty hole
2. **Drag a peg** to jump over an adjacent peg into an empty hole
3. The jumped peg is removed from the board
4. Jumps can go in any of 6 directions along the triangle grid
5. The game ends when no more jumps are possible

### Rating Scale (from the original board)

| Pegs Left | Rating |
|-----------|--------|
| 1 | You're a genius! |
| 2 | Pretty smart |
| 3 | Just plain dumb |
| 4+ | Try again! |

## 🏗️ Project Structure

```
├── index.html          # Entry point with all UI markup
├── src/
│   ├── main.js         # Game orchestration, input, animations
│   ├── game.js         # Pure game logic (board state, moves)
│   ├── renderer.js     # Canvas drawing (board, pegs, effects)
│   ├── audio.js        # Web Audio API sound effects
│   └── style.css       # All styles
├── vite.config.js      # Vite config with GitHub Pages base path
├── .github/
│   └── workflows/
│       └── deploy.yml  # Auto-deploy on push to main
└── package.json
```

## 📄 License

MIT
