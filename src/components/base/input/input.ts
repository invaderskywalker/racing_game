// src/components/base/input/input.ts
import { BaseComponent } from '../../core/base-component';
import { BaseEvent } from '../../core/event-system';

interface InputOptions {
  type?: string;
  placeholder?: string;
  ariaLabel?: string;
}

export class CoolInput extends BaseComponent {
  private _onInput: BaseEvent<InputEvent>;
  private _input: HTMLInputElement;

  constructor(options: InputOptions = {}) {
    super(options);
    this._onInput = new BaseEvent<InputEvent>();

    const {
      type = 'text',
      placeholder = '',
      ariaLabel = 'Text input',
    } = options;

    this.initShadowDom(new URL('./input.css', import.meta.url).toString());

    this._input = this.createElement('input', {
      type,
      placeholder,
      'aria-label': ariaLabel,
    });

    this._input.addEventListener('input', (event: Event) => {
      this._onInput.dispatch(event as InputEvent);
    });

    this._shadow.appendChild(this._input);
  }

  get onInput(): BaseEvent<InputEvent> {
    return this._onInput;
  }

  get value(): string {
    return this._input.value;
  }

  set value(value: string) {
    this._input.value = value;
  }

  // Add getter for the internal input element
  get inputElement(): HTMLInputElement {
    return this._input;
  }
}

customElements.define('cool-input', CoolInput);