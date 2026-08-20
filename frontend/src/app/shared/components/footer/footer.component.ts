import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="mt-auto border-t border-slate-900 bg-slate-950/80 py-8 text-center text-xs text-slate-500">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold">E</div>
          <span class="font-semibold text-slate-300">EventHub</span>
          <span class="text-slate-600">&bull;</span>
          <span>Enterprise Event Discovery & Reservation</span>
        </div>
        <p class="text-slate-500">
          Built with Angular & SignalStore &bull; Strict Typed Contracts &bull; Resilient Refresh Flow
        </p>
      </div>
    </footer>
  `,
})
export class FooterComponent {}
