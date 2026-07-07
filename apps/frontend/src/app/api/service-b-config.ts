import { InjectionToken } from '@angular/core';

export const SERVICE_B_URL = new InjectionToken<string>('SERVICE_B_URL', {
  providedIn: 'root',
  factory: () => 'http://localhost:3002',
});
