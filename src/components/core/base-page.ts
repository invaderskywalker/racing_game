// src/components/core/base-page.ts
import { BaseComponent } from './base-component';
import { loadStylesheet } from './stylesheet';
import { appStore } from './store';
import { Header } from '../ui/header/header';
import { CoolFooter } from '../ui/footer/footer';

interface BasePageOptions {
  show_header?: boolean;
}

export class BasePage extends BaseComponent {
  protected container: HTMLDivElement;
  protected headerComponent?: Header;
  protected header?: HTMLElement;
  protected nav?: HTMLElement;
  protected main: HTMLElement;
  protected footerComponent: CoolFooter;
  protected footer: HTMLElement;

  constructor({ show_header = true }: BasePageOptions = {}) {
    super();

    loadStylesheet(this._shadow, new URL('../../app.css', import.meta.url).toString());

    this.container = this.createElement('div', {
      id: 'root',
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '32px',
        minHeight: '100vh',
      },
    });

    if (show_header) {
      this.headerComponent = new Header(this);
      this.header = this.headerComponent.header;
      this.nav = this.headerComponent.nav;
    }

    this.main = this.createElement('main', {
      style: {
        width: '100%',
        padding: '16px',
        boxSizing: 'border-box',
      },
    });

    this.footerComponent = new CoolFooter();
    this.footer = this.footerComponent._footer;

    if (show_header) {
      this.container.append(this.headerComponent!.nav, this.header!, this.main, this.footer);
    } else {
      this.container.append(this.main);
    }

    this._shadow.appendChild(this.container);
  }

  createHeader(text: string, _class: string = ''): HTMLElement {
    return this.headerComponent!.createHeader(text, _class);
  }

  subscribeToStore(description: { text: string; textColor?: string | null }, input: HTMLInputElement | null = null): void {
    appStore.subscribe((state) => {
      description.text = state.lastClicked
        ? `${state.lastClicked} clicked! Input: ${state.inputValue || 'empty'}`
        : `Input value: ${state.inputValue || 'empty'}`;
      if (input) input.value = state.inputValue;
      this.container.style.backgroundColor =
        state.theme === 'dark'
          ? 'var(--mdc-theme-surface, #121212)'
          : 'var(--mdc-theme-background, #fff)';
      description.textColor =
        state.theme === 'dark'
          ? 'var(--mdc-theme-on-surface, #fff)'
          : 'var(--mdc-theme-on-background, #000)';
    });
  }

  // updateActiveLink(currentPage: string): void {
  //   const basePath = import.meta.env?.BASE_URL || '/';
  //   const path = currentPage.replace(basePath, '').replace(/^\//, '') || 'home';
  //   console.log('Updating active link for:', path);
  //   this.nav?.querySelectorAll('a').forEach((link) => {
  //     const href = link.getAttribute('href')?.replace(basePath, '').replace(/^\//, '') || '';
  //     link.setAttribute('aria-current', href === path ? 'page' : 'false');
  //   });
  // }
}

customElements.define('base-page', BasePage);