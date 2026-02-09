/**
 * @description: custome button style
 */

// custom-buttons.component.ts

import { RouterLink } from '@angular/router'; // Import RouterLink if using internal routes
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatRipple } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-custom-buttons',
  imports: [CommonModule, MatRipple, MatIconModule],
  templateUrl: './custom-buttons.component.html',
  styleUrl: './custom-buttons.component.css',
})
export class CustomButtonsComponent {
  @Input() buttonText: string | null = null;
  @Input() buttonIcon: string | null = null;
  @Input() buttonType: string = 'button'; // Type (e.g., submit, button)
  @Input() buttonStyle: string = 'primary'; // Style type (e.g., primary, secondary, danger)
  @Input() disabled: boolean = false; // Disable button
  @Input() isDeactivated: boolean = false;
  @Input() isSmall: boolean = false;
  @Output() buttonClick = new EventEmitter<void>(); // Click event
  // *** ADD THIS INPUT ***
  @Input() link: string | null = null; // Accept a string URL or null
  // *** ADD THIS INPUT (Optional but recommended for external links) ***
  @Input() target: string = '_self'; // Default to same tab, use '_blank' for new tab

  onClick() {
    if (!this.disabled && !this.isDeactivated) {
      this.buttonClick.emit(); // Emit click event if not disabled
    }

    if (!this.isDeactivated && !this.link) {
      // Only emit if not disabled AND not a link
      this.buttonClick.emit();
    }
  }
}
