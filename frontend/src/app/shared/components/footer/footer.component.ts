import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
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
        <div class="flex items-center gap-4 text-slate-400">
          <a routerLink="/docs" class="hover:text-indigo-400 transition-colors">
            User Guide & Docs
          </a>
          <span class="text-slate-700">&bull;</span>
          <a routerLink="/events" class="hover:text-indigo-400 transition-colors">
            Public Events
          </a>
          <span class="text-slate-700">&bull;</span>
          <a href="http://localhost:3000/docs" target="_blank" rel="noopener noreferrer" class="hover:text-indigo-400 transition-colors">
            Swagger API
          </a>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {}
