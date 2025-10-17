// src/pages/team.ts
import { BasePage } from '../components/core/base-page';
import { CoolText } from '../components/base/text/text';
import { CoolImage } from '../components/base/image/image';

interface TeamMember {
  name: string;
  role: string;
  image: string;
}

export class TeamPage extends BasePage {
  constructor() {
    super();
    if (this.header) {
      this.header.appendChild(this.createHeader('🤝 Meet Our Team'));
    }

    // Intro text
    const introText = new CoolText({
      text: 'We are a passionate, diverse group building the future together.',
      textColor: 'var(--mdc-theme-on-surface)',
      textFontSize: '1.05rem',
      ariaLabel: 'Team intro',
    });

    // Team members data
    const teamMembers: TeamMember[] = [
      {
        name: 'Anika Sharma',
        role: 'Product Designer',
        image:
          'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=800',
      },
      {
        name: 'Rahul Mehta',
        role: 'Frontend Engineer',
        image:
          'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=800',
      },
      {
        name: 'Sara Fernandes',
        role: 'Marketing Lead',
        image:
          'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=800',
      },
    ];

    // Grid container for team cards
    const grid = this.createElement('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '24px',
        width: '100%',
        marginTop: '24px',
      },
    });

    // Build cards
    teamMembers.forEach((member) => {
      const card = this.createElement('div', {
        class: 'mdc-card',
        style: {
          padding: '16px',
          borderRadius: '12px',
          textAlign: 'center',
          background: 'var(--mdc-theme-surface)',
          boxShadow: 'var(--mdc-elevation-2)',
        },
      });

      const avatar = new CoolImage({
        src: member.image,
        alt: `${member.name} profile photo`,
        width: '100%',
        height: '180px',
        caption: '',
        style: {
          objectFit: 'cover',
          borderRadius: '8px',
          marginBottom: '12px',
        },
      });

      const name = new CoolText({
        text: member.name,
        textColor: 'var(--mdc-theme-on-surface)',
        textFontSize: '1rem',
      });

      const role = new CoolText({
        text: member.role,
        textColor: '#777',
        textFontSize: '0.85rem',
      });

      card.append(avatar, name, role);
      grid.appendChild(card);
    });

    // Compose content into main
    this.main.classList.add('team-page-main');
    this.main.style.display = 'flex';
    this.main.style.flexDirection = 'column';
    this.main.style.gap = '32px';
    this.main.append(introText, grid);
  }
}

customElements.define('team-page', TeamPage);