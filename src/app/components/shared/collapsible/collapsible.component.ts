import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-collapsible',
  imports: [],
  templateUrl: './collapsible.component.html',
  styleUrl: './collapsible.component.css',
})
export class CollapsibleComponent {
  @Input() title: string = '';
  @Input() uniqueId: string = '';
  @Input() expanded: boolean = false; // <-- Make sure this line exists and uses @Input()
}
