// src/components/ui/carousel/carousel.ts
import { BaseComponent } from '../../core/base-component';
import { BaseEvent } from '../../core/event-system';
import { CoolImage } from '../../base/image/image';
import { CoolButton } from '../../base/button/button';

interface CarouselItem {
  src: string;
  alt: string;
  caption?: string;
}

interface CarouselOptions {
  items?: CarouselItem[];
}

export class CoolCarousel extends BaseComponent {
  private _items: CarouselItem[];
  private _currentIndex: number;
  private _onChange: BaseEvent<{ index: number }>;
  private _container: HTMLDivElement;
  private _track: HTMLDivElement;
  private _prevButton: CoolButton;
  private _nextButton: CoolButton;

  constructor(options: CarouselOptions = {}) {
    super(options);
    this._items = options.items || [];
    this._currentIndex = 0;
    this._onChange = new BaseEvent<{ index: number }>();

    this.initShadowDom(new URL('./carousel.css', import.meta.url).toString());

    this._container = this.createElement('div', { class: 'mdc-carousel' });
    this._track = this.createElement('div', { class: 'mdc-carousel__track' });
    this._container.appendChild(this._track);

    this._prevButton = new CoolButton({
      title: 'Previous',
      type: 'primary',
      ariaLabel: 'Previous slide',
      supportIcons: true,
      icon: '◄',
      theme: 'carousel',
    });
    this._prevButton.classList.add('mdc-carousel__button--prev');
    this._prevButton.onDidClick.addListener(() => this.prev());

    this._nextButton = new CoolButton({
      title: 'Next',
      type: 'primary',
      ariaLabel: 'Next slide',
      supportIcons: true,
      icon: '►',
      theme: 'carousel',
    });
    this._nextButton.classList.add('mdc-carousel__button--next');
    this._nextButton.onDidClick.addListener(() => this.next());

    this._container.append(this._prevButton, this._track, this._nextButton);

    this._shadow.appendChild(this._container);
    this.render();
  }

  render(): void {
    this._track.innerHTML = '';
    if (this._items.length === 0) return;

    const item = this._items[this._currentIndex];
    const slide = this.createElement('div', { class: 'mdc-carousel__slide' });

    const image = new CoolImage({
      src: item.src,
      alt: item.alt,
      caption: item.caption || '',
      width: '100%',
      height: 'auto',
      style: { objectFit: 'cover' },
    });

    slide.appendChild(image);
    this._track.appendChild(slide);
    this._onChange.dispatch({ index: this._currentIndex });
  }

  prev(): void {
    this._currentIndex = (this._currentIndex - 1 + this._items.length) % this._items.length;
    this.render();
  }

  next(): void {
    this._currentIndex = (this._currentIndex + 1) % this._items.length;
    this.render();
  }

  get onChange(): BaseEvent<{ index: number }> {
    return this._onChange;
  }

  set items(value: CarouselItem[]) {
    this._items = value || [];
    this._currentIndex = 0;
    this.render();
  }
}

customElements.define('cool-carousel', CoolCarousel);