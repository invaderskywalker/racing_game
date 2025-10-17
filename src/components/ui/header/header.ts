// src/components/ui/header/header.ts
import { BaseComponent } from '../../core/base-component';

interface NavLink {
  href: string;
  text: string;
}

export class Header extends BaseComponent {
  private parent: HTMLElement;
  public nav: HTMLElement;
  public header: HTMLElement;

  constructor(parent: HTMLElement) {
    super();

    this.parent = parent;

    this.nav = this.createElement('nav', {
      role: 'navigation',
      'aria-label': 'Main navigation',
      style: {
        width: '100%',
        padding: '16px',
        background: 'var(--mdc-theme-surface)',
        boxShadow: 'var(--mdc-elevation-2)',
        display: 'flex',
        gap: '16px',
        justifyContent: 'center',
      },
    });

    const navLinks: NavLink[] = [
      { href: '/home', text: 'Home' },
      { href: '/team', text: 'Team' },
      { href: '/finance', text: 'Finance' },
      { href: '/editor', text: 'Editor' },
    ];

    navLinks.forEach((link) => {
      const navLink = this.createElement(
        'a',
        {
          href: link.href,
          'aria-current': 'false',
          role: 'link',
        },
        link.text
      );
      navLink.addEventListener('click', (e: MouseEvent) => {
        e.preventDefault();
        const page = link.href.replace(/^\//, '') || 'home';
        console.log('Navigating to:', page);
        const check = this.parent.dispatchEvent(
          new CustomEvent('navigate', {
            detail: { page },
            bubbles: true,
            composed: true,
          })
        );
        console.log('dispatchEvent:', check);
      });
      navLink.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navLink.click();
        }
      });
      // this.nav.appendChild(navLink);
    });

    this.header = this.createElement('header');
  }

  createHeader(text: string, _class: string = ''): HTMLElement {
    return this.createElement(
      'h1',
      {
        class: `mdc-typography--headline5 ${_class}`,
      },
      text
    );
  }
}

customElements.define('cool-header', Header);