// src/components/base/breadcrumb/breadcrumb.ts
import { BaseComponent } from '../../core/base-component';
import { BaseEvent } from '../../core/event-system';

interface BreadcrumbOptions {
  path?: string; // Full file path (e.g., "src/components/ui/code-editor.ts")
  ariaLabel?: string;
}

export class CoolBreadcrumb extends BaseComponent {
  private _onSegmentClick: BaseEvent<{ path: string }>;
  private _breadcrumb: HTMLDivElement;
  private _currentPath: string | null = null;

  constructor(options: BreadcrumbOptions = {}) {
    super(options);
    this._onSegmentClick = new BaseEvent<{ path: string }>();

    const { path = '', ariaLabel = 'File path breadcrumb' } = options;

    this.initShadowDom(new URL('./breadcrumb.css', import.meta.url).toString());

    this._breadcrumb = this.createElement('div', {
      class: 'breadcrumb',
      'aria-label': ariaLabel,
      role: 'navigation',
    });

    this._shadow.appendChild(this._breadcrumb);
    this.setPath(path);
  }

  get onSegmentClick(): BaseEvent<{ path: string }> {
    return this._onSegmentClick;
  }

  setPath(path: string | null): void {
    this._currentPath = path;
    this.render();
  }

  private render(): void {
    this._breadcrumb.innerHTML = ''; // Clear existing segments

    if (!this._currentPath) {
      this._breadcrumb.textContent = 'No file selected';
      return;
    }

    const segments = this._currentPath.split('/').filter(segment => segment.length > 0);
    const pathSoFar: string[] = [];
    console.log("segments -- ", segments)

    segments.forEach((segment, index) => {
      pathSoFar.push(segment);
      const fullPath = pathSoFar.join('/');

      const segmentElement = this.createElement('span', {
        class: 'breadcrumb-segment',
        role: 'button',
        'aria-label': `Navigate to ${segment}`,
        'data-path': fullPath,
      }, segment);

      if (index < segments.length && index > 0) {
        const separator = this.createElement('span', { class: 'breadcrumb-separator' }, '>');
        this._breadcrumb.appendChild(separator);
      }

      segmentElement.addEventListener('click', () => {
        this._onSegmentClick.dispatch({ path: fullPath });
      });

      this._breadcrumb.appendChild(segmentElement);
    });
  }

  dispose(): void {
    this._breadcrumb.remove();
    this._shadow.innerHTML = '';
  }
}

customElements.define('cool-breadcrumb', CoolBreadcrumb);
