// src/components/core/base-component.ts
interface BaseComponentOptions {
  [key: string]: any;
}

export class BaseComponent extends HTMLElement {
  protected _shadow: ShadowRoot;
  protected _options: BaseComponentOptions;

  constructor(options: BaseComponentOptions = {}) {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._options = options;
  }

  protected initShadowDom(stylesheetUrl?: string): void {
    console.log('style sheet url ', stylesheetUrl);
    if (stylesheetUrl) {
      const styleLink = document.createElement('link');
      styleLink.setAttribute('rel', 'stylesheet');
      styleLink.setAttribute('href', stylesheetUrl);
      this._shadow.appendChild(styleLink);
    }
  }

  protected createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attributes: Record<string, string | object> = {},
    content: string = ''
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else if (value) {
        element.setAttribute(key, value.toString());
      }
    });
    element.textContent = content;
    return element;
  }
}