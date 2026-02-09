import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userService = inject(UserService);
  private currentUserSubject = new BehaviorSubject<any>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {}

  private getUserFromStorage(): any | null {
    const user = this.userService.getUser();
    if (!user) {
      return null;
    }
    const userId = user.user_id || null;
    const userName = user.username || '';
    // Check if essential info exists
    if (userId) {
      return { id: Number(userId), name: userName }; // Return structured object
    }
    return null;
  }

  // Method to get current user ID synchronously (use with caution - reactive is better)
  getCurrentUserId(): number | null {
    const user = this.currentUserSubject.value;
    return user ? user.id : null;
  }

  getCurrentUsername(): string | null {
    const user = this.currentUserSubject.value;
    return user ? user.name : null;
  }
}
