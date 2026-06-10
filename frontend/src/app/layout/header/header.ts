import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent {
  readonly auth = inject(AuthService);

  // AuthService.isAuthenticated is already a signal — use it directly
  readonly isAuthenticated = this.auth.isAuthenticated;
}
