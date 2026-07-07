import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from './api-config';

export const baseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE_URL);
  const url = /^https?:\/\//.test(req.url) ? req.url : `${base}${req.url}`;
  return next(req.clone({ url }));
};
