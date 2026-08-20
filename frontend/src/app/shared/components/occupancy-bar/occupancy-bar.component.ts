import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-occupancy-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full">
      @if (showLabels()) {
        <div class="flex justify-between items-center text-xs font-medium mb-1 text-slate-400">
          <span>{{ seatsTaken() }} / {{ capacity() }} booked</span>
          <span [ngClass]="textColorClass()">{{ percentage() }}%</span>
        </div>
      }
      <div
        class="w-full bg-slate-800 rounded-full overflow-hidden h-2 relative"
        role="progressbar"
        [attr.aria-valuenow]="percentage()"
        aria-valuemin="0"
        aria-valuemax="100"
        [attr.aria-label]="'Occupancy: ' + percentage() + '%'"
      >
        <div
          class="h-full rounded-full transition-all duration-500 ease-out"
          [ngClass]="barColorClass()"
          [style.width.%]="clampedPercentage()"
        ></div>
      </div>
    </div>
  `,
})
export class OccupancyBarComponent {
  capacity = input.required<number>();
  seatsTaken = input.required<number>();
  showLabels = input<boolean>(true);

  percentage = computed(() => {
    const cap = this.capacity();
    if (cap <= 0) return 0;
    const rate = Math.round((this.seatsTaken() / cap) * 100);
    return Math.max(0, rate);
  });

  clampedPercentage = computed(() => {
    return Math.min(100, this.percentage());
  });

  barColorClass = computed(() => {
    const p = this.percentage();
    if (p >= 100) return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
    if (p >= 80) return 'bg-amber-500';
    if (p >= 50) return 'bg-indigo-500';
    return 'bg-emerald-500';
  });

  textColorClass = computed(() => {
    const p = this.percentage();
    if (p >= 100) return 'text-rose-400 font-semibold';
    if (p >= 80) return 'text-amber-400 font-semibold';
    if (p >= 50) return 'text-indigo-400';
    return 'text-emerald-400';
  });
}
