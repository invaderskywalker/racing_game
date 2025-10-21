// src/managers/AudioManager.ts
// Simple AudioManager for loading and playing sound effects

export class AudioManager {
  private static instance: AudioManager;
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private assetBasePath = "/audio/";

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  preload(keys: string[]): void {
    keys.forEach(key => {
      const path = this.assetBasePath + key;
      const audio = new Audio(path);
      this.audioCache.set(key, audio);
    });
  }

  play(key: string): void {
    let audio = this.audioCache.get(key);
    if (!audio) {
      audio = new Audio(this.assetBasePath + key);
      this.audioCache.set(key, audio);
    }
    // Reset and play from start for repeated effects
    audio.currentTime = 0;
    audio.play();
  }
}
