// src/components/ui/markdown-preview/markdown-preview.ts
import { BaseComponent } from '../../core/base-component';

export class MarkdownPreview extends BaseComponent {
  private _container: HTMLDivElement;

  constructor() {
    super();
    this.initShadowDom(new URL('./markdown-preview.css', import.meta.url).toString());
    this._container = this.createElement('div', { class: 'markdown-preview' });
    this._shadow.appendChild(this._container);
  }

  public update(markdown: string) {
    if ((window as any).marked) {
      this._container.innerHTML = (window as any).marked.parse(markdown);
    } else {
      this._container.textContent = markdown;
    }
  }

  dispose(): void {
    this._container.remove();
    this._shadow.innerHTML = '';
  }
}

customElements.define('markdown-preview', MarkdownPreview);