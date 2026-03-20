/**
 * @KD-96
 * Abandoned
 */
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
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
