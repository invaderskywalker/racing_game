// src/components/base/tab-bar/tab-bar.ts
import { BaseComponent } from '../../core/base-component';
import { CoolTab } from '../tab/tab';

interface TabBarOptions {
  tabs?: { path: string; label: string }[];
  selectedTab?: string;
}

export class CoolTabBar extends BaseComponent {
  private _tabBar: HTMLDivElement;
  private _tabs: Map<string, CoolTab> = new Map();
  private _selectedTab: string | null = null;
  private _previewButton: HTMLButtonElement;
  private _isPreviewActive: boolean = false;

  constructor(options: TabBarOptions = {}) {
    super(options);
    const { tabs = [], selectedTab = null } = options;

    this.initShadowDom(new URL('./tab-bar.css', import.meta.url).toString());

    this._tabBar = this.createElement('div', { class: 'tab-bar', role: 'tablist' });

    // Create preview button
    this._previewButton = this.createElement('button', {
      class: 'preview-button',
      'aria-label': 'Toggle markdown preview',
      title: 'Toggle Markdown Preview',
    }, 'Preview');
    this._previewButton.addEventListener('click', () => {
      this._isPreviewActive = !this._isPreviewActive;
      this._previewButton.classList.toggle('active', this._isPreviewActive);
      this.dispatchEvent(new CustomEvent('preview-toggled', { detail: { isActive: this._isPreviewActive } }));
    });

    this._tabBar.appendChild(this._previewButton);
    this._shadow.appendChild(this._tabBar);

    this.renderTabs(tabs, selectedTab);
  }

  private renderTabs(tabs: { path: string; label: string }[], selectedTab: string | null): void {
    const existingPaths = new Set(this._tabs.keys());
    const newPaths = new Set(tabs.map(t => t.path));

    // Remove tabs that are no longer present
    for (const path of existingPaths) {
      if (!newPaths.has(path)) {
        const tab = this._tabs.get(path);
        tab?.dispose();
        this._tabs.delete(path);
      }
    }

    // Add or update tabs
    for (const { path, label } of tabs) {
      let tab = this._tabs.get(path);
      if (!tab) {
        tab = new CoolTab({
          label,
          path,
          isActive: path === selectedTab,
          closable: true,
        });
        tab.onDidClick.addListener(() => {
          this._selectedTab = path;
          this.updateActiveTab();
          this.dispatchEvent(new CustomEvent('tab-selected', { detail: { path } }));
        });
        tab.onDidClose.addListener(() => {
          console.log("listening close tab ");
          this.dispatchEvent(new CustomEvent('tab-closed', { detail: { path } }));
        });
        this._tabs.set(path, tab);
        this._tabBar.insertBefore(tab, this._previewButton); // Insert before preview button
      } else {
        tab.label = label;
        tab.active = path === selectedTab;
      }
    }

    this._selectedTab = selectedTab;
    this.updatePreviewButton();
  }

  private updateActiveTab(): void {
    this._tabs.forEach((tab, path) => {
      tab.active = path === this._selectedTab;
    });
  }

  private updatePreviewButton(): void {
    const isMarkdown = this._selectedTab?.toLowerCase().endsWith('.md') || this._selectedTab?.toLowerCase().endsWith('.markdown');
    this._previewButton.style.display = isMarkdown ? 'block' : 'none';
    if (!isMarkdown) {
      this._isPreviewActive = false;
      this._previewButton.classList.remove('active');
    }
  }

  setTabs(tabs: { path: string; label: string }[], selectedTab: string | null): void {
    this.renderTabs(tabs, selectedTab);
  }

  dispose(): void {
    this._tabs.forEach(tab => tab.dispose());
    this._tabs.clear();
    this._previewButton.remove();
    this._tabBar.remove();
    this._shadow.innerHTML = '';
  }
}

customElements.define('cool-tab-bar', CoolTabBar);
