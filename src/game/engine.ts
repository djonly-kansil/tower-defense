import { Position, TURRET_TYPES, TurretType, GameState } from './types';

const CELL_SIZE = 40;
const COLS = 16;
const ROWS = 12;
const WIDTH = COLS * CELL_SIZE;
const HEIGHT = ROWS * CELL_SIZE;

// Path defined in grid coordinates
const PATH: Position[] = [
  { x: 0, y: 2 },
  { x: 4, y: 2 },
  { x: 4, y: 8 },
  { x: 10, y: 8 },
  { x: 10, y: 3 },
  { x: 15, y: 3 },
];

class Enemy {
  x: number;
  y: number;
  pathIndex: number = 0;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;

  constructor(wave: number) {
    this.x = PATH[0].x * CELL_SIZE + CELL_SIZE / 2;
    this.y = PATH[0].y * CELL_SIZE + CELL_SIZE / 2;
    this.maxHp = 50 + wave * 20;
    this.hp = this.maxHp;
    this.speed = 1.5 + wave * 0.1;
    this.reward = 10 + Math.floor(wave * 2);
  }

  update(): boolean {
    if (this.pathIndex >= PATH.length - 1) return true; // Reached end

    const target = PATH[this.pathIndex + 1];
    const tx = target.x * CELL_SIZE + CELL_SIZE / 2;
    const ty = target.y * CELL_SIZE + CELL_SIZE / 2;

    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.speed) {
      this.x = tx;
      this.y = ty;
      this.pathIndex++;
    } else {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#10b981'; // green-500
    ctx.beginPath();
    ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
    ctx.fill();

    // HP Bar
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(this.x - 15, this.y - 20, 30, 4);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(this.x - 15, this.y - 20, 30 * (this.hp / this.maxHp), 4);
  }
}

class Turret {
  x: number;
  y: number;
  type: TurretType;
  cooldown: number = 0;

  constructor(gridX: number, gridY: number, type: TurretType) {
    this.x = gridX * CELL_SIZE + CELL_SIZE / 2;
    this.y = gridY * CELL_SIZE + CELL_SIZE / 2;
    this.type = type;
  }

  update(enemies: Enemy[], addProjectile: (p: Projectile) => void) {
    if (this.cooldown > 0) this.cooldown--;

    if (this.cooldown <= 0) {
      // Find target
      let target: Enemy | null = null;
      let minDst = this.type.range;

      for (const enemy of enemies) {
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDst) {
          minDst = dist;
          target = enemy;
        }
      }

      if (target) {
        this.cooldown = this.type.cooldown;
        addProjectile(new Projectile(this.x, this.y, target, this.type.damage, this.type.color));
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.type.color;
    ctx.fillRect(this.x - 15, this.y - 15, 30, 30);
    
    // Draw range circle (faint)
    ctx.strokeStyle = this.type.color + '40'; // 25% opacity
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.type.range, 0, Math.PI * 2);
    ctx.stroke();
  }
}

class Projectile {
  x: number;
  y: number;
  target: Enemy;
  damage: number;
  speed: number = 8;
  color: string;
  active: boolean = true;

  constructor(x: number, y: number, target: Enemy, damage: number, color: string) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.color = color;
  }

  update() {
    if (!this.active) return;

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.speed) {
      this.target.hp -= this.damage;
      this.active = false;
    } else {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.active) return;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  onStateChange: (state: GameState) => void;
  
  animationId: number = 0;
  
  money: number = 200;
  lives: number = 20;
  wave: number = 1;
  isGameOver: boolean = false;
  
  enemies: Enemy[] = [];
  turrets: Turret[] = [];
  projectiles: Projectile[] = [];
  
  spawnTimer: number = 0;
  enemiesToSpawn: number = 0;
  
  selectedCell: Position | null = null;

  constructor(canvas: HTMLCanvasElement, onStateChange: (state: GameState) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onStateChange = onStateChange;
    
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    
    this.startWave();
    
    this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
  }

  start() {
    const loop = () => {
      this.update();
      this.draw();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    cancelAnimationFrame(this.animationId);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown.bind(this));
  }

  startWave() {
    this.enemiesToSpawn = 5 + this.wave * 2;
    this.spawnTimer = 60; // 1 second at 60fps
  }

  handlePointerDown(e: PointerEvent) {
    if (this.isGameOver) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const gridX = Math.floor(x / CELL_SIZE);
    const gridY = Math.floor(y / CELL_SIZE);
    
    if (gridX >= 0 && gridX < COLS && gridY >= 0 && gridY < ROWS) {
      // Check if it's path
      if (this.isPath(gridX, gridY)) {
        this.selectedCell = null;
      } else {
        this.selectedCell = { x: gridX, y: gridY };
      }
      this.notifyState();
    }
  }

  isPath(gx: number, gy: number): boolean {
    // Simple line segment check
    for (let i = 0; i < PATH.length - 1; i++) {
      const p1 = PATH[i];
      const p2 = PATH[i+1];
      
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      
      if (gx >= minX && gx <= maxX && gy >= minY && gy <= maxY) {
        return true;
      }
    }
    return false;
  }

  getTurretAt(gx: number, gy: number): Turret | undefined {
    return this.turrets.find(t => Math.floor(t.x / CELL_SIZE) === gx && Math.floor(t.y / CELL_SIZE) === gy);
  }

  buildTurret(typeId: string) {
    if (!this.selectedCell) return;
    const type = TURRET_TYPES[typeId];
    if (!type) return;
    
    if (this.money >= type.cost && !this.getTurretAt(this.selectedCell.x, this.selectedCell.y)) {
      this.money -= type.cost;
      this.turrets.push(new Turret(this.selectedCell.x, this.selectedCell.y, type));
      this.selectedCell = null;
      this.notifyState();
    }
  }

  sellTurret() {
    if (!this.selectedCell) return;
    const index = this.turrets.findIndex(t => Math.floor(t.x / CELL_SIZE) === this.selectedCell!.x && Math.floor(t.y / CELL_SIZE) === this.selectedCell!.y);
    if (index !== -1) {
      const turret = this.turrets[index];
      this.money += Math.floor(turret.type.cost * 0.5);
      this.turrets.splice(index, 1);
      this.selectedCell = null;
      this.notifyState();
    }
  }

  notifyState() {
    this.onStateChange({
      money: this.money,
      lives: this.lives,
      wave: this.wave,
      isGameOver: this.isGameOver,
      selectedCell: this.selectedCell,
      cellHasTurret: this.selectedCell ? !!this.getTurretAt(this.selectedCell.x, this.selectedCell.y) : false
    });
  }

  update() {
    if (this.isGameOver) return;

    // Spawning
    if (this.enemiesToSpawn > 0) {
      this.spawnTimer--;
      if (this.spawnTimer <= 0) {
        this.enemies.push(new Enemy(this.wave));
        this.enemiesToSpawn--;
        this.spawnTimer = Math.max(20, 60 - this.wave * 2);
      }
    } else if (this.enemies.length === 0) {
      // Wave complete
      this.wave++;
      this.money += 50 + this.wave * 10;
      this.startWave();
      this.notifyState();
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.hp <= 0) {
        this.money += enemy.reward;
        this.enemies.splice(i, 1);
        this.notifyState();
        continue;
      }
      
      const reachedEnd = enemy.update();
      if (reachedEnd) {
        this.lives--;
        this.enemies.splice(i, 1);
        this.notifyState();
        if (this.lives <= 0) {
          this.isGameOver = true;
          this.notifyState();
        }
      }
    }

    // Update turrets
    for (const turret of this.turrets) {
      turret.update(this.enemies, (p) => this.projectiles.push(p));
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update();
      if (!p.active) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  draw() {
    // Clear
    this.ctx.fillStyle = '#1e293b'; // slate-800
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw Grid (faint)
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= WIDTH; x += CELL_SIZE) {
      this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, HEIGHT); this.ctx.stroke();
    }
    for (let y = 0; y <= HEIGHT; y += CELL_SIZE) {
      this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(WIDTH, y); this.ctx.stroke();
    }

    // Draw Path
    this.ctx.fillStyle = '#475569'; // slate-600
    for (let i = 0; i < PATH.length - 1; i++) {
      const p1 = PATH[i];
      const p2 = PATH[i+1];
      
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          this.ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    // Draw Start and End markers
    this.ctx.fillStyle = '#ef4444'; // Start
    this.ctx.fillRect(PATH[0].x * CELL_SIZE, PATH[0].y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    this.ctx.fillStyle = '#3b82f6'; // End
    const last = PATH[PATH.length-1];
    this.ctx.fillRect(last.x * CELL_SIZE, last.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

    // Draw Selected Cell
    if (this.selectedCell) {
      this.ctx.strokeStyle = '#facc15'; // yellow-400
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(this.selectedCell.x * CELL_SIZE, this.selectedCell.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    // Draw Turrets
    for (const turret of this.turrets) {
      turret.draw(this.ctx);
    }

    // Draw Enemies
    for (const enemy of this.enemies) {
      enemy.draw(this.ctx);
    }

    // Draw Projectiles
    for (const p of this.projectiles) {
      p.draw(this.ctx);
    }
  }
}
