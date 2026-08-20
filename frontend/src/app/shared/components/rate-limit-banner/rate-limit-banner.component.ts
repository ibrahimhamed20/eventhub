import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  effect,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../core/auth/auth.store';

@Component({
  selector: 'app-rate-limit-banner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (remainingSeconds() > 0) {
      <aside
        aria-label="Rate limit alert"
        class="bg-amber-950/80 border-b border-amber-500/30 text-amber-200 px-4 py-3 text-sm flex items-center justify-center gap-3 backdrop-blur shadow-sm animate-pulse"
      >
        <i class="pi pi-exclamation-triangle text-amber-400 text-lg"></i>
        <span>
          <strong>Rate limit reached.</strong> Please wait
          <span class="font-mono font-bold text-white bg-amber-900/80 px-2 py-0.5 rounded border border-amber-600/40">
            {{ remainingSeconds() }}s
          </span>
          before performing this action again.
        </span>
      </aside>
    }
  `,
})
export class RateLimitBannerComponent implements OnDestroy {
  private readonly authStore = inject(AuthStore);
  remainingSeconds = signal<number>(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const cooldown = this.authStore.rateLimitCooldownSec();
      if (cooldown && cooldown > 0) {
        this.startTimer(cooldown);
      }
    });
  }

  private startTimer(seconds: number): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.remainingSeconds.set(seconds);

    this.timer = setInterval(() => {
      const curr = this.remainingSeconds();
      if (curr <= 1) {
        this.remainingSeconds.set(0);
        this.authStore.setRateLimitCooldown(null);
        if (this.timer) clearInterval(this.timer);
      } else {
        this.remainingSeconds.set(curr - 1);
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
