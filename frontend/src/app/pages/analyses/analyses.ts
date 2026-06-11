import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface AnalysisItem {
  analysisId: string;
  status: string;
  processingMode?: string;
  datasetType?: string;
  decisionScore?: number;
  rating?: string;
  profitMargin?: number;
  qualityScore?: number;
  fileSizeBytes?: number;
  createdAt?: string;
  datasetKey?: string;
}

@Component({
  selector: 'app-analyses',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './analyses.html',
  styleUrl: './analyses.scss',
})
export class Analyses {
  private readonly api = inject(ApiService);

  readonly analyses = signal<AnalysisItem[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly searchQuery = signal('');

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.analyses();
    return this.analyses().filter(
      (a) =>
        (a.datasetType ?? '').toLowerCase().includes(q) ||
        (a.rating ?? '').toLowerCase().includes(q) ||
        (a.status ?? '').toLowerCase().includes(q),
    );
  });

  constructor() {
    this.api.listAnalyses().subscribe({
      next: (response: any) => {
        this.analyses.set(response.analyses ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load analyses.');
        this.isLoading.set(false);
      },
    });
  }

  getDatasetName(item: AnalysisItem): string {
    if (item.datasetKey) return item.datasetKey.split('/').pop() || item.datasetKey;
    return 'Unknown dataset';
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatBytes(bytes?: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  ratingClass(rating?: string): string {
    if (rating === 'Strong') return 'rating-strong';
    if (rating === 'Moderate') return 'rating-moderate';
    if (rating === 'Weak') return 'rating-weak';
    return 'rating-pending';
  }

  scoreColor(score?: number): string {
    if (score === undefined || score === null) return '#94a3b8';
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  }
}
