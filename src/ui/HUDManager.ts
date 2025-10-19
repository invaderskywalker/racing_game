// Basic modular HUD Manager for overlay UI elements
// Subscribes to eventBus, displays: score, coins, health, bullets, enemies
import { eventBus } from '../utils/event-bus';

export type HUDState = {
    score: number;
    coins: number;
    coinsTotal: number;
    health: number;
    bullets: number;
    maxBullets: number;
    enemies: number;
};

const DEFAULT_STATE: HUDState = {
    score: 0,
    coins: 0,
    coinsTotal: 0,
    health: 100,
    bullets: 0,
    maxBullets: 0,
    enemies: 0
};

export class HUDManager {
    private root: HTMLDivElement;
    private state: HUDState = { ...DEFAULT_STATE };
    constructor() {
        // Create and inject overlay DOM
        this.root = document.createElement('div');
        this.root.id = 'hud-overlay';
        this.root.style.position = 'fixed';
        this.root.style.top = '0';
        this.root.style.left = '0';
        this.root.style.width = '100vw';
        this.root.style.display = 'flex';
        this.root.style.justifyContent = 'space-between';
        this.root.style.alignItems = 'start';
        this.root.style.padding = '12px 24px 0 24px';
        this.root.style.color = '#fff';
        this.root.style.fontFamily = 'monospace, sans-serif';
        this.root.style.fontSize = '20px';
        this.root.style.zIndex = '99';
        this.root.style.pointerEvents = 'none';
        this.root.style.userSelect = 'none';
        this.root.style.textShadow = '0 1px 5px #222';
        this.root.innerHTML = this.render();
        document.body.appendChild(this.root);
        // Listen to events for HUD updates
        eventBus.on('hud.update', (partial: Partial<HUDState>) => {
            this.setState(partial);
        });
        eventBus.on('coin.collected', ({ coins, coinsTotal, score }) => this.setState({ coins, coinsTotal, score }));
        eventBus.on('score.updated', ({ score }) => this.setState({ score }));
        eventBus.on('player.health.changed', ({ health }) => this.setState({ health }));
        eventBus.on('bullet.fired', ({ bullets }) => this.setState({ bullets }));
        eventBus.on('bullet.max', ({ maxBullets }) => this.setState({ maxBullets }));
        eventBus.on('enemy.count.updated', ({ enemies }) => this.setState({ enemies }));
    }
    setState(partial: Partial<HUDState>) {
        this.state = { ...this.state, ...partial };
        this.update();
    }
    render() {
        const s = this.state;
        return `
        <div style="background:rgba(16,20,31,0.7);padding:8px 20px;border-radius:8px;">
          <span>Score: ${s.score.toString().padStart(5,'0')}</span>
          &nbsp; | &nbsp;
          <span>Coins: ${s.coins}/${s.coinsTotal}</span>
          &nbsp; | &nbsp;
          <span>Health: ${s.health}</span>
          &nbsp; | &nbsp;
          <span>Bullets: ${s.bullets}/${s.maxBullets}</span>
        </div>
        <div style="background:rgba(47,25,56,.7);padding:8px 18px;border-radius:8px;min-width:100px;text-align:right;">
          <span>ENEMIES: ${s.enemies}</span>
        </div>
        `;
    }
    update() {
        this.root.innerHTML = this.render();
    }
    destroy() {
        this.root.remove();
    }
}
