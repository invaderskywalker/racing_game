type Listener<T = any> = (payload: T) => void;

export class EventBus {
    private listeners: Map<string, Set<Listener>> = new Map();

    on<T = any>(event: string, listener: Listener<T>): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        (this.listeners.get(event) as Set<Listener<T>>).add(listener);
    }

    off<T = any>(event: string, listener: Listener<T>): void {
        if (this.listeners.has(event)) {
            (this.listeners.get(event) as Set<Listener<T>>).delete(listener);
        }
    }

    emit<T = any>(event: string, payload?: T): void {
        if (this.listeners.has(event)) {
            for (const listener of this.listeners.get(event) as Set<Listener<T>>) {
                listener(payload as T);
            }
        }
    }

    clear(event?: string): void {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
}

export const eventBus = new EventBus();
