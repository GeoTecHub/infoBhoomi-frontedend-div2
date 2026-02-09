import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { APIsService } from '../../../services/api.service';
import { UserService } from '../../../services/user.service';
import { LoaderComponent } from '../../side-panel/loader/loader.component';

@Component({
  selector: 'app-subscription-details',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    CommonModule,
    FormsModule,
    MatTooltipModule,
    MatDividerModule,
    LoaderComponent,
  ],
  templateUrl: './subscription-details.component.html',
  styleUrl: './subscription-details.component.css',
})
export class SubscriptionDetailsComponent implements OnInit {
  loading = false;
  currentPlan = '';
  endsOn = '';
  status = true;
  userLimit = '';

  constructor(
    private apiService: APIsService,
    private cdr: ChangeDetectorRef,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    this.getOrgData();
  }

  getOrgData(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.loading = true;
      this.apiService.getDashboardData().subscribe({
        next: (res: any) => {
          this.currentPlan = res.subscription_plan;
          this.endsOn = res.permit_end_date;
          this.status = res.status;
          this.userLimit = res.users_limit ? res.users_limit : 'Unlimited';

          this.userService.setUserLimit(res.users_limit);
          this.cdr.detectChanges();
          resolve(true);
        },
        error: (err) => reject(err),
      });

      this.loading = false;
    });
  }
}
