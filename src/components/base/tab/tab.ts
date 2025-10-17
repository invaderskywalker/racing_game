// src/components/base/tab/tab.ts
import { BaseComponent } from '../../core/base-component';
import { BaseEvent } from '../../core/event-system';

interface TabOptions {
  label?: string;
  path?: string; // Unique identifier (e.g., file path)
  isActive?: boolean;
  closable?: boolean;
  ariaLabel?: string;
}

export class CoolTab extends BaseComponent {
  private _onDidClick: BaseEvent<MouseEvent>;
  private _onDidClose: BaseEvent<MouseEvent>;
  private _tab: HTMLDivElement;
  private _closeBtn?: HTMLSpanElement;
  private _path: string;

  constructor(options: TabOptions = {}) {
    super(options);
    this._onDidClick = new BaseEvent<MouseEvent>();
    this._onDidClose = new BaseEvent<MouseEvent>();
    this._path = options.path || '';

    const {
      label = 'Tab',
      isActive = false,
      closable = true,
      ariaLabel = `Tab: ${label}`,
    } = options;

    this.initShadowDom(new URL('./tab.css', import.meta.url).toString());

    this._tab = this.createElement('div', {
      class: `tab ${isActive ? 'active' : ''}`,
      'aria-label': ariaLabel,
      role: 'tab',
      'data-path': this._path,
    }, label);

    if (closable) {
      this._closeBtn = this.createElement('span', { class: 'close-tab', 'aria-label': `Close ${label}` }, '×');
      this._closeBtn.addEventListener('click', (e: MouseEvent) => {
        console.log("close button press ")
        e.stopPropagation();
        this._onDidClose.dispatch(e);
      });
      this._tab.appendChild(this._closeBtn);
    }

    this._tab.addEventListener('click', (e: MouseEvent) => {
      this._onDidClick.dispatch(e);
    });

    this._shadow.appendChild(this._tab);
  }

  get onDidClick(): BaseEvent<MouseEvent> {
    return this._onDidClick;
  }

  get onDidClose(): BaseEvent<MouseEvent> {
    return this._onDidClose;
  }

  get path(): string {
    return this._path;
  }

  set active(value: boolean) {
    this._tab.classList.toggle('active', value);
    this._tab.setAttribute('aria-selected', value.toString());
  }

  get active(): boolean {
    return this._tab.classList.contains('active');
  }

  set label(value: string) {
    this._tab.textContent = value;
    if (this._closeBtn) {
      this._tab.appendChild(this._closeBtn); // Re-append close button if present
    }
    this._tab.setAttribute('aria-label', `Tab: ${value}`);
  }

  get label(): string {
    return this._tab.textContent?.replace('×', '') || '';
  }

  dispose(): void {
    this._tab.remove();
    this._shadow.innerHTML = '';
  }
}

customElements.define('cool-tab', CoolTab);