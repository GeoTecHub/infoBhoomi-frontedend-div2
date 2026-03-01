import { Component, Input, OnChanges, OnInit } from '@angular/core';

@Component({
  selector: 'app-custom-tooltip',
  imports: [],
  template: `
    <div class="tooltip-box">
      @if (owners.length > 0) {
        <ul>
          <li style="list-style: none!important; font-weight: 500; margin-left: -11px;">Owner</li>
          @for (user of owners; track user) {
            <li>{{ user.slice(0, user.length - 7) }}</li>
          }
        </ul>
      }

      @if (owners.length > 0 && others.length > 0) {
        <hr class="divider" />
      }

      @if (others.length > 0) {
        <ul>
          <li style="list-style: none!important; font-weight: 500; margin-left: -11px;">
            Shared Users ({{ others.length }})
          </li>
          @for (user of others; track user) {
            <li>{{ user }}</li>
          }
        </ul>
      }
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
