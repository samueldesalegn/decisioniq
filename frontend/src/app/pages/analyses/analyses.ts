import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-analyses',
  standalone:true,
  imports: [RouterLink],
  templateUrl: './analyses.html',
  styleUrl: './analyses.scss',
})
export class Analyses {
  private readonly api = inject(ApiService);

  analyses = signal<any[]>([]);
  isLoading = signal(true);

  constructor() {
    this.api.listAnalyses().subscribe({
      next: (response: any) => {
        this.analyses.set(response.analyses ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }
}
