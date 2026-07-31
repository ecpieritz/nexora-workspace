import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BrandComponent } from '@shared/components/brand/brand.component';

@Component({
  selector: 'app-root',
  imports: [BrandComponent, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {}
