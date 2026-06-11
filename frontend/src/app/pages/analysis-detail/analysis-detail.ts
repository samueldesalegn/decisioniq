import { Component, computed, effect, inject, signal, viewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Chart } from 'chart.js/auto';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-analysis-detail',
  imports: [RouterLink],
  templateUrl: './analysis-detail.html',
  styleUrl: './analysis-detail.scss',
})
export class AnalysisDetail {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('trendChart');

  analysis = signal<any | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  trendSeries = computed(() => this.analysis()?.result?.trendSeries ?? []);

  readonly decisionScore = computed(() => this.analysis()?.result?.decisionScore?.score ?? null);
  readonly rating = computed(() => this.analysis()?.result?.decisionScore?.rating ?? null);
  readonly datasetType = computed(
    () => this.analysis()?.result?.profile?.datasetType ?? 'Dataset Analysis',
  );
  readonly executiveSummary = computed(() => this.analysis()?.result?.executiveSummary ?? null);
  readonly kpis = computed(() => this.analysis()?.result?.businessKPIs ?? null);
  readonly insights = computed(() => this.analysis()?.result?.insights ?? []);
  readonly recommendations = computed(() => this.analysis()?.result?.recommendations ?? []);
  readonly risks = computed(() => this.analysis()?.result?.risks ?? []);
  readonly trends = computed(() => this.analysis()?.result?.trends ?? null);
  readonly profile = computed(() => this.analysis()?.result?.profile ?? null);

  readonly scoreColor = computed(() => {
    const score = this.decisionScore();
    if (score === null) return '#94a3b8';
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  });

  readonly scoreWidth = computed(() => {
    const score = this.decisionScore();
    return score !== null ? `${score}%` : '0%';
  });

  private chart: Chart | null = null;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.api.getAnalysis(id).subscribe({
        next: (response) => {
          this.analysis.set(response);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Failed to load analysis.');
          this.isLoading.set(false);
        },
      });
    }

    effect(() => {
      const canvas = this.chartCanvas();
      const data = this.trendSeries();

      if (!canvas || data.length === 0) return;

      this.chart?.destroy();

      this.chart = new Chart(canvas.nativeElement, {
        type: 'line',
        data: {
          labels: data.map((item: any) => item.date),
          datasets: [
            {
              label: 'Revenue',
              data: data.map((item: any) => item.revenue),
              borderColor: '#38bdf8',
              backgroundColor: 'rgba(56,189,248,0.08)',
              tension: 0.4,
              fill: true,
              pointRadius: 3,
            },
            {
              label: 'Cost',
              data: data.map((item: any) => item.cost),
              borderColor: '#f472b6',
              backgroundColor: 'rgba(244,114,182,0.08)',
              tension: 0.4,
              fill: true,
              pointRadius: 3,
            },
            {
              label: 'Profit',
              data: data.map((item: any) => item.profit),
              borderColor: '#fb923c',
              backgroundColor: 'rgba(251,146,60,0.08)',
              tension: 0.4,
              fill: true,
              pointRadius: 3,
            },
          ],
        },
        options: {
          responsive: true,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              labels: { color: '#e5e7eb', usePointStyle: true, padding: 20 },
            },
            tooltip: {
              backgroundColor: '#1e293b',
              titleColor: '#f8fafc',
              bodyColor: '#cbd5e1',
              borderColor: '#334155',
              borderWidth: 1,
            },
          },
          scales: {
            x: {
              ticks: { color: '#cbd5e1', maxRotation: 0 },
              grid: { color: '#1e293b' },
            },
            y: {
              ticks: {
                color: '#cbd5e1',
                callback: (value) => '$' + Number(value).toLocaleString(),
              },
              grid: { color: '#1e293b' },
            },
          },
        },
      });
    });
  }
}
