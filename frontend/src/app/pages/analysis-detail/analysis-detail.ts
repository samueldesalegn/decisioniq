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

  trendSeries = computed(() => this.analysis()?.result?.trendSeries ?? []);

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
          this.isLoading.set(false);
        },
      });
    }

    effect(() => {
      const canvas = this.chartCanvas();
      const data = this.trendSeries();

      if (!canvas || data.length === 0) {
        return;
      }

      this.chart?.destroy();

      this.chart = new Chart(canvas.nativeElement, {
        type: 'line',
        data: {
          labels: data.map((item: any) => item.date),
          datasets: [
            {
              label: 'Revenue',
              data: data.map((item: any) => item.revenue),
            },
            {
              label: 'Cost',
              data: data.map((item: any) => item.cost),
            },
            {
              label: 'Profit',
              data: data.map((item: any) => item.profit),
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              labels: {
                color: '#e5e7eb',
              },
            },
          },
          scales: {
            x: {
              ticks: {
                color: '#cbd5e1',
              },
              grid: {
                color: '#1e293b',
              },
            },
            y: {
              ticks: {
                color: '#cbd5e1',
              },
              grid: {
                color: '#1e293b',
              },
            },
          },
        },
      });
    });
  }
}
