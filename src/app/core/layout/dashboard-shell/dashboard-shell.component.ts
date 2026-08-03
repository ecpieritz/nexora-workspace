import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthSessionService } from '@features/auth/data-access/auth-session.service';
import { BrandComponent } from '@shared/components/brand/brand.component';

interface NavigationItem {
  label: string;
  route: string;
  icon: 'dashboard' | 'analytics' | 'invoice' | 'schedule' | 'calendar' | 'messages' | 'settings';
  badge?: number;
}

@Component({
  selector: 'app-dashboard-shell',
  imports: [BrandComponent, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard-shell.component.html',
  styleUrl: './dashboard-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeNavigation()',
  },
})
export class DashboardShellComponent {
  private readonly router = inject(Router);
  protected readonly session = inject(AuthSessionService);

  protected readonly navigationOpen = signal(false);
  protected readonly userInitials = computed(() => {
    const name = this.session.currentUser()?.fullName ?? 'Nexora User';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  });

  protected readonly navigation: readonly NavigationItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Analytics', route: '/analytics', icon: 'analytics' },
    { label: 'Invoices', route: '/invoices', icon: 'invoice' },
    { label: 'Schedule', route: '/schedule', icon: 'schedule' },
    { label: 'Calendar', route: '/calendar', icon: 'calendar' },
    { label: 'Messages', route: '/messages', icon: 'messages', badge: 4 },
    { label: 'Settings', route: '/settings', icon: 'settings' },
  ];

  protected toggleNavigation(): void {
    this.navigationOpen.update((open) => !open);
  }

  protected closeNavigation(): void {
    this.navigationOpen.set(false);
  }

  protected async signOut(): Promise<void> {
    this.session.clear();
    await this.router.navigate(['/auth/login']);
  }
}
