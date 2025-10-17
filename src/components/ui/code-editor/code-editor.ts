// src/components/ui/code-editor/code-editor.ts
import { BaseComponent } from '../../core/base-component';
import { appStore } from '../../core/store';
import { FileItem } from '../../core/store';
import { CoolTabBar } from '../../base/tab-bar/tab-bar';
import { CoolBreadcrumb } from '../../base/breadcrumb/breadcrumb';
import { MarkdownPreview } from '../../base/markdown-preview/markdown-preview';

export class CodeEditor extends BaseComponent {
  private _wrapper: HTMLDivElement;
  private _container: HTMLDivElement;
  private _rightSide: HTMLDivElement;
  private _tabBar: CoolTabBar;
  private _breadcrumb: CoolBreadcrumb;
  private _textarea: HTMLTextAreaElement;
  private _editorContainer: HTMLDivElement;
  private _markdownPreview: MarkdownPreview | null = null;
  private _selectedFile: string | null = null;
  private _isPreviewActive: boolean = false;

  constructor() {
    super();
    this.initShadowDom(new URL('./code-editor.css', import.meta.url).toString());
    this._wrapper = this.createElement('div', { class: 'code-editor-wrapper' });
    this._container = this.createElement('div', { class: 'code-editor' });
    this._rightSide = this.createElement('div', { class: 'preview-screen' });
    this._tabBar = new CoolTabBar();
    this._breadcrumb = new CoolBreadcrumb();
    this._editorContainer = this.createElement('div', { class: 'editor-container' });
    this._textarea = this.createElement('textarea', {
      placeholder: 'Select a file to edit...',
      'aria-label': 'Code editor',
      id: 'code-textarea',
    });

    this._editorContainer.appendChild(this._textarea);
    this._container.appendChild(this._tabBar);
    this._container.appendChild(this._breadcrumb);
    this._container.appendChild(this._editorContainer);
    this._wrapper.appendChild(this._container)
    this._shadow.appendChild(this._wrapper);

    this._textarea.addEventListener('input', () => {
      if (this._selectedFile) {
        appStore.dispatch({
          type: 'UPDATE_FILE_CONTENT',
          payload: {
            path: this._selectedFile,
            content: this._textarea.value,
          },
        });
        if (this._isPreviewActive && this._markdownPreview) {
          this._markdownPreview.update(this._textarea.value);
        }
      }
    });

    window.addEventListener('keydown', this.handleKeydown);

    this._tabBar.addEventListener('tab-selected', (e: Event) => {
      const { path } = (e as CustomEvent<{ path: string }>).detail;
      appStore.dispatch({ type: 'SET_SELECTED_FILE', payload: path });
    });

    this._tabBar.addEventListener('tab-closed', (e: Event) => {
      const { path } = (e as CustomEvent<{ path: string }>).detail;
      const state = appStore.getState();
      const remainingTabs = state.openFiles.filter(f => f !== path);
      const newSelected = this._selectedFile === path
        ? remainingTabs[remainingTabs.length - 1] || null
        : this._selectedFile;
      appStore.dispatch({ type: 'SET_OPEN_FILES', payload: remainingTabs });
      appStore.dispatch({ type: 'SET_SELECTED_FILE', payload: newSelected });
    });

    this._tabBar.addEventListener('preview-toggled', (e: Event) => {
      const { isActive } = (e as CustomEvent<{ isActive: boolean }>).detail;
      this._isPreviewActive = isActive;
      this.togglePreview();
    });

    // this._breadcrumb.onSegmentClick.addListener((e: CustomEvent<{ path: string }>) => {
    //   const { path } = e.detail;
    //   appStore.dispatch({ type: 'SET_SELECTED_FILE', payload: path });
    // });

    this.subscribeToStore();
  }

  private handleKeydown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (this._selectedFile) {
        appStore.dispatch({
          type: 'SAVE_FILE',
          payload: { path: this._selectedFile },
        });
      }
    }
  };

  private togglePreview(): void {
    console.log("toggle preview")
    if (this._isPreviewActive && !this._markdownPreview) {
      this._markdownPreview = new MarkdownPreview();
      this._editorContainer.classList.add('split');
      this._rightSide.appendChild(this._markdownPreview);
      this._wrapper.appendChild(this._rightSide);
      if (this._selectedFile) {
        this._markdownPreview.update(this._textarea.value);
      }
    } else if (!this._isPreviewActive && this._markdownPreview) {
      this._markdownPreview.dispose();
      this._markdownPreview = null;
      this._wrapper.removeChild(this._rightSide);
    }
  }

  public closePreview() {
    if (this._isPreviewActive && this._markdownPreview) {
      this._markdownPreview.dispose();
      this._markdownPreview = null;
      this._wrapper.removeChild(this._rightSide);
    }
  }



  private subscribeToStore(): void {
    appStore.subscribe((state) => {
      this._selectedFile = state.selectedFile;
      this._textarea.value = this.getFileContent(state.files, this._selectedFile) || '';
      this._textarea.disabled = !this._selectedFile;
      this._tabBar.setTabs(
        state.openFiles.map(path => ({
          path,
          label: path.split('/').pop() || path,
        })),
        this._selectedFile
      );
      this._breadcrumb.setPath(this._selectedFile);
      if (this._markdownPreview && this._selectedFile) {
        this._markdownPreview.update(this._textarea.value);
      }
    });
  }

  private getFileContent(files: FileItem[], path: string | null): string {
    if (!path || !files) return '';
    for (const item of files) {
      if (item.path === path && !item.isFolder) return item.content || '';
      if (item.isFolder && item.children) {
        const result = this.getFileContent(item.children, path);
        if (result) return result;
      }
    }
    return '';
  }

  disconnectedCallback(): void {
    window.removeEventListener('keydown', this.handleKeydown);
    this._tabBar.dispose();
    this._breadcrumb.dispose();
    if (this._markdownPreview) {
      this._markdownPreview.dispose();
    }
  }
}

customElements.define('code-editor', CodeEditor);
