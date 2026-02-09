import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../../../../services/user.service';
import { UserPasswordChangeComponent } from './user-password-change/user-password-change.component';
import { UserUsernameChangeComponent } from './user-username-change/user-username-change.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    CommonModule,
  ],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css',
})
export class UserProfileComponent implements OnInit {
  first_name: string = '';
  last_name: string = '';
  nic: string = '';
  age: number | null = null;
  sex: string = '';
  email: string = '';
  department: string = '';
  position: string = '';
  eid: string = '';
  mobile: string = '';
  username: string = '';

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  private destroy$ = new Subject<void>();

  constructor(
    public dialog: MatDialog,
    private userService: UserService,
  ) {
    this.eid = localStorage.getItem('emp_id') || '';
  }

  ngOnInit(): void {
    this.userService.user$.pipe(takeUntil(this.destroy$)).subscribe((user: any) => {
      if (user) {
        this.username = user.username.replace(/"/g, '') || '';
        this.first_name = user.first_name || '';
        this.last_name = user.last_name || '';
        this.nic = user.nic || '';
        this.age = this.calculateAge();
        this.sex = user.sex || '';
        this.email = user.email || '';
        this.department = user.department || '';
        this.position = user.post || '';
        this.eid = user.emp_id || '';
        this.mobile = user.mobile || '';
      }
    });
  }

  editProfilePic() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      console.log('Selected file:', file);
      // Implement your file upload logic here
    }
  }

  calculateAge(): number {
    const birthdayString = this.userService.getUser()?.birthday;

    if (birthdayString) {
      const birthday = new Date(birthdayString); // Convert the string to a Date object

      // Get the current date
      const currentDate = new Date();

      // Calculate the age
      const age = currentDate.getFullYear() - birthday.getFullYear();
      const month = currentDate.getMonth() - birthday.getMonth();

      // Adjust age if birthday hasn't occurred yet this year
      if (month < 0 || (month === 0 && currentDate.getDate() < birthday.getDate())) {
        return age - 1;
      } else {
        return age;
      }
    } else {
      return 0; // Default if no birthday is set
    }
  }

  // Method to check if the content overflows
  isOverflow(element: HTMLElement): boolean {
    return element.scrollWidth > element.clientWidth;
  }

  changePassword() {
    const dialogRef = this.dialog.open(UserPasswordChangeComponent, {
      minWidth: '380px',
    });

    dialogRef.afterClosed().subscribe((result) => {});
  }

  changeUsername() {
    const dialogRef = this.dialog.open(UserUsernameChangeComponent, {
      minWidth: '380px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.username = this.userService.getUser()?.username.replace(/"/g, '') || '';
    });
  }
}
