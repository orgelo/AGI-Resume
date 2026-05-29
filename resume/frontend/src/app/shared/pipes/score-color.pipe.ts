import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'scoreColor', standalone: true })
export class ScoreColorPipe implements PipeTransform {
  transform(score: number | null | undefined): string {
    const s = Number(score ?? 0);
    if (s >= 80) return 'high';
    if (s >= 60) return 'mid';
    return 'low';
  }
}
