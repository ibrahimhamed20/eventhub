import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormGroup } from '@angular/forms';
import { ApiErrorResponse, ValidationErrorDetail } from '../models/api.model';

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  /**
   * Parses standard backend error envelope
   */
  parseApiError(error: unknown): ApiErrorResponse['error'] {
    if (error instanceof HttpErrorResponse) {
      if (error.error && typeof error.error === 'object' && 'error' in error.error) {
        return (error.error as ApiErrorResponse).error;
      }
      return {
        message: error.statusText || 'An unexpected error occurred',
        code: 'INTERNAL',
      };
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return {
        message: (error as { message: string }).message,
        code: 'INTERNAL',
      };
    }
    return {
      message: 'A network error occurred. Please check your connection.',
      code: 'INTERNAL',
    };
  }

  /**
   * Maps server-side Zod VALIDATION_ERROR details directly onto Angular reactive form controls
   */
  mapValidationErrorsToForm(form: FormGroup, details?: unknown): void {
    if (!Array.isArray(details)) return;

    for (const item of details as ValidationErrorDetail[]) {
      if (item.path && item.path.length > 0) {
        const fieldName = String(item.path[0]);
        const control = form.get(fieldName);
        if (control) {
          control.setErrors({
            serverError: item.message,
          });
          control.markAsTouched();
        }
      }
    }
  }

  /**
   * Returns a user-friendly action message corresponding to error codes
   */
  getUserFacingMessage(error: unknown): string {
    const parsed = this.parseApiError(error);

    switch (parsed.code) {
      case 'VALIDATION_ERROR':
        return 'Please review the highlighted fields in the form.';
      case 'UNAUTHENTICATED':
        return 'Your session has expired. Please sign in again.';
      case 'FORBIDDEN':
        return "You don't have permission to perform this action.";
      case 'NOT_FOUND':
        return parsed.message || 'The requested resource was not found.';
      case 'CONFLICT':
        return parsed.message || 'The request could not be completed due to a conflict.';
      case 'SOLD_OUT':
        return parsed.message || 'Sorry, this event is sold out.';
      case 'RATE_LIMITED':
        return parsed.message || 'Too many requests. Please wait a moment before trying again.';
      default:
        return parsed.message || 'An unexpected error occurred.';
    }
  }
}
