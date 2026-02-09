import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sortArray',
  standalone: true,
})
export class SortArrayPipe implements PipeTransform {
  transform(array: any[], key: string): any[] {
    if (!array || !key) {
      return array;
    }
    return array.sort((a, b) => a[key].localeCompare(b[key]));
  }
}
