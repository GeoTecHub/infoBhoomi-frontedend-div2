import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sortByDatePipe',
  standalone: true,
})
export class SortByDatePipePipe implements PipeTransform {
  transform(value: any[], field: string, direction: string = 'desc'): any[] {
    if (!value || !field) {
      return value;
    }

    const sortedData = value.sort((a, b) => {
      const dateA = new Date(a[field]);
      const dateB = new Date(b[field]);

      if (direction === 'desc') {
        return dateB.getTime() - dateA.getTime(); // Descending order
      } else {
        return dateA.getTime() - dateB.getTime(); // Ascending order
      }
    });

    return sortedData;
  }
}
