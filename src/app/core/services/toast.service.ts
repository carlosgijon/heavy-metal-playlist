import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private container: HTMLElement | null = null;

  success(message: string, _title?: string): void {
    this.show(message, 'alert-success');
  }

  danger(message: string, _title?: string): void {
    this.show(message, 'alert-error');
  }

  warning(message: string, _title?: string): void {
    this.show(message, 'alert-warning');
  }

  info(message: string, _title?: string): void {
    this.show(message, 'alert-info');
  }

  private show(message: string, type: string): void {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast toast-end fixed z-[9999]';
      document.body.appendChild(this.container);
    }
    const alert = document.createElement('div');
    alert.className = `alert ${type} text-sm py-2 px-4 min-w-[200px] max-w-sm`;
    alert.textContent = message;
    this.container.appendChild(alert);
    setTimeout(() => {
      alert.remove();
    }, 3500);
  }
}
