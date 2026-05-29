import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'truncate', standalone: true })
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, limit = 80): string {
    if (!value) return '';
    return value.length > limit ? `${value.slice(0, limit)}…` : value;
  }
}
