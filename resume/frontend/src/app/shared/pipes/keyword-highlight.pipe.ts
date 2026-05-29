import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'keywordCount', standalone: true })
export class KeywordCountPipe implements PipeTransform {
  transform(keywords: string[] | null | undefined): number {
    return keywords?.length ?? 0;
  }
}
