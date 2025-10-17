// src/components/core/store.ts
export interface FileItem {
  name: string;
  path: string;
  isFolder: boolean;
  isOpen?: boolean;
  content?: string;
  children?: FileItem[];
}

interface AppState {
  inputValue: string;
  lastClicked: string;
  theme: 'light' | 'dark';
  files: FileItem[];
  selectedFile: string | null;
  openFiles: Array<string>;
}

interface Action {
  type: string;
  payload?: any;
}

export class Store {
  private state: AppState;
  private listeners: Array<(state: AppState) => void>;
  private reducer: (state: AppState, action: Action) => AppState;
  private channel?: BroadcastChannel; // Made optional to avoid strict initialization error

  constructor(reducer: (state: AppState, action: Action) => AppState, initialState: AppState = {
    inputValue: '',
    lastClicked: '',
    theme: 'light',
    files: [],
    selectedFile: null,
    openFiles: []
  }) {
    this.state = { ...initialState };
    this.listeners = [];
    this.reducer = reducer;

    try {
      this.channel = new BroadcastChannel('app_state');
      this.channel.onmessage = (event: MessageEvent<{ action: Action }>) => {
        const { action } = event.data;
        if (this.isValidAction(action)) {
          this.state = this.reducer(this.state, action);
          this.notify();
        }
      };
    } catch (error) {
      console.error('Failed to initialize BroadcastChannel:', error);
      this.channel = undefined;
    }

    try {
      const savedState = localStorage.getItem('app_state');
      if (savedState) {
        this.state = { ...this.state, ...JSON.parse(savedState) };
      }
    } catch (error) {
      console.error('Failed to load state from localStorage:', error);
    }
  }

  private isValidAction(action: Action): boolean {
    return action && typeof action.type === 'string' && action.type.trim() !== '';
  }

  dispatch(action: Action): void {
    if (!this.isValidAction(action)) {
      console.warn('Invalid action:', action);
      return;
    }
    this.state = this.reducer(this.state, action);
    this.notify();
    try {
      if (this.channel) {
        this.channel.postMessage({ action });
      }
      localStorage.setItem('app_state', JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  getState(): AppState {
    return { ...this.state };
  }

  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_INPUT_VALUE':
      return { ...state, inputValue: action.payload };
    case 'SET_LAST_CLICKED':
      return { ...state, lastClicked: action.payload };
    case 'RESET_STATE':
      return {
        ...state,
        inputValue: '',
        lastClicked: '',
        files: state.files,
      };
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
    case 'SET_FILES':
      return { ...state, files: action.payload };
    case 'SET_SELECTED_FILE':
      return { ...state, selectedFile: action.payload, openFiles: state.openFiles.includes(action.payload) ? state.openFiles : [...state.openFiles, action.payload] };
    case "SET_OPEN_FILES":
      return { ...state, openFiles: action.payload };
    case 'UPDATE_FILE_CONTENT':
      return {
        ...state,
        files: updateFileContent(state.files, action.payload.path, action.payload.content),
      };
    case 'SAVE_FILE':
      console.log(`Saving file: ${action.payload.path}`);
      return state;
    default:
      return state;
  }
}

function updateFileContent(files: FileItem[], path: string, content: string): FileItem[] {
  return files.map((item) => {
    if (item.path === path && !item.isFolder) {
      return { ...item, content };
    } else if (item.isFolder && item.children) {
      return {
        ...item,
        children: updateFileContent(item.children, path, content),
      };
    }
    return item;
  });
}

const initialFiles: FileItem[] = [
  {
    name: 'src',
    path: '/src',
    isFolder: true,
    isOpen: false,
    children: [
      {
        name: 'index.js',
        path: '/src/index.js',
        isFolder: false,
        content: '// Hello, world!',
      },
      {
        name: 'components',
        path: '/src/components',
        isFolder: true,
        isOpen: false,
        children: [
          {
            name: 'app.js',
            path: '/src/components/app.js',
            isFolder: false,
            content: '// App component',
          },
        ],
      },
    ],
  },
  {
    name: 'README.md',
    path: '/README.md',
    isFolder: false,
    content: '# My App',
  },
];

export const appStore = new Store(reducer, {
  inputValue: '',
  lastClicked: '',
  theme: 'light',
  files: initialFiles,
  selectedFile: null,
  openFiles: []
});