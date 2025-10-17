// src/app.ts
import { loadStylesheet } from './components/core/stylesheet';
import { TimeTracker } from './pages/time-tracker';

interface Route {
  component: new () => HTMLElement;
  title: string;
}

const routes: Record<string, Route> = {
  home: { component: TimeTracker, title: 'Tracker' },
};

class App extends HTMLElement {
  private _shadow: ShadowRoot;
  private container: HTMLDivElement;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    loadStylesheet(this._shadow, new URL('./app.css', import.meta.url).toString());

    this.container = document.createElement('div');
    this.container.id = 'app-container';
    this._shadow.appendChild(this.container);

    this.addEventListener('navigate', (e: Event) => {
      const customEvent = e as CustomEvent<{ page: string }>;
      console.log('debug listener .. ', customEvent);
      const { page } = customEvent.detail;
      this.navigateTo(page);
    });
    
    window.addEventListener('popstate', () => this.renderPage());
    this.renderPage();
  }

  navigateTo(page: string): void {
    const basePath = import.meta.env?.BASE_URL || '/';
    history.pushState({}, '', `${basePath}${page || 'home'}`);
    this.renderPage();
  }

  renderPage(): void {
    const basePath = import.meta.env?.BASE_URL || '/';
    const path = window.location.pathname.replace(basePath, '') || 'home';
    console.log('Rendering page:', path);
    const route = routes[path] || routes['home'];

    this.container.innerHTML = '';
    const component = new route.component();
    this.container.appendChild(component);

    if ((component as any).updateActiveLink) {
      (component as any).updateActiveLink(path);
    }

    document.title = route.title || 'My App';

    this.container.setAttribute('tabindex', '-1');
    this.container.focus();
  }
}

customElements.define('app-root', App);