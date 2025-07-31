class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 36;
        this.h = 32;
        this.speed = 5;
        this.cooldown = 0;
        this.color = "#5ff";
        this.bullets = [];
    }

    move(dx, dy, bounds) {
        this.x = clamp(this.x + dx * this.speed, 0, bounds.w - this.w);
        this.y = clamp(this.y + dy * this.speed, 0, bounds.h - this.h);
    }

    shoot() {
        if (this.cooldown <= 0) {
            this.bullets.push({
                x: this.x + this.w / 2 - 3,
                y: this.y - 12,
                w: 6,
                h: 14,
                vy: -9,
                color: "#0ff"
            });
            this.cooldown = 12;
        }
    }

    update(bounds) {
        if (this.cooldown > 0) this.cooldown--;
        // Update bullets
        for (let b of this.bullets) b.y += b.vy;
        // Remove off-screen bullets
        this.bullets = this.bullets.filter(b => b.y + b.h > 0);
    }

    render(ctx) {
        // Draw ship (simple polygon)
        ctx.save();
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        ctx.beginPath();
        ctx.moveTo(0, -this.h/2);
        ctx.lineTo(-this.w/2+5, this.h/2);
        ctx.lineTo(0, this.h/2-7);
        ctx.lineTo(this.w/2-5, this.h/2);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.shadowColor = "#0ff";
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        // Draw bullets
        for (let b of this.bullets) {
            ctx.fillStyle = b.color;
            ctx.globalAlpha = 0.88;
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.globalAlpha = 1;
        }
    }
}

class Enemy {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.w = 32;
        this.h = 28;
        this.vx = vx;
        this.vy = vy;
        this.color = "#fa2";
        this.hp = 1;
    }

    update(bounds) {
        this.x += this.vx;
        this.y += this.vy;
        // Bounce at sides
        if (this.x < 0 || this.x + this.w > bounds.w) this.vx *= -1;
    }

    render(ctx, t) {
        // Little "UFO"
        ctx.save();
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        ctx.beginPath();
        ctx.ellipse(0, 0, this.w/2, this.h/2, 0, 0, 2*Math.PI);
        ctx.fillStyle = this.color;
        ctx.shadowColor = "#ff0";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        // Dome
        ctx.beginPath();
        ctx.ellipse(0, -6, this.w/4.2, this.h/4, 0, 0, Math.PI, true);
        ctx.fillStyle = "#fff8";
        ctx.fill();
        ctx.restore();
    }
}

class EnemyManager {
    constructor(bounds) {
        this.bounds = bounds;
        this.enemies = [];
        this.spawnTimer = 0;
        this.level = 1;
    }

    update(level) {
        // Spawn enemies
        this.spawnTimer--;
        if (this.spawnTimer <= 0) {
            this.spawnEnemy(level);
            this.spawnTimer = 35 + randInt(0, 40) - Math.floor(level*0.8);
        }
        // Update enemies
        for (let e of this.enemies) e.update(this.bounds);
        // Remove off-screen
        this.enemies = this.enemies.filter(
            e => e.y < this.bounds.h + 32 && e.hp > 0
        );
    }

    spawnEnemy(level) {
        let x = randInt(10, this.bounds.w - 42);
        let y = -30;
        let vx = (Math.random() - 0.5) * (1 + level*0.1);
        let vy = 1.6 + level*0.13 + Math.random()*0.5;
        this.enemies.push(new Enemy(x, y, vx, vy));
    }

    render(ctx, t) {
        for (let e of this.enemies)
            e.render(ctx, t);
    }
}

class GameManager {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 400;
        this.canvas.height = 540;
        this.ctx = this.canvas.getContext('2d');
        this.bounds = { w: this.canvas.width, h: this.canvas.height };
        this.running = false;
        this.gameOver = false;
        this.score = 0;
        this.level = 1;
        this.keys = {};
        this.lastFrame = 0;
        this.player = new Player(this.bounds.w / 2 - 18, this.bounds.h - 60);
        this.enemyManager = new EnemyManager(this.bounds);
        this.setupUI();
        this.addEventListeners();
        this.renderMenu();
    }

    setupUI() {
        const container = document.getElementById('gameContainer');
        container.innerHTML = '';
        container.appendChild(this.canvas);
        // Score display
        this.scoreDisplay = document.createElement('div');
        this.scoreDisplay.id = 'scoreDisplay';
        this.scoreDisplay.style.display = 'none';
        container.appendChild(this.scoreDisplay);
    }

    addEventListeners() {
        // Keyboard
        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            // Prevent scrolling with arrows
            if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) {
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
        });
    }

    renderMenu() {
        // Draw menu overlay
        const container = document.getElementById('gameContainer');
        let menu = document.createElement('div');
        menu.className = 'menu';
        menu.innerHTML = `
            <div style="font-size:2em;letter-spacing:2px;font-weight:600;margin-bottom:18px;">
                🚀 Space Shooter
            </div>
            <div style="font-size:1.04em;margin-bottom:14px;">
                Arrow keys or WASD to move<br>
                Spacebar to shoot<br>
                <span style="color:#0ff">Destroy UFOs. Good luck!</span>
            </div>
            <button id="startBtn">Start Game</button>
        `;
        menu.id = 'mainMenu';
        container.appendChild(menu);
        document.getElementById('startBtn').onclick = () => {
            this.startGame();
        };
        // Show a preview background
        this.ctx.clearRect(0,0,this.bounds.w,this.bounds.h);
        this.ctx.save();
        this.ctx.font = "bold 30px Segoe UI";
        this.ctx.fillStyle = "#ffffff22";
        this.ctx.textAlign = "center";
        this.ctx.fillText("SPACE SHOOTER", this.bounds.w/2, this.bounds.h/2-18);
        this.ctx.font = "18px Segoe UI";
        this.ctx.fillText("Press Start", this.bounds.w/2, this.bounds.h/2+26);
        this.ctx.restore();
    }

    startGame() {
        this.running = true;
        this.gameOver = false;
        this.score = 0;
        this.level = 1;
        this.player = new Player(this.bounds.w / 2 - 18, this.bounds.h - 60);
        this.enemyManager = new EnemyManager(this.bounds);
        this.scoreDisplay.style.display = '';
        // Remove menu
        let menu = document.getElementById('mainMenu');
        if (menu) menu.remove();
        this.lastFrame = performance.now();
        requestAnimationFrame(this.render.bind(this));
    }

    endGame() {
        this.running = false;
        this.gameOver = true;
        this.scoreDisplay.style.display = 'none';
        // Show menu again with score
        const container = document.getElementById('gameContainer');
        let menu = document.createElement('div');
        menu.className = 'menu';
        menu.innerHTML = `
            <div style="font-size:2em;margin-bottom:14px;">
                Game Over
            </div>
            <div style="font-size:1.2em;margin-bottom:8px;">
                Score: <span style="color:#0ff">${this.score}</span>
            </div>
            <button id="retryBtn">Play Again</button>
        `;
        menu.id = 'mainMenu';
        container.appendChild(menu);
        document.getElementById('retryBtn').onclick = () => {
            this.startGame();
        };
    }

    handleInput() {
        let dx=0, dy=0;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) dx -= 1;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) dx += 1;
        if (this.keys['ArrowUp'] || this.keys['KeyW']) dy -= 1;
        if (this.keys['ArrowDown'] || this.keys['KeyS']) dy += 1;
        this.player.move(dx, dy, this.bounds);
        if (this.keys['Space']) this.player.shoot();
    }

    update() {
        this.handleInput();
        this.player.update(this.bounds);

        // Level up
        if (this.score > 0 && this.score % 12 === 0) {
            this.level = 1 + Math.floor(this.score / 12);
        }

        this.enemyManager.update(this.level);

        // Bullet collisions
        for (let b of this.player.bullets) {
            for (let e of this.enemyManager.enemies) {
                if (e.hp > 0 && rectsCollide(b, e)) {
                    e.hp = 0;
                    b.y = -1000; // Remove bullet
                    this.score++;
                }
            }
        }
        // Enemy hits player
        for (let e of this.enemyManager.enemies) {
            if (e.hp > 0 && rectsCollide(e, this.player)) {
                this.endGame();
                return;
            }
        }
    }

    render(now) {
        if (!this.running) return;

        // Delta time for future use
        let dt = (now - this.lastFrame) / 1000;
        this.lastFrame = now;

        // Update logic
        this.update();

        // Draw
        let ctx = this.ctx;
        ctx.clearRect(0, 0, this.bounds.w, this.bounds.h);

        // Starfield background
        ctx.save();
        for (let i=0; i<36; ++i) {
            let x = ((i*67) % this.bounds.w) + Math.sin(now/400 + i)*20;
            let y = ((i*122)%this.bounds.h) + (now/18 + i*9)%this.bounds.h;
            ctx.beginPath();
            ctx.arc(x, y%this.bounds.h, 1.2 + ((i*31)%8)*0.13, 0, 2*Math.PI);
            ctx.fillStyle = "#fff" + ((i%4)+5).toString(16);
            ctx.globalAlpha = 0.2 + ((i%3)*0.15);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        // Entities
        this.player.render(ctx);
        this.enemyManager.render(ctx, now);

        // UI
        this.scoreDisplay.textContent = `Score: ${this.score}   Level: ${this.level}`;

        // Next frame
        if (this.running)
            requestAnimationFrame(this.render.bind(this));
    }
}

// Mandatory initialization pattern
function initGame() {
    new GameManager();
}
window.addEventListener('DOMContentLoaded', initGame);