// HUD component for the racing game (placeholder)
export class RacingGameHUD extends HTMLElement {
  constructor() {
    super();
    this.innerHTML = `<div>HUD Component Placeholder</div>`;
  }
}
customElements.define('racing-game-hud', RacingGameHUD);
