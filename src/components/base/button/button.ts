// src/components/base/button/button.ts
import { BaseComponent } from '../../core/base-component';
import { BaseEvent } from '../../core/event-system';

interface ButtonOptions {
  title?: string;
  type?: 'primary' | 'secondary';
  ariaLabel?: string;
  supportIcons?: boolean;
  theme?: string;
  icon?: string;
}

export class CoolButton extends BaseComponent {
  private _onDidClick: BaseEvent<MouseEvent>;
  private _button: HTMLButtonElement;

  constructor(options: ButtonOptions = {}) {
    super(options);
    this._onDidClick = new BaseEvent<MouseEvent>();

    const {
      title = 'Button',
      type = 'secondary',
      ariaLabel = title,
      supportIcons = false,
      theme = '',
      icon = '',
    } = options;

    this.initShadowDom(new URL('./button.css', import.meta.url).toString());

    this._button = this.createElement(
      'button',
      {
        class: `button button--${type} ${theme ? `button--${theme}` : ''}`,
        'aria-label': ariaLabel,
        title: title || '',
      },
      supportIcons && icon ? '' : title
    );

    if (supportIcons && icon) {
      const iconSpan = this.createElement('span', { class: 'icon' }, icon);
      this._button.prepend(iconSpan);
    }

    this._button.addEventListener('click', (event: MouseEvent) => {
      if (!this._button.disabled) {
        this._onDidClick.dispatch(event);
      }
    });

    this._shadow.appendChild(this._button);
  }

  get onDidClick(): BaseEvent<MouseEvent> {
    return this._onDidClick;
  }

  get label(): string {
    return this._button.textContent || '';
  }

  set label(value: string) {
    this._button.textContent = value;
    if (this.getAttribute('aria-label') === this.getAttribute('title')) {
      this._button.setAttribute('aria-label', value);
    }
  }

  get icon(): string | null {
    const icon = this._shadow.querySelector('.icon') as HTMLElement;
    return icon ? icon.textContent : null;
  }

  set icon(value: string | null) {
    const icon = this._shadow.querySelector('.icon') as HTMLElement;
    if (value && icon) {
      icon.textContent = value;
    } else if (value) {
      const newIcon = this.createElement('span', { class: 'icon' }, value);
      this._button.prepend(newIcon);
    } else if (icon) {
      icon.remove();
    }
  }

  get enabled(): boolean {
    return !this._button.disabled;
  }

  set enabled(value: boolean) {
    this._button.disabled = !value;
  }

  get checked(): boolean {
    return this._button.getAttribute('aria-checked') === 'true';
  }

  set checked(value: boolean) {
    this._button.setAttribute('aria-checked', value.toString());
  }

  focus(): void {
    this._button.focus();
  }

  hasFocus(): boolean {
    return document.activeElement === this._button;
  }

  dispose(): void {
    this._button.remove();
    this._shadow.innerHTML = '';
  }
}

customElements.define('cool-button', CoolButton);