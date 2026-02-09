import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface UserDetails {
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  mobile: string;
  address: string;
  nic: string;
  birthday: string;
  sex: string;
  org_id: number;
  department: string;
  post: string;
  is_active: boolean;
  user_type: string;
  emp_id: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private userSubject = new BehaviorSubject<UserDetails | null>(null);

  user$: Observable<UserDetails | null> = this.userSubject.asObservable();

  private orgUserLimitSubject = new BehaviorSubject<number | null>(null);
  orgUserLimit$: Observable<number | null> = this.orgUserLimitSubject.asObservable();

  setUser(user: UserDetails) {
    this.userSubject.next(user);
  }

  clearUser() {
    this.userSubject.next(null);
  }

  getUser(): UserDetails | null {
    return this.userSubject.value;
  }

  setUserLimit(e: number) {
    this.orgUserLimitSubject.next(e);
  }

  getUserLimit(): number | null {
    return this.orgUserLimitSubject.value;
  }
}
