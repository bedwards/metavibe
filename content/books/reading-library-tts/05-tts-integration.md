# Text-to-Speech Integration

## The TTS Landscape

Text-to-speech has evolved dramatically. You have several options:

**Browser Native (Web Speech API)**
- Free, works offline
- Quality varies by browser/OS
- Limited voice options
- No commercial licensing concerns

**Cloud Services (Google, AWS, Azure)**
- High quality neural voices
- Pay per character
- Requires internet connection
- Good for batch processing

**Specialized TTS (Speechify, ElevenLabs, PlayHT)**
- Best quality, most natural
- Higher cost
- Premium features (voice cloning, emotional control)
- Often have usage limits

We'll implement browser-native first, then add premium service integration.

## Web Speech API Basics

The Web Speech API is surprisingly capable:

```typescript
// src/services/tts-browser.ts

export interface TTSOptions {
  rate?: number;      // 0.1 to 10, default 1
  pitch?: number;     // 0 to 2, default 1
  volume?: number;    // 0 to 1, default 1
  voice?: string;     // Voice name
}

export class BrowserTTS {
  private synth: SpeechSynthesis;
  private utterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isReady = false;

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();
  }

  private loadVoices(): void {
    // Voices may not be immediately available
    const loadHandler = () => {
      this.voices = this.synth.getVoices();
      this.isReady = true;
    };

    if (this.synth.getVoices().length > 0) {
      loadHandler();
    } else {
      this.synth.addEventListener('voiceschanged', loadHandler, { once: true });
    }
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  /**
   * Get voices filtered by language
   */
  getVoicesByLanguage(lang: string): SpeechSynthesisVoice[] {
    return this.voices.filter((v) => v.lang.startsWith(lang));
  }

  /**
   * Get recommended voice for English
   */
  getRecommendedVoice(): SpeechSynthesisVoice | undefined {
    // Prefer high-quality voices
    const englishVoices = this.getVoicesByLanguage('en');

    // Look for premium voices first
    const premiumKeywords = ['Premium', 'Enhanced', 'Neural', 'Natural'];
    for (const keyword of premiumKeywords) {
      const premium = englishVoices.find((v) =>
        v.name.includes(keyword)
      );
      if (premium) return premium;
    }

    // Fall back to any English voice
    return englishVoices[0];
  }

  /**
   * Speak text
   */
  speak(
    text: string,
    options: TTSOptions = {},
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onPause?: () => void;
      onResume?: () => void;
      onBoundary?: (event: SpeechSynthesisEvent) => void;
      onError?: (error: SpeechSynthesisErrorEvent) => void;
    }
  ): void {
    // Cancel any ongoing speech
    this.stop();

    this.utterance = new SpeechSynthesisUtterance(text);

    // Set options
    this.utterance.rate = options.rate ?? 1;
    this.utterance.pitch = options.pitch ?? 1;
    this.utterance.volume = options.volume ?? 1;

    // Set voice
    if (options.voice) {
      const voice = this.voices.find((v) => v.name === options.voice);
      if (voice) this.utterance.voice = voice;
    } else {
      const recommended = this.getRecommendedVoice();
      if (recommended) this.utterance.voice = recommended;
    }

    // Set callbacks
    if (callbacks?.onStart) this.utterance.onstart = callbacks.onStart;
    if (callbacks?.onEnd) this.utterance.onend = callbacks.onEnd;
    if (callbacks?.onPause) this.utterance.onpause = callbacks.onPause;
    if (callbacks?.onResume) this.utterance.onresume = callbacks.onResume;
    if (callbacks?.onBoundary) this.utterance.onboundary = callbacks.onBoundary;
    if (callbacks?.onError) this.utterance.onerror = callbacks.onError;

    this.synth.speak(this.utterance);
  }

  /**
   * Pause speech
   */
  pause(): void {
    this.synth.pause();
  }

  /**
   * Resume speech
   */
  resume(): void {
    this.synth.resume();
  }

  /**
   * Stop speech
   */
  stop(): void {
    this.synth.cancel();
    this.utterance = null;
  }

  /**
   * Check if speaking
   */
  isSpeaking(): boolean {
    return this.synth.speaking;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.synth.paused;
  }

  /**
   * Check if ready
   */
  isInitialized(): boolean {
    return this.isReady;
  }
}

export const browserTTS = new BrowserTTS();
```

## Chunked Speech for Long Content

The Web Speech API has quirks with long text. Some browsers stop after ~15 seconds. The solution: chunk the text and queue segments.

```typescript
// web/src/services/tts-chunked.ts

interface ChunkedTTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: string;
  chunkSize?: number;  // Characters per chunk
}

interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentChunk: number;
  totalChunks: number;
  progress: number;  // 0-1
}

export class ChunkedTTS {
  private synth: SpeechSynthesis;
  private chunks: string[] = [];
  private currentChunkIndex = 0;
  private options: ChunkedTTSOptions = {};
  private voice: SpeechSynthesisVoice | null = null;
  private isPlaying = false;
  private isPaused = false;
  private onStateChange?: (state: PlaybackState) => void;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  /**
   * Load text for playback
   */
  load(
    text: string,
    options: ChunkedTTSOptions = {},
    onStateChange?: (state: PlaybackState) => void
  ): void {
    this.stop();

    this.options = options;
    this.onStateChange = onStateChange;

    // Split into chunks at sentence boundaries
    this.chunks = this.splitIntoChunks(text, options.chunkSize ?? 500);
    this.currentChunkIndex = 0;

    // Find voice
    const voices = this.synth.getVoices();
    if (options.voice) {
      this.voice = voices.find((v) => v.name === options.voice) ?? null;
    }
    if (!this.voice) {
      // Default to first English voice
      this.voice = voices.find((v) => v.lang.startsWith('en')) ?? null;
    }

    this.emitState();
  }

  /**
   * Split text into chunks at sentence boundaries
   */
  private splitIntoChunks(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];

    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxLength && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Start or resume playback
   */
  play(): void {
    if (this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
      this.emitState();
      return;
    }

    if (this.isPlaying) return;

    this.isPlaying = true;
    this.playCurrentChunk();
  }

  /**
   * Play the current chunk
   */
  private playCurrentChunk(): void {
    if (this.currentChunkIndex >= this.chunks.length) {
      this.isPlaying = false;
      this.emitState();
      return;
    }

    const chunk = this.chunks[this.currentChunkIndex];
    if (!chunk) return;

    const utterance = new SpeechSynthesisUtterance(chunk);

    utterance.rate = this.options.rate ?? 1;
    utterance.pitch = this.options.pitch ?? 1;
    utterance.volume = this.options.volume ?? 1;

    if (this.voice) {
      utterance.voice = this.voice;
    }

    utterance.onend = () => {
      this.currentChunkIndex++;
      this.emitState();

      if (this.isPlaying && !this.isPaused) {
        // Small delay between chunks for natural pacing
        setTimeout(() => this.playCurrentChunk(), 100);
      }
    };

    utterance.onerror = (event) => {
      console.error('TTS error:', event.error);
      this.isPlaying = false;
      this.emitState();
    };

    this.synth.speak(utterance);
    this.emitState();
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.isPlaying) return;
    this.synth.pause();
    this.isPaused = true;
    this.emitState();
  }

  /**
   * Stop playback
   */
  stop(): void {
    this.synth.cancel();
    this.isPlaying = false;
    this.isPaused = false;
    this.currentChunkIndex = 0;
    this.emitState();
  }

  /**
   * Seek to position (0-1)
   */
  seek(position: number): void {
    const wasPlaying = this.isPlaying;
    this.stop();

    this.currentChunkIndex = Math.floor(position * this.chunks.length);
    this.currentChunkIndex = Math.max(
      0,
      Math.min(this.currentChunkIndex, this.chunks.length - 1)
    );

    if (wasPlaying) {
      this.play();
    }

    this.emitState();
  }

  /**
   * Get current state
   */
  getState(): PlaybackState {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentChunk: this.currentChunkIndex,
      totalChunks: this.chunks.length,
      progress:
        this.chunks.length > 0
          ? this.currentChunkIndex / this.chunks.length
          : 0,
    };
  }

  private emitState(): void {
    this.onStateChange?.(this.getState());
  }
}
```

## Audio Player Component

A full-featured audio player UI:

```typescript
// web/src/components/AudioPlayer.ts

import { ChunkedTTS } from '../services/tts-chunked.js';
import { cleanForTts } from '../utils/text-utils.js';

interface AudioPlayerOptions {
  articleId: string;
  text: string;
  onProgressUpdate?: (position: number) => void;
}

export class AudioPlayer {
  private container: HTMLElement;
  private tts: ChunkedTTS;
  private options: AudioPlayerOptions;
  private settings = {
    rate: 1,
    pitch: 1,
    volume: 1,
    voice: '',
  };

  constructor(containerId: string, options: AudioPlayerOptions) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('Container not found');
    this.container = container;
    this.options = options;

    this.tts = new ChunkedTTS();
    this.loadSettings();
    this.render();
    this.initTTS();
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('tts-settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore
    }
  }

  private saveSettings(): void {
    localStorage.setItem('tts-settings', JSON.stringify(this.settings));
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="audio-player">
        <div class="player-progress">
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          <div class="progress-time">
            <span class="time-current">0:00</span>
            <span class="time-total">--:--</span>
          </div>
        </div>

        <div class="player-controls">
          <button class="control-btn" data-action="rewind" title="Back 30s">
            <span>⏪</span>
          </button>
          <button class="control-btn control-play" data-action="play" title="Play">
            <span class="icon-play">▶</span>
            <span class="icon-pause" style="display:none">⏸</span>
          </button>
          <button class="control-btn" data-action="forward" title="Forward 30s">
            <span>⏩</span>
          </button>
          <button class="control-btn" data-action="stop" title="Stop">
            <span>⏹</span>
          </button>
        </div>

        <div class="player-settings">
          <div class="setting-item">
            <label>Speed</label>
            <select data-setting="rate">
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1" selected>1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="1.75">1.75x</option>
              <option value="2">2x</option>
            </select>
          </div>

          <div class="setting-item">
            <label>Voice</label>
            <select data-setting="voice">
              <option value="">Default</option>
            </select>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.populateVoices();
    this.applySettings();
  }

  private setupEventListeners(): void {
    // Control buttons
    this.container.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        if (action === 'play') this.togglePlay();
        if (action === 'stop') this.stop();
        if (action === 'rewind') this.seek(-0.1);
        if (action === 'forward') this.seek(0.1);
      });
    });

    // Settings
    this.container.querySelectorAll('[data-setting]').forEach((select) => {
      select.addEventListener('change', (e) => {
        const setting = select.getAttribute('data-setting');
        const value = (e.target as HTMLSelectElement).value;

        if (setting === 'rate') {
          this.settings.rate = parseFloat(value);
        } else if (setting === 'voice') {
          this.settings.voice = value;
        }

        this.saveSettings();
        this.reinitTTS();
      });
    });

    // Progress bar click
    const progressBar = this.container.querySelector('.progress-bar');
    progressBar?.addEventListener('click', (e) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const position = (e.clientX - rect.left) / rect.width;
      this.tts.seek(position);
    });
  }

  private populateVoices(): void {
    const select = this.container.querySelector(
      '[data-setting="voice"]'
    ) as HTMLSelectElement;
    if (!select) return;

    // Wait for voices to load
    const populateOnce = () => {
      const voices = speechSynthesis.getVoices();
      const englishVoices = voices.filter((v) => v.lang.startsWith('en'));

      select.innerHTML =
        '<option value="">Default</option>' +
        englishVoices
          .map(
            (v) =>
              `<option value="${v.name}">${v.name} (${v.lang})</option>`
          )
          .join('');

      // Restore saved voice
      if (this.settings.voice) {
        select.value = this.settings.voice;
      }
    };

    if (speechSynthesis.getVoices().length > 0) {
      populateOnce();
    } else {
      speechSynthesis.addEventListener('voiceschanged', populateOnce, {
        once: true,
      });
    }
  }

  private applySettings(): void {
    const rateSelect = this.container.querySelector(
      '[data-setting="rate"]'
    ) as HTMLSelectElement;
    if (rateSelect) {
      rateSelect.value = this.settings.rate.toString();
    }
  }

  private initTTS(): void {
    const cleanText = cleanForTts(this.options.text);

    this.tts.load(cleanText, this.settings, (state) => {
      this.updateUI(state);

      // Save progress
      if (state.progress > 0) {
        this.options.onProgressUpdate?.(state.progress);
      }
    });
  }

  private reinitTTS(): void {
    const wasPlaying = this.tts.getState().isPlaying;
    const position = this.tts.getState().progress;

    this.initTTS();

    if (position > 0) {
      this.tts.seek(position);
    }

    if (wasPlaying) {
      this.tts.play();
    }
  }

  private togglePlay(): void {
    const state = this.tts.getState();
    if (state.isPlaying && !state.isPaused) {
      this.tts.pause();
    } else {
      this.tts.play();
    }
  }

  private stop(): void {
    this.tts.stop();
  }

  private seek(delta: number): void {
    const state = this.tts.getState();
    const newPosition = Math.max(0, Math.min(1, state.progress + delta));
    this.tts.seek(newPosition);
  }

  private updateUI(state: { isPlaying: boolean; isPaused: boolean; progress: number }): void {
    // Update play/pause icon
    const playIcon = this.container.querySelector('.icon-play') as HTMLElement;
    const pauseIcon = this.container.querySelector('.icon-pause') as HTMLElement;

    if (playIcon && pauseIcon) {
      playIcon.style.display = state.isPlaying && !state.isPaused ? 'none' : '';
      pauseIcon.style.display = state.isPlaying && !state.isPaused ? '' : 'none';
    }

    // Update progress bar
    const progressFill = this.container.querySelector(
      '.progress-fill'
    ) as HTMLElement;
    if (progressFill) {
      progressFill.style.width = `${state.progress * 100}%`;
    }
  }

  /**
   * Resume from saved position
   */
  resumeFrom(position: number): void {
    this.tts.seek(position);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.tts.stop();
  }
}
```

## Audio Player Styles

```css
/* styles/audio-player.css */

.audio-player {
  background: var(--color-bg-secondary);
  border-radius: 8px;
  padding: var(--space-4);
  margin: var(--space-4) 0;
}

.player-progress {
  margin-bottom: var(--space-4);
}

.progress-bar {
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  cursor: pointer;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-link);
  width: 0;
  transition: width 0.1s;
}

.progress-time {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}

.player-controls {
  display: flex;
  justify-content: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.control-btn {
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: var(--color-text);
  transition: background 0.15s;
}

.control-btn:hover {
  background: var(--color-border);
}

.control-play {
  width: 56px;
  height: 56px;
  background: var(--color-link);
  color: white;
  font-size: 1.5rem;
}

.control-play:hover {
  background: var(--color-link);
  opacity: 0.9;
}

.player-settings {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-4);
}

.setting-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.setting-item label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.setting-item select {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.875rem;
}
```

## Premium TTS Integration (Speechify)

For higher quality, integrate a premium service:

```typescript
// src/services/tts-speechify.ts

interface SpeechifyVoice {
  id: string;
  name: string;
  language: string;
}

interface SpeechifyOptions {
  voiceId: string;
  speed?: number;  // 0.5 to 2.0
}

export class SpeechifyTTS {
  private apiKey: string;
  private baseUrl = 'https://api.sws.speechify.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<SpeechifyVoice[]> {
    const response = await fetch(`${this.baseUrl}/v1/voices`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    const data = await response.json();
    return data.voices;
  }

  /**
   * Generate audio from text
   */
  async generateAudio(
    text: string,
    options: SpeechifyOptions
  ): Promise<ArrayBuffer> {
    const response = await fetch(`${this.baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        voice_id: options.voiceId,
        audio_format: 'mp3',
        speed: options.speed ?? 1.0,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate audio');
    }

    return response.arrayBuffer();
  }

  /**
   * Stream audio generation
   */
  async *streamAudio(
    text: string,
    options: SpeechifyOptions
  ): AsyncGenerator<ArrayBuffer> {
    const response = await fetch(`${this.baseUrl}/v1/audio/speech/stream`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        voice_id: options.voiceId,
        audio_format: 'mp3',
        speed: options.speed ?? 1.0,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Failed to stream audio');
    }

    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield value.buffer;
    }
  }
}
```

## Server-Side TTS Endpoint

Generate and cache audio on the server:

```typescript
// src/api/routes/tts.ts
import { Router } from 'express';
import { queryOne } from '../../db/client.js';
import { cleanForTts } from '../../utils/html-cleaner.js';
import { SpeechifyTTS } from '../../services/tts-speechify.js';
import type { Article } from '../../types/index.js';

export const ttsRouter = Router();

const speechify = process.env.SPEECHIFY_API_KEY
  ? new SpeechifyTTS(process.env.SPEECHIFY_API_KEY)
  : null;

// Get available voices
ttsRouter.get('/voices', async (_req, res, next) => {
  try {
    if (!speechify) {
      // Return browser voices info
      res.json({
        provider: 'browser',
        message: 'Using browser TTS. Configure SPEECHIFY_API_KEY for premium voices.',
      });
      return;
    }

    const voices = await speechify.getVoices();
    res.json({ provider: 'speechify', voices });
  } catch (error) {
    next(error);
  }
});

// Generate audio for article
ttsRouter.post('/:articleId/generate', async (req, res, next) => {
  try {
    if (!speechify) {
      res.status(400).json({
        error: 'Premium TTS not configured. Use browser TTS instead.',
      });
      return;
    }

    const article = await queryOne<Article>(
      'SELECT * FROM articles WHERE id = $1',
      [req.params.articleId]
    );

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    const { voiceId, speed } = req.body;

    // Clean text for TTS
    const text = cleanForTts(article.textContent);

    // Generate audio
    const audio = await speechify.generateAudio(text, {
      voiceId: voiceId ?? 'default',
      speed: speed ?? 1.0,
    });

    // Set headers for audio download
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${article.id}.mp3"`
    );

    res.send(Buffer.from(audio));
  } catch (error) {
    next(error);
  }
});

// Stream audio
ttsRouter.get('/:articleId/stream', async (req, res, next) => {
  try {
    if (!speechify) {
      res.status(400).json({
        error: 'Premium TTS not configured',
      });
      return;
    }

    const article = await queryOne<Article>(
      'SELECT * FROM articles WHERE id = $1',
      [req.params.articleId]
    );

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    const voiceId = req.query.voiceId as string ?? 'default';
    const speed = parseFloat(req.query.speed as string ?? '1');

    const text = cleanForTts(article.textContent);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of speechify.streamAudio(text, { voiceId, speed })) {
      res.write(Buffer.from(chunk));
    }

    res.end();
  } catch (error) {
    next(error);
  }
});
```

## Hybrid TTS: Browser + Premium

Use browser TTS as fallback, premium when available:

```typescript
// web/src/services/tts-hybrid.ts

import { ChunkedTTS } from './tts-chunked.js';

interface HybridTTSOptions {
  preferPremium?: boolean;
  browserRate?: number;
  premiumVoiceId?: string;
}

export class HybridTTS {
  private browserTTS: ChunkedTTS;
  private premiumAvailable = false;

  constructor() {
    this.browserTTS = new ChunkedTTS();
    this.checkPremiumAvailability();
  }

  private async checkPremiumAvailability(): Promise<void> {
    try {
      const response = await fetch('/api/tts/voices');
      const data = await response.json();
      this.premiumAvailable = data.provider === 'speechify';
    } catch {
      this.premiumAvailable = false;
    }
  }

  /**
   * Play article audio
   */
  async play(
    articleId: string,
    text: string,
    options: HybridTTSOptions = {}
  ): Promise<void> {
    if (options.preferPremium && this.premiumAvailable) {
      await this.playPremium(articleId, options);
    } else {
      this.playBrowser(text, options);
    }
  }

  private playBrowser(text: string, options: HybridTTSOptions): void {
    this.browserTTS.load(
      text,
      { rate: options.browserRate ?? 1 },
      () => {}
    );
    this.browserTTS.play();
  }

  private async playPremium(
    articleId: string,
    options: HybridTTSOptions
  ): Promise<void> {
    const params = new URLSearchParams();
    if (options.premiumVoiceId) params.set('voiceId', options.premiumVoiceId);

    const audio = new Audio(`/api/tts/${articleId}/stream?${params}`);
    audio.play();
  }

  /**
   * Check if premium TTS is available
   */
  isPremiumAvailable(): boolean {
    return this.premiumAvailable;
  }
}
```

## Next Steps

With TTS integration complete, the next chapter covers organization—tagging, reading lists, and search to manage a growing library.
