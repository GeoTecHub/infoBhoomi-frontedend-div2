import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SidebarControlService {
  private isClosedSubject = new BehaviorSubject<boolean>(false);
  isClosed$ = this.isClosedSubject.asObservable();

  toggleSidebar() {
    this.isClosedSubject.next(!this.isClosedSubject.value);
  }

  setSidebarState(state: boolean) {
    this.isClosedSubject.next(state);
  }
}
