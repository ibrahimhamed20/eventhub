import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'centsToDollars',
  standalone: true,
})
export class CentsToDollarsPipe implements PipeTransform {
  transform(cents: number | null | undefined, showFree = true): string {
    if (cents === null || cents === undefined) {
      return '$0.00';
    }
    if (cents === 0 && showFree) {
      return 'Free';
    }
    const dollars = (cents / 100).toFixed(2);
    return `$${dollars}`;
  }
}
