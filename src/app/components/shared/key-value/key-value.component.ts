/**
 * @KD-96
 * Abandoned
 */
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-key-value',
  imports: [],
  templateUrl: './key-value.component.html',
  styleUrl: './key-value.component.css',
})
export class KeyValueComponent {
  @Input() key!: string;
  @Input() value!: string | number;
  @Input() editable: boolean = false;
}
