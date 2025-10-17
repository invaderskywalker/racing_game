// src/pages/editor.ts
import { BasePage } from '../components/core/base-page';
import { FileExplorer } from '../components/ui/file-explorer/file-explorer';
import { CodeEditor } from '../components/ui/code-editor/code-editor';
import { FileItem } from '../components/core/store';

export class  Editor extends BasePage {
  constructor() {
    super({ show_header: false });

    const splitPane = this.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        minHeight: 'calc(100vh - 64px)',
        gap: '16px',
        marginBottom: '50px',
      },
    });

    const fileExplorer = new FileExplorer();
    const codeEditor = new CodeEditor();

    fileExplorer.onFileSelect.addListener((event: CustomEvent<FileItem>) => {
      console.log("item selected", event.detail)
      if (event?.detail?.name.includes(".md")) {
        // is markdown
      } else {
        // close preview
        codeEditor.closePreview()
      }

    });


    codeEditor.style.flex = '1';

    splitPane.append(fileExplorer, codeEditor);

    this.main.classList.add('editor-page-main');
    this.main.style.background = 'var(--mdc-theme-background)';
    this.main.style.width = '100%';
    this.main.style.boxSizing = 'border-box';

    this.main.append(splitPane);
  }
}

customElements.define('editor-page', Editor);