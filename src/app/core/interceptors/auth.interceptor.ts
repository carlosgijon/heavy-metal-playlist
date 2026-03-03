import { HttpInterceptorFn } from '@angular/common/http';

/** Adds the JWT token from localStorage to every outgoing HTTP request. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
