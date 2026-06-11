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
  datasetKey?: string;
  fileName?: string;
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

  readonly analyses = signal<AnalysisSummary[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  readonly totalAnalyses = computed(() => this.analyses().length);

  readonly averageScore = computed(() => {
    const scores = this.analyses()
      .map((a) => a.decisionScore)
      .filter((s): s is number => typeof s === 'number');
    if (!scores.length) return null;
    return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  });

  readonly strongCount = computed(
    () => this.analyses().filter((a) => a.rating === 'Strong').length,
  );

  readonly moderateCount = computed(
    () => this.analyses().filter((a) => a.rating === 'Moderate').length,
  );

  readonly weakCount = computed(
    () =>
      // ← was highRiskCount
      this.analyses().filter((a) => a.rating === 'Weak').length,
  );

  readonly latestAnalysis = computed(
    () =>
      // ← proper sort
      [...this.analyses()].sort(
        (a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime(),
      )[0] ?? null,
  );

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

  getDatasetName(item: AnalysisSummary): string {
    if (item.fileName) return item.fileName;
    if (item.datasetKey) return item.datasetKey.split('/').pop() || item.datasetKey;
    return 'Unknown dataset';
  }
}
