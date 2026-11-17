import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  await auth.whenReady();
  return auth.session() ? true : inject(Router).parseUrl('/login');
};

export const loginGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  await auth.whenReady();
  return auth.session() ? inject(Router).parseUrl('/') : true;
};
