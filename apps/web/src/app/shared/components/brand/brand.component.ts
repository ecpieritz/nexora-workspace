import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BrandSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'app-brand',
  templateUrl: './brand.component.html',
  styleUrl: './brand.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': "'brand brand--' + size()",
  },
})
export class BrandComponent {
  readonly showName = input(true);
  readonly size = input<BrandSize>('medium');
}
