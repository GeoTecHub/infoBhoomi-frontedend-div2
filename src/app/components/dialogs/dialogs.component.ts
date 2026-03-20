import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dialogs',
  imports: [],
  templateUrl: './dialogs.component.html',
  styleUrl: './dialogs.component.css',
})
export class DialogsComponent {}
