// src/components/base/text/text.ts
import { BaseComponent } from '../../core/base-component';

interface TextOptions {
  text?: string;
  textColor?: string;
  textFontSize?: string;
  ariaLabel?: string;
}

export class CoolText extends BaseComponent {
  static get observedAttributes(): string[] {
    return ['text', 'text-color', 'text-font-size', 'aria-label'];
  }

  private _text: string;
  private _textColor: string;
  private _textFontSize: string;
  private _ariaLabel: string;
  private _p: HTMLParagraphElement;

  constructor(options: TextOptions = {}) {
    super(options);

    this._text = options.text || this.getAttribute('text') || 'Default text';
    this._textColor = options.textColor || this.getAttribute('text-color') || '';
    this._textFontSize = options.textFontSize || this.getAttribute('text-font-size') || '';
    this._ariaLabel = options.ariaLabel || this.getAttribute('aria-label') || '';

    this.initShadowDom(new URL('./text.css', import.meta.url).toString());

    this._p = this.createElement(
      'p',
      {
        'aria-label': this._ariaLabel,
        style: {
          color: this._textColor,
          fontSize: this._textFontSize,
        },
      },
      this._text
    );

    this._shadow.appendChild(this._p);
  }

  get text(): string {
    return this._p.textContent || '';
  }

  set text(value: string) {
    this._p.textContent = value || 'Default text';
    this.setAttribute('text', value);
  }

  get textColor(): string | null {
    return this._p.style.color || null;
  }

  set textColor(value: string | null) {
    this._p.style.color = value || '';
    if (value) this.setAttribute('text-color', value);
    else this.removeAttribute('text-color');
  }

  get textFontSize(): string | null {
    return this._p.style.fontSize || null;
  }

  set textFontSize(value: string | null) {
    this._p.style.fontSize = value || '';
    if (value) this.setAttribute('text-font-size', value);
    else this.removeAttribute('text-font-size');
  }

  get ariaLabel(): string | null {
    return this._p.getAttribute('aria-label') || null;
  }

  set ariaLabel(value: string | null) {
    if (value) {
      this._p.setAttribute('aria-label', value);
      this.setAttribute('aria-label', value);
    } else {
      this._p.removeAttribute('aria-label');
      this.removeAttribute('aria-label');
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    switch (name) {
      case 'text':
        this._p.textContent = newValue || 'Default text';
        break;
      case 'text-color':
        this._p.style.color = newValue || '';
        break;
      case 'text-font-size':
        this._p.style.fontSize = newValue || '';
        break;
      case 'aria-label':
        if (newValue) {
          this._p.setAttribute('aria-label', newValue);
        } else {
          this._p.removeAttribute('aria-label');
        }
        break;
    }
  }
}

customElements.define('cool-text', CoolText);