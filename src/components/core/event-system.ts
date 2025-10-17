// src/components/core/event-system.ts
export class BaseEvent<T = any> extends EventTarget {
  addListener(callback: (event: CustomEvent<T>) => void): void {
    this.addEventListener('event', callback as EventListener);
  }

  dispatch(data: T): void {
    this.dispatchEvent(new CustomEvent('event', { detail: data }));
  }
}