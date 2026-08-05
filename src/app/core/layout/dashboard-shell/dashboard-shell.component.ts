import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthSessionService } from '@features/auth/data-access/auth-session.service';
import { BrandComponent } from '@shared/components/brand/brand.component';

interface NavigationItem {
  label: string;
  route: string;
  icon:
    | 'dashboard'
    | 'analytics'
    | 'products'
    | 'invoice'
    | 'schedule'
    | 'tasks'
    | 'calendar'
    | 'messages'
    | 'settings';
  badge?: number;
}

@Component({
  selector: 'app-dashboard-shell',
  imports: [BrandComponent, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard-shell.component.html',
  styleUrl: './dashboard-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeTransientUi()',
  },
})
export class DashboardShellComponent {
  private readonly router = inject(Router);
  protected readonly session = inject(AuthSessionService);

  protected readonly navigationOpen = signal(false);
  protected readonly sidebarCollapsed = signal(false);
  protected readonly userMenuOpen = signal(false);
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
    { label: 'Products', route: '/products', icon: 'products' },
    { label: 'Invoices', route: '/invoices', icon: 'invoice' },
    { label: 'Schedule', route: '/schedule', icon: 'schedule' },
    { label: 'Tasks', route: '/tasks', icon: 'tasks' },
    { label: 'Calendar', route: '/calendar', icon: 'calendar' },
    { label: 'Messages', route: '/messages', icon: 'messages', badge: 4 },
    { label: 'Settings', route: '/settings', icon: 'settings' },
  ];

  protected toggleNavigation(): void {
    this.navigationOpen.update((open) => !open);
    this.userMenuOpen.set(false);
  }

  protected closeNavigation(): void {
    this.navigationOpen.set(false);
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
    this.userMenuOpen.set(false);
  }

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  protected closeTransientUi(): void {
    this.navigationOpen.set(false);
    this.userMenuOpen.set(false);
  }

  protected async signOut(): Promise<void> {
    this.closeTransientUi();
    this.session.clear();
    await this.router.navigate(['/auth/login']);
  }
}
