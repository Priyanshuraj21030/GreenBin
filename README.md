# Asquare Recycling Platform 🌱

A comprehensive web platform featuring an interactive Rhino Runner game that promotes recycling education and environmental awareness.

## Table of Contents
- [Demo](#demo)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Game Setup](#game-setup)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Demo 🎮

[Live Demo](https://asquare-recycling.web.app) | [Video Demo](https://youtube.com/asquare-demo)

## Features ✨

### Rhino Runner Game
- Endless runner with dynamic day/night cycle
- Obstacle avoidance gameplay
- Progressive difficulty system
- Real-time score tracking

### Environmental Education
- Interactive learning modules
- Recycling tips and guides
- Achievement system
- Progress tracking

## Prerequisites 📋

Before you begin, ensure you have the following installed:
- Web browser (Chrome/Firefox/Safari)
- Text editor (VS Code recommended)
- Basic understanding of HTML/CSS/JavaScript

## Installation 🚀

1. **Clone the repository**
   ```bash
   git clone https://github.com/Priyanshuraj21030/asquare-recycling.git
   cd asquare-recycling
   ```

2. **Set up local server**
   - Using VS Code:
     - Install "Live Server" extension
     - Right-click `index.html` and select "Open with Live Server"
   
   - Using Python:
     ```bash
     # Python 3.x
     python -m http.server 8000
     
     # Python 2.x
     python -m SimpleHTTPServer 8000
     ```

3. **Access the application**
   - Open `http://localhost:8000` in your browser

## Game Setup 🎮

### Basic Controls
- **Space/Up Arrow**: Jump
- **P**: Pause game
- **R**: Restart game

### File Structure
```
game/
├── index.html          # Main game page
├── css/               # Styling directory
│   └── style.css      # Game styles
└── js/               # JavaScript directory
    └── game.js       # Game logic
```

### Code Examples 💻

#### 1. Game Initialization
```javascript
// In js/game.js
const game = {
    canvas: document.getElementById('gameCanvas'),
    ctx: null,
    rhino: {
        x: 50,
        y: 0,
        width: 60,
        height: 40,
        jumping: false
    },
    init() {
        this.ctx = this.canvas.getContext('2d');
        this.setupEventListeners();
        this.startGameLoop();
    }
};
```

#### 2. Rhino Movement
```javascript
// Jump mechanics
function jump() {
    if (!rhino.jumping && !isGameOver) {
        rhino.jumping = true;
        rhino.jumpForce = -15;  // Negative force for upward movement
    }
}

// Update rhino position
function updateRhino() {
    if (rhino.jumping) {
        rhino.y += rhino.jumpForce;
        rhino.jumpForce += gravity;
        
        // Ground collision
        if (rhino.y > groundLevel) {
            rhino.y = groundLevel;
            rhino.jumping = false;
        }
    }
}
```

#### 3. Obstacle Generation
```javascript
// Create obstacle
function createObstacle() {
    return {
        x: canvas.width,
        y: canvas.height - 50,
        width: 30,
        height: 50,
        speed: 5,
        draw(ctx) {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    };
}

// Update obstacles
function updateObstacles() {
    // Generate new obstacle
    if (Math.random() < 0.02 && obstacles.length < 3) {
        obstacles.push(createObstacle());
    }
    
    // Update existing obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.x -= obstacle.speed;
        
        // Remove off-screen obstacles
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(i, 1);
            score++;
        }
    }
}
```

#### 4. Day/Night Cycle
```javascript
// Implement day/night cycle
const dayNightCycle = {
    time: 0,
    duration: 30000, // 30 seconds per cycle
    
    update() {
        this.time = (Date.now() % this.duration) / this.duration;
        return this.time;
    },
    
    getSkyColor() {
        const timeOfDay = this.update();
        if (timeOfDay < 0.25) return '#FF6B6B'; // Dawn
        if (timeOfDay < 0.75) return '#87CEEB'; // Day
        if (timeOfDay < 0.85) return '#FF6B6B'; // Dusk
        return '#0A1931'; // Night
    }
};
```

#### 5. Score System
```javascript
// Score tracking
const scoreSystem = {
    current: 0,
    highScore: 0,
    multiplier: 1,
    
    update(points) {
        this.current += points * this.multiplier;
        if (this.current > this.highScore) {
            this.highScore = this.current;
            this.saveHighScore();
        }
    },
    
    saveHighScore() {
        localStorage.setItem('highScore', this.highScore);
    },
    
    loadHighScore() {
        const saved = localStorage.getItem('highScore');
        this.highScore = saved ? parseInt(saved) : 0;
    }
};
```

#### 6. Custom Styling
```css
/* In css/style.css */
#gameCanvas {
    border: 2px solid #28a745;
    border-radius: 8px;
    background: linear-gradient(to bottom, #87CEEB, #E0F6FF);
}

.game-container {
    position: relative;
    width: 800px;
    margin: 0 auto;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.score-display {
    position: absolute;
    top: 20px;
    right: 20px;
    font-size: 24px;
    color: #28a745;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}
```

#### 7. Event Listeners
```javascript
// Setup game controls
function setupControls() {
    document.addEventListener('keydown', (event) => {
        switch(event.code) {
            case 'Space':
            case 'ArrowUp':
                event.preventDefault();
                jump();
                break;
            case 'KeyP':
                togglePause();
                break;
            case 'KeyR':
                if (isGameOver) restartGame();
                break;
        }
    });

    // Mobile touch support
    canvas.addEventListener('touchstart', (event) => {
        event.preventDefault();
        jump();
    });
}
```

## Project Structure
```
game/
├── index.html          # Main game page
├── css/               # Styling directory
│   └── style.css      # Game styles
└── js/               # JavaScript directory
    └── game.js       # Game logic
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
