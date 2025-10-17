// src/pages/home.ts
import { BasePage } from '../components/core/base-page';
import { CoolButton } from '../components/base/button/button';
import { CoolText } from '../components/base/text/text';
import { CoolInput } from '../components/base/input/input';
import { CoolImage } from '../components/base/image/image';
import { appStore } from '../components/core/store';
import { CoolCarousel } from '../components/ui/carousel/carousel';

interface CarouselItem {
  src: string;
  alt: string;
  caption: string;
}

export class HomePage extends BasePage {
  constructor() {
    super();

    // Fix Error 1: Add null check for header
    if (this.header) {
      this.header.appendChild(this.createHeader('🌱 Grow with My App'));
    }

    const carousel = new CoolCarousel({
      items: [
        {
          src: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
          alt: 'Welcome Slide',
          caption: 'Welcome to Our App',
        },
        {
          src: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
          alt: 'Explore Slide',
          caption: 'Explore Our Features',
        },
        {
          src: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80',
          alt: 'Join Slide',
          caption: 'Join Our Community',
        },
      ],
    });

    // Fix Error 2: Correct onChange listener
    carousel.onChange.addListener((event: CustomEvent<{ index: number }>) => {
      const { index } = event.detail;
      const slide = carousel.shadowRoot?.querySelector('cool-image') as CoolImage | null;
      if (slide) {
        // Fix Error 3: Correct onClick listener
        slide.onClick.addListener((e: CustomEvent<{ event: MouseEvent; src: string; alt: string }>) => {
          const { src, alt } = e.detail;
          console.log(`Clicked image: ${src}, alt: ${alt}`);
          alert(`You clicked on slide ${index + 1}: ${alt}`);
        });
      }
    });

    const welcomeText = new CoolText({
      text: 'Experience the future of interaction. Everything you need, right at your fingertips.',
      textColor: 'var(--mdc-theme-on-surface)',
      textFontSize: '1.1rem',
      ariaLabel: 'Welcome text',
    });

    const featureCard = this.createElement('div', {
      class: 'mdc-card',
      style: {
        padding: '16px',
        borderRadius: '12px',
        textAlign: 'center',
        background: 'var(--mdc-theme-surface)',
        boxShadow: 'var(--mdc-elevation-2)',
        marginTop: '24px',
      },
    });

    const featureImage = new CoolImage({
      src: 'https://images.pexels.com/photos/3184287/pexels-photo-3184287.jpeg?auto=compress&cs=tinysrgb&w=800',
      alt: 'Feature Image',
      caption: 'Explore our key feature',
      width: '100%',
      height: '200px',
    });

    const learnMoreBtn = new CoolButton({
      type: 'primary',
      title: 'Learn More',
      ariaLabel: 'Learn More',
    });

    learnMoreBtn.onDidClick.addListener(() => {
      alert('🚀 Redirecting to feature details...');
    });

    featureCard.append(featureImage, learnMoreBtn);

    const interactiveCard = this.createElement('div', {
      class: 'mdc-card',
      style: {
        padding: '24px',
        borderRadius: '16px',
        marginTop: '32px',
        boxShadow: 'var(--mdc-elevation-2)',
        background: 'var(--mdc-theme-surface)',
      },
    });

    const interactionTitle = new CoolText({
      text: 'Start interacting 👇',
      textColor: 'var(--mdc-theme-on-surface)',
      textFontSize: '1rem',
    });

    const description = new CoolText({
      text: 'Ready to get started? Send us your first message below.',
      textColor: '#666',
      textFontSize: '0.9rem',
      ariaLabel: 'Input prompt',
    });

    const input = new CoolInput({
      type: 'text',
      placeholder: 'Enter your message...',
      ariaLabel: 'Text input field',
    });

    const primaryButton = new CoolButton({
      supportIcons: true,
      type: 'primary',
      title: 'Submit',
      ariaLabel: 'Submit action',
      icon: '✅',
    });

    const resetButton = new CoolButton({
      type: 'secondary',
      title: 'Reset',
      ariaLabel: 'Reset form',
    });

    const themeButton = new CoolButton({
      type: 'secondary',
      title: 'Toggle Theme',
      icon: '🌓',
      ariaLabel: 'Toggle theme',
    });

    input.onInput.addListener((e: CustomEvent<InputEvent>) => {
      const target = e.detail.target as HTMLInputElement;
      appStore.dispatch({
        type: 'SET_INPUT_VALUE',
        payload: target.value,
      });
    });

    primaryButton.onDidClick.addListener(() => {
      appStore.dispatch({ type: 'SET_LAST_CLICKED', payload: 'Home Submit' });
      alert('✅ Message submitted!');
    });

    resetButton.onDidClick.addListener(() => {
      appStore.dispatch({ type: 'RESET_STATE' });
    });

    themeButton.onDidClick.addListener(() => {
      appStore.dispatch({ type: 'TOGGLE_THEME' });
      themeButton.icon = themeButton.icon === '🌞' ? '🌙' : '🌞';
    });

    // Fix Error 4: Pass input.inputElement to subscribeToStore
    this.subscribeToStore(description, input.inputElement);

    const interactiveContainer = this.createElement('div', {
      class: 'mdc-card__content',
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      },
    });

    interactiveContainer.append(interactionTitle, description, input, primaryButton, resetButton, themeButton);

    interactiveCard.appendChild(interactiveContainer);

    this.main.classList.add('home-page-main');
    this.main.style.display = 'flex';
    this.main.style.flexDirection = 'column';
    this.main.style.gap = '32px';

    this.main.append(carousel, welcomeText, featureCard, interactiveCard);
  }
}

customElements.define('home-page', HomePage);