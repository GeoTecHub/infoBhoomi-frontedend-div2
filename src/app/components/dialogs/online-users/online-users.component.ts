// npx ng g c online-users
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { APIsService } from '../../../services/api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-online-users',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    CommonModule,
    FormsModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './online-users.component.html',
  styleUrl: './online-users.component.css',
})
export class OnlineUsersComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  onlineUsers: any[] = [];
  loading = false;
  private intervalId: any;

  constructor(private apiService: APIsService) {}

  async ngOnInit(): Promise<void> {
    await this.getUsersOverview();
  }

  ngAfterViewInit() {
    this.intervalId = setInterval(() => {
      this.getUsersOverview();
    }, 60000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  getUsersOverview(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.apiService.getUserOverview().subscribe({
        next: (res: any) => {
          this.onlineUsers = res.online_users || [];
          resolve(true);

          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error(err.error.error);
          reject(err);
        },
      });
    });
  }
}
