import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface AnalysisSummary {
  analysisId: string;
  status: string;
  datasetType?: string;
  decisionScore?: number;
  rating?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly api = inject(ApiService);

  analyses = signal<AnalysisSummary[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  readonly totalAnalyses = computed(() => this.analyses().length);

  readonly averageScore = computed(() => {
    const scored = this.analyses().filter((a) => a.decisionScore != null);
    if (!scored.length) return null;
    const avg = scored.reduce((sum, a) => sum + (a.decisionScore ?? 0), 0) / scored.length;
    return Math.round(avg);
  });

  readonly strongCount = computed(
    () => this.analyses().filter((a) => a.rating === 'Strong').length,
  );

  readonly moderateCount = computed(
    () => this.analyses().filter((a) => a.rating === 'Moderate').length,
  );

  readonly highRiskCount = computed(
    () => this.analyses().filter((a) => a.rating === 'High Risk').length,
  );

  readonly latestAnalysis = computed(() => this.analyses()[0] ?? null);

  readonly topDatasetType = computed(() => {
    const counts: Record<string, number> = {};
    for (const a of this.analyses()) {
      if (a.datasetType) counts[a.datasetType] = (counts[a.datasetType] ?? 0) + 1;
    }
    return Object.entries(counts).sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
  });

  ngOnInit(): void {
    this.api.listAnalyses().subscribe({
      next: (res: any) => {
        this.analyses.set(res.analyses ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load analyses.');
        this.isLoading.set(false);
      },
    });
  }
}
