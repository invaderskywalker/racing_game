// src/components/ui/footer/footer.ts
import { BaseComponent } from '../../core/base-component';

export class CoolFooter extends BaseComponent {
  public _footer: HTMLElement; // Changed from private to protected

  constructor() {
    super();
    this.initShadowDom(new URL('./footer.css', import.meta.url).toString());
    this._footer = this.createElement('footer', {
      style: { textAlign: 'center', padding: '16px' },
    });
    this._footer.innerHTML = `© ${new Date().getFullYear()} My App. <a href="/">Contact Us</a>`;
    this._shadow.appendChild(this._footer);
  }
}

customElements.define('cool-footer', CoolFooter);