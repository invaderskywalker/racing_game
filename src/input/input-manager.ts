export type InputAction = string;

export interface ActionMap {
    [action: string]: string[]; // e.g., { moveForward: ['KeyW', 'ArrowUp'] }
}

export class InputManager {
    private pressedKeys: Set<string> = new Set();
    private actionMap: ActionMap;
    private actionPressed: Set<InputAction> = new Set();

    constructor(actionMap: ActionMap = {}) {
        this.actionMap = actionMap;
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    }

    private onKeyDown = (e: KeyboardEvent) => {
        this.pressedKeys.add(e.code);
        for (const action in this.actionMap) {
            if (this.actionMap[action].includes(e.code)) {
                this.actionPressed.add(action);
            }
        }
    }

    private onKeyUp = (e: KeyboardEvent) => {
        this.pressedKeys.delete(e.code);
        for (const action in this.actionMap) {
            if (this.actionMap[action].includes(e.code)) {
                this.actionPressed.delete(action);
            }
        }
    }

    public isKeyPressed(code: string): boolean {
        return this.pressedKeys.has(code);
    }

    public isActionActive(action: InputAction): boolean {
        return this.actionPressed.has(action);
    }

    public get pressed(): ReadonlySet<string> {
        return this.pressedKeys;
    }

    public destroy() {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    }
}
