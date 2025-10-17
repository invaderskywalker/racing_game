import { CoolButton } from "../components/base/button/button";
import { CoolText } from "../components/base/text/text";
import { BasePage } from "../components/core/base-page";

export class TimeTracker extends BasePage {
  private timerText: CoolText;
  private startStopButton: CoolButton;
  private resetButton: CoolButton;
  private isRunning: boolean = false;
  private timerInterval: number | null = null;

  constructor() {
    super({ show_header: false });

    const mainPage = this.createElement('div', {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        padding: '20px',
      },
    });

    // Timer display
    this.timerText = new CoolText({
      text: '00:00',
      textColor: '#333',
      textFontSize: '48px',
      ariaLabel: 'Stopwatch timer',
    });

    // Start/Stop button
    this.startStopButton = new CoolButton({
      title: 'Start',
      theme: 'neon',
      type: 'primary',
      ariaLabel: 'Start or stop the stopwatch',
    });
    this.startStopButton.setAttribute('tabindex', '-1');

    // Reset button
    this.resetButton = new CoolButton({
      title: 'Reset',
      theme: 'neon',
      type: 'secondary',
      ariaLabel: 'Reset the stopwatch',
    });

    // Append elements
    mainPage.append(this.timerText, this.startStopButton, this.resetButton);
    this.main.classList.add('time-tracker-main-page');
    this.main.append(mainPage);

    // Bind button events using addListener
    this.startStopButton.onDidClick.addListener((event: CustomEvent<MouseEvent>) => {
      this.handleStartStop();
    });

    this.resetButton.onDidClick.addListener((event: CustomEvent<MouseEvent>) => {
      this.handleReset();
    });

    // Initialize timer display after Wails runtime is ready
    this.waitForBackend().then(() => this.updateTimerDisplay());
  }

  // Wait for Wails backend to be ready
  private waitForBackend(): Promise<void> {
    return new Promise((resolve) => {
      if ((window as any).backend?.App) {
        resolve();
      } else {
        window.addEventListener('wails:loaded', () => resolve(), { once: true });
        // Fallback: retry after a short delay if event doesn't fire
        setTimeout(resolve, 1000);
      }
    });
  }

  private async handleStartStop() {
    try {
      await this.waitForBackend(); // Ensure backend is ready
      const result = this.isRunning
        ? await (window as any).backend.App.StopStopwatch()
        : await (window as any).backend.App.StartStopwatch();

      if (result !== "") {
        throw new Error(result);
      }

      if (this.isRunning) {
        // Stop the stopwatch
        this.isRunning = false;
        this.startStopButton.label = 'Start';
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }
      } else {
        // Start the stopwatch
        this.isRunning = true;
        this.startStopButton.label = 'Stop';
        // Poll backend for elapsed time every second
        this.timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);
      }
    } catch (error) {
      console.error('Error handling start/stop:', error);
      this.timerText.text = 'Error';
    }
  }

  private async handleReset() {
    try {
      await this.waitForBackend(); // Ensure backend is ready
      const result = await (window as any).backend.App.ResetStopwatch();
      if (result !== "") {
        throw new Error(result);
      }
      this.isRunning = false;
      this.startStopButton.label = 'Start';
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      await this.updateTimerDisplay();
    } catch (error) {
      console.error('Error resetting stopwatch:', error);
      this.timerText.text = 'Error';
    }
  }

  private async updateTimerDisplay() {
    try {
      await this.waitForBackend(); // Ensure backend is ready
      const elapsedSeconds = await (window as any).backend.App.GetStopwatchTime();
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      this.timerText.text = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error updating timer display:', error);
      this.timerText.text = 'Error';
    }
  }
}

customElements.define('time-tracker-page', TimeTracker);