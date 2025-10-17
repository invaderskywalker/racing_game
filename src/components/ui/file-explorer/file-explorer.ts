// src/components/ui/file-explorer/file-explorer.ts
import { BaseComponent } from '../../core/base-component';
import { appStore } from '../../core/store';
import { BaseEvent } from '../../core/event-system';
import { FileItem } from '../../core/store';

export class FileExplorer extends BaseComponent {
  private _onFileSelect: BaseEvent<FileItem>;
  private _container: HTMLDivElement;
  private _files: FileItem[] = [];
  private _selectedFile: string | null = null;

  constructor() {
    super();
    this._onFileSelect = new BaseEvent<FileItem>();
    this.initShadowDom(new URL('./file-explorer.css', import.meta.url).toString());

    const wrapper = this.createElement('div', { class: 'file-explorer-wrapper' });
    this.createUI(wrapper); // Pass the wrapper
    this._container = this.createElement('div', { class: 'file-explorer' });

    wrapper.appendChild(this._container);
    this._shadow.appendChild(wrapper);

    this.subscribeToStore();
    this.render();
  }

  private createUI(parent: HTMLElement) {
    const addFolderBtn = this.createElement('div', {
      class: 'file-explorer__add-folder',
    }, '+ New Folder');

    addFolderBtn.addEventListener('click', () => {
      const name = prompt('Folder name:');
      if (name) {
        this.addNewFolder(name);
      }
    });

    const addFileButton = this.createElement('div', {
      class: 'file-explorer__add-folder',
    }, '+ New File');

    addFileButton.addEventListener('click', () => {
      const name = prompt('Folder name:');
      if (name) {
        this.addNewFile(name);
      }
    });

    const buttonGroup = this.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'row',
        gap: '8px',
        // marginBottom: '12px',
      }
    });

    buttonGroup.appendChild(addFileButton);
    buttonGroup.appendChild(addFolderBtn);
    parent.appendChild(buttonGroup);
  }

  private subscribeToStore(): void {
    appStore.subscribe((state) => {
      this._files = state.files;
      this._selectedFile = state.selectedFile;
      this.render();
    });
  }

  private render(): void {
    this._container.innerHTML = '';
    this.renderFiles(this._files, this._container);
  }

  private renderFiles(files: FileItem[], parentElement: HTMLElement, parentPath: string = ''): void {
    files.forEach((item) => {
      const fileItem = this.createElement('div', {
        class: `file-item ${item.isFolder ? 'file-item--folder' : ''} ${this._selectedFile === item.path ? 'file-item--selected' : ''
          }`,
      });


      fileItem.setAttribute('draggable', 'true');

      fileItem.addEventListener('dragstart', (e: DragEvent) => {
        e.dataTransfer?.setData('text/plain', item.path);
        e.stopPropagation();
      });

      fileItem.addEventListener('dragover', (e: DragEvent) => {
        if (item.isFolder) {
          e.preventDefault();
        }
      });

      fileItem.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault();
        fileItem.classList.remove('file-item--drop-target');
        const sourcePath = e.dataTransfer?.getData('text/plain');
        if (item.isFolder && sourcePath && sourcePath !== item.path) {
          this.moveFile(sourcePath, item.path);
        }
      });

      fileItem.addEventListener('dragenter', (e) => {
        if (item.isFolder) fileItem.classList.add('file-item--drop-target');
      });

      fileItem.addEventListener('dragleave', (e) => {
        fileItem.classList.remove('file-item--drop-target');
      });

      const icon = this.createElement(
        'span',
        { class: 'file-item__icon' },
        item.isFolder ? (item.isOpen ? '📂' : '📁') : '📄'
      );

      const name = this.createElement('span', { class: 'file-item__name' }, item.name);
      fileItem.append(icon, name);

      fileItem.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        if (item.isFolder) {
          this.toggleFolder(item);
        } else {
          appStore.dispatch({ type: 'SET_SELECTED_FILE', payload: item.path });
          this._onFileSelect.dispatch(item);
        }
      });

      const deleteBtn = this.createElement('div', {
        class: 'file-item__delete',
        title: 'Delete',
      }, '🗑️');

      deleteBtn.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation(); // Don’t trigger select
        this.deleteFile(item.path);
      });

      fileItem.appendChild(deleteBtn);
      parentElement.appendChild(fileItem);

      if (item.isFolder && item.isOpen && item.children) {
        const childrenContainer = this.createElement('div', {
          class: 'file-item__children',
        });
        this.renderFiles(item.children, childrenContainer, item.path);
        parentElement.appendChild(childrenContainer);
      }
    });
  }

  private addNewFolder(name: string): void {
    const newFolder: FileItem = {
      name,
      path: `/${name}`, // Flat for now, or generate nested if needed
      isFolder: true,
      isOpen: false,
      children: [],
    };

    const updated = [...this._files, newFolder];
    appStore.dispatch({ type: 'SET_FILES', payload: updated });
  }


  private addNewFile(name: string): void {
    const newFile: FileItem = {
      name,
      path: `/${name}`,
      isFolder: false,
      isOpen: false,
      children: [],
    };

    const updated = [...this._files, newFile];
    appStore.dispatch({ type: 'SET_FILES', payload: updated });
  }


  private toggleFolder(item: FileItem): void {
    const updatedFiles = this._files.map((file) => {
      if (file.path === item.path) {
        return { ...file, isOpen: !file.isOpen };
      } else if (file.isFolder && file.children) {
        return {
          ...file,
          children: this.toggleFolderInChildren(file.children, item),
        };
      }
      return file;
    });
    appStore.dispatch({ type: 'SET_FILES', payload: updatedFiles });
  }

  private toggleFolderInChildren(children: FileItem[], target: FileItem): FileItem[] {
    return children.map((child) => {
      if (child.path === target.path) {
        return { ...child, isOpen: !child.isOpen };
      } else if (child.isFolder && child.children) {
        return {
          ...child,
          children: this.toggleFolderInChildren(child.children, target),
        };
      }
      return child;
    });
  }

  private deleteFile(pathToDelete: string): void {
    const deleteRecursive = (items: FileItem[]): FileItem[] => {
      return items
        .filter(item => item.path !== pathToDelete)
        .map(item => {
          if (item.isFolder && item.children) {
            return {
              ...item,
              children: deleteRecursive(item.children),
            };
          }
          return item;
        });
    };

    const updated = deleteRecursive(this._files);
    appStore.dispatch({ type: 'SET_FILES', payload: updated });
  }


  private moveFile(sourcePath: string, targetFolderPath: string): void {
    const moveRecursive = (items: FileItem[]): [FileItem[], FileItem | null] => {
      let movedItem: FileItem | null = null;
      const updated = items.filter((item) => {
        if (item.path === sourcePath) {
          movedItem = item;
          return false; // remove it
        } else if (item.isFolder && item.children) {
          const [newChildren, found] = moveRecursive(item.children);
          item.children = newChildren;
          if (found) movedItem = found;
        }
        return true;
      });
      return [updated, movedItem];
    };

    const insertInto = (items: FileItem[]): void => {
      items.forEach((item) => {
        if (item.path === targetFolderPath && item.isFolder) {
          item.children = item.children || [];
          if (movedItem) {
            // update path and children's paths
            const updatePath = (node: FileItem, base: string): FileItem => {
              const newPath = `${base}/${node.name}`;
              const updated = { ...node, path: newPath };
              if (updated.children) {
                updated.children = updated.children.map((c) => updatePath(c, newPath));
              }
              return updated;
            };
            const updatedItem = updatePath(movedItem, item.path);
            item.children.push(updatedItem);
          }
        } else if (item.isFolder && item.children) {
          insertInto(item.children);
        }
      });
    };

    let movedItem: FileItem | null = null;
    const [withoutItem, found] = moveRecursive([...this._files]);
    movedItem = found;

    if (movedItem) {
      insertInto(withoutItem);
      appStore.dispatch({ type: 'SET_FILES', payload: withoutItem });
    }
  }


  get onFileSelect(): BaseEvent<FileItem> {
    return this._onFileSelect;
  }
}

customElements.define('file-explorer', FileExplorer);