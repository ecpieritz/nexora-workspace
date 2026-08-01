import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BrandComponent } from '@shared/components/brand/brand.component';
import { ButtonDirective, CardComponent } from '@shared/ui';

@Component({
  selector: 'app-account-created',
  imports: [BrandComponent, ButtonDirective, CardComponent, RouterLink],
  templateUrl: './account-created.component.html',
  styleUrl: './account-created.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountCreatedComponent {}
