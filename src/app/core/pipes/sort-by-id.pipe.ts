import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sortById',
  standalone: true,
})
export class SortByIdPipe implements PipeTransform {
  transform(value: any[], field: string, direction: string = 'desc'): any[] {
    if (!value || !field) {
      return value;
    }

    const sortedData = value.sort((a, b) => {
      const valA = a[field];
      const valB = b[field];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return direction === 'desc'
          ? valB.localeCompare(valA) // For string values, descending order
          : valA.localeCompare(valB); // For ascending order
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        return direction === 'desc'
          ? valB - valA // For numeric values, descending order
          : valA - valB; // For ascending order
      } else {
        return 0; // If the values are not comparable, return 0
      }
    });

    return sortedData;
  }
}
