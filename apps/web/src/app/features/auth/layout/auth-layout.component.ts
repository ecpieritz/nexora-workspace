import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { BrandComponent } from '@shared/components/brand/brand.component';

@Component({
  selector: 'app-auth-layout',
  imports: [BrandComponent, RouterLink, RouterOutlet],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {
  protected readonly currentYear = new Date().getFullYear();
}
