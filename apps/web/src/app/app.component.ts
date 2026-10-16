import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiActivityComponent } from '@core/http';
import { ToastContainerComponent } from '@shared/ui';

@Component({
  selector: 'app-root',
  imports: [ApiActivityComponent, RouterOutlet, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {}
