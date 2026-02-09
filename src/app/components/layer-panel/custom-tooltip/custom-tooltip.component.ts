import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit } from '@angular/core';

@Component({
  selector: 'app-custom-tooltip',
  imports: [CommonModule],
  template: `
    <div class="tooltip-box">
      <ul *ngIf="owners.length > 0">
        <li style="list-style: none!important; font-weight: 500; margin-left: -11px;">Owner</li>
        <li *ngFor="let user of owners">{{ user.slice(0, user.length - 7) }}</li>
      </ul>

      <hr *ngIf="owners.length > 0 && others.length > 0" class="divider" />

      <ul *ngIf="others.length > 0">
        <li style="list-style: none!important; font-weight: 500; margin-left: -11px;">
          Shared Users ({{ others.length }})
        </li>
        <li *ngFor="let user of others">{{ user }}</li>
      </ul>
    </div>
  `,
  styles: [
    `
      .tooltip-box {
        position: absolute;
        transform: translateY(-100%) translateX(-115%);
        margin-right: 8px;
        background: #333;
        color: #fff;
        padding: 8px 12px;
        border-radius: 7px;
        font-size: 13px;
        z-index: 1000;
        white-space: nowrap;
      }
      ul {
        margin: 0;
        padding-left: 16px;
      }
      li {
        list-style: disc;
      }
      .divider {
        border: none;
        border-top: 1px solid #fff;
        margin: 4px 0;
      }
    `,
  ],
  standalone: true,
})
export class CustomTooltipComponent implements OnInit {
  @Input() users: string[] = [];

  owners: string[] = [];
  others: string[] = [];

  ngOnInit(): void {
    if (this.users) {
      this.owners = this.users.filter((u) => u.toLowerCase().includes('owner'));
      this.others = this.users.filter((u) => !u.toLowerCase().includes('owner'));
    }
  }
}
