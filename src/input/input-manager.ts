export type InputAction = string;

export interface ActionMap {
    [action: string]: string[]; // e.g., { moveForward: ['KeyW', 'ArrowUp'] }
}

export const EXTENDED_ACTION_MAP: ActionMap = {
    toggleCamera: ['KeyC'],
    switchPlayer: ['Tab'],
    moveForward: ['KeyW', 'ArrowUp'],
    moveBackward: ['KeyS', 'ArrowDown'],
    moveLeft: ['KeyA', 'ArrowLeft'],
    moveRight: ['KeyD', 'ArrowRight'],
    jump: ['Space'],
    shoot: ['KeyF', 'Mouse0']
};

export class InputManager {
    private pressedKeys: Set<string> = new Set();
    private actionMap: ActionMap;
    private actionPressed: Set<InputAction> = new Set();

    constructor(actionMap: ActionMap = EXTENDED_ACTION_MAP) {
        this.actionMap = actionMap;
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('mouseup', this.onMouseUp);
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

    private onMouseDown = (e: MouseEvent) => {
        // Map left mouse click to Mouse0
        if (e.button === 0) {
            for (const action in this.actionMap) {
                if (this.actionMap[action].includes('Mouse0')) {
                    this.actionPressed.add(action);
                }
            }
        }
    }

    private onMouseUp = (e: MouseEvent) => {
        if (e.button === 0) {
            for (const action in this.actionMap) {
                if (this.actionMap[action].includes('Mouse0')) {
                    this.actionPressed.delete(action);
                }
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
        window.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('mouseup', this.onMouseUp);
    }
}
