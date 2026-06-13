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

interface BillingStatus {
  plan: 'FREE' | 'PRO';
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  usage: { used: number; limit: number };
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

  // ── Billing ──────────────────────────────────────────
  readonly billing = signal<BillingStatus | null>(null);
  readonly isRedirecting = signal(false);
  readonly billingError = signal<string | null>(null);

  readonly isPro = computed(() => this.billing()?.plan === 'PRO');

  readonly usageLabel = computed(() => {
    const b = this.billing();
    if (!b) return '';
    return `${b.usage.used} of ${b.usage.limit} analyses used this month`;
  });

  readonly usagePercent = computed(() => {
    const b = this.billing();
    if (!b || !b.usage.limit) return 0;
    return Math.min(100, Math.round((b.usage.used / b.usage.limit) * 100));
  });

  readonly totalAnalyses = computed(() => this.analyses().length);

  readonly averageScore = computed(() => {
    const scores = this.analyses()
      .map((a) => a.decisionScore)
      .filter((s): s is number => typeof s === 'number');
    if (!scores.length) return null;
    return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  });

  readonly strongCount = computed(
    () => this.analyses().filter((a) => a.rating === 'Excellent' || a.rating === 'Strong').length,
  );

  readonly moderateCount = computed(
    () => this.analyses().filter((a) => a.rating === 'Moderate').length,
  );

  readonly weakCount = computed(
    () => this.analyses().filter((a) => a.rating === 'Weak' || a.rating === 'Critical').length,
  );

  readonly latestAnalysis = computed(
    () =>
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

    // Billing status loads independently so a billing hiccup never blocks the dashboard
    this.api.getBillingStatus().subscribe({
      next: (res) => this.billing.set(res as BillingStatus),
      error: () => this.billingError.set('Could not load billing status.'),
    });
  }

  getDatasetName(item: AnalysisSummary): string {
    if (item.fileName) return item.fileName;
    if (item.datasetKey) return item.datasetKey.split('/').pop() || item.datasetKey;
    return 'Unknown dataset';
  }

  upgrade(): void {
    this.isRedirecting.set(true);
    this.billingError.set(null);

    this.api.createCheckoutSession().subscribe({
      next: (res) => {
        if (res.url) {
          window.location.assign(res.url);
        } else {
          this.isRedirecting.set(false);
          this.billingError.set('Could not start checkout. Please try again.');
        }
      },
      error: () => {
        this.isRedirecting.set(false);
        this.billingError.set('Could not start checkout. Please try again.');
      },
    });
  }

  manageBilling(): void {
    this.isRedirecting.set(true);
    this.billingError.set(null);

    this.api.createPortalSession().subscribe({
      next: (res) => {
        if (res.url) {
          window.location.assign(res.url);
        } else {
          this.isRedirecting.set(false);
          this.billingError.set('Could not open billing portal. Please try again.');
        }
      },
      error: () => {
        this.isRedirecting.set(false);
        this.billingError.set('Could not open billing portal. Please try again.');
      },
    });
  }
}
