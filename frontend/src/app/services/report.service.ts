import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';

const PAGE_WIDTH = 210; // A4 mm
const PAGE_HEIGHT = 297;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLORS = {
  navy: '#0f172a',
  blue: '#0284c7',
  text: '#1e293b',
  muted: '#64748b',
  green: '#16a34a',
  amber: '#d97706',
  red: '#dc2626',
  line: '#e2e8f0',
};

type ChatMessage = { role: 'user' | 'assistant'; content: string };

@Injectable({ providedIn: 'root' })
export class ReportService {
  private doc!: jsPDF;
  private y = 0;

  generateExecutiveReport(
    analysis: any,
    chartCanvas?: HTMLCanvasElement,
    chatMessages: ChatMessage[] = [],
  ): void {
    const result = analysis?.result ?? {};
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' });
    this.y = 0;

    this.drawCoverHeader(result);
    this.drawScoreBlock(result);
    this.drawSection('Executive Summary');
    this.drawParagraphs(result.executiveSummary ?? 'No summary available.');
    this.drawKpiTable(result.businessKPIs ?? {});

    if (chartCanvas) {
      // Reserve space for heading + chart together so the heading
      // is never orphaned at the bottom of a page
      const ratio = chartCanvas.height / chartCanvas.width;
      const chartHeight = CONTENT_WIDTH * ratio;
      this.ensureSpace(16 + chartHeight + 8);

      this.drawSection('Revenue, Cost, and Profit Trend');
      this.drawChart(chartCanvas);
    }

    this.drawList('Insights', result.insights ?? []);
    this.drawList('Recommendations', result.recommendations ?? []);
    this.drawList('Risks', result.risks ?? [], COLORS.amber);
    this.drawChatSection(chatMessages);

    this.drawFooters();

    const name = (result.profile?.datasetType ?? 'analysis').replace(/\s+/g, '-').toLowerCase();
    this.doc.save(`decisioniq-report-${name}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // ── sections ─────────────────────────────────────────

  private drawCoverHeader(result: any): void {
    this.doc.setFillColor(COLORS.navy);
    this.doc.rect(0, 0, PAGE_WIDTH, 34, 'F');

    this.doc.setTextColor('#38bdf8');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(16);
    this.doc.text('DecisionIQ', MARGIN, 14);

    this.doc.setTextColor('#ffffff');
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Executive Report', MARGIN, 21);

    this.doc.setTextColor('#94a3b8');
    this.doc.setFontSize(9);
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    this.doc.text(dateStr, PAGE_WIDTH - MARGIN, 14, { align: 'right' });

    this.y = 44;

    this.doc.setTextColor(COLORS.text);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(20);
    this.doc.text(result.profile?.datasetType ?? 'Dataset Analysis', MARGIN, this.y);
    this.y += 4;

    const profile = result.profile ?? {};
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.muted);
    this.doc.text(
      `${profile.rowCount ?? '—'} rows  ·  ${profile.columnCount ?? '—'} columns  ·  Data quality ${profile.qualityScore ?? '—'}/100`,
      MARGIN,
      this.y + 4,
    );
    this.y += 12;
  }

  private drawScoreBlock(result: any): void {
    const score = result.decisionScore?.score;
    const rating = result.decisionScore?.rating ?? '—';
    const color = score >= 80 ? COLORS.green : score >= 60 ? COLORS.amber : COLORS.red;

    this.doc.setDrawColor(COLORS.line);
    this.doc.setFillColor('#f8fafc');
    this.doc.roundedRect(MARGIN, this.y, CONTENT_WIDTH, 24, 2, 2, 'FD');

    this.doc.setTextColor(COLORS.muted);
    this.doc.setFontSize(8);
    this.doc.text('DECISION SCORE', MARGIN + 8, this.y + 8);

    this.doc.setTextColor(color);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(22);
    this.doc.text(String(score ?? '—'), MARGIN + 8, this.y + 19);

    this.doc.setFontSize(11);
    this.doc.text(rating.toUpperCase(), MARGIN + 30, this.y + 19);

    const barX = MARGIN + 70;
    const barW = CONTENT_WIDTH - 80;
    this.doc.setFillColor(COLORS.line);
    this.doc.roundedRect(barX, this.y + 13, barW, 3, 1.5, 1.5, 'F');
    if (typeof score === 'number') {
      this.doc.setFillColor(color);
      this.doc.roundedRect(
        barX,
        this.y + 13,
        (barW * Math.min(score, 100)) / 100,
        3,
        1.5,
        1.5,
        'F',
      );
    }

    this.y += 32;
  }

  private drawSection(title: string): void {
    this.ensureSpace(16);
    this.doc.setTextColor(COLORS.blue);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text(title, MARGIN, this.y);
    this.doc.setDrawColor(COLORS.line);
    this.doc.line(MARGIN, this.y + 2, PAGE_WIDTH - MARGIN, this.y + 2);
    this.y += 8;
  }

  private drawParagraphs(text: string): void {
    this.doc.setTextColor(COLORS.text);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    const paragraphs = text.split(/\n+/).filter((p) => p.trim());

    for (const para of paragraphs) {
      const lines: string[] = this.doc.splitTextToSize(para.trim(), CONTENT_WIDTH);
      for (const line of lines) {
        this.ensureSpace(5);
        this.doc.text(line, MARGIN, this.y);
        this.y += 5;
      }
      this.y += 3;
    }
    this.y += 2;
  }

  private drawKpiTable(kpis: any): void {
    this.drawSection('Key Performance Indicators');

    const rows: [string, string][] = [
      [
        'Total Revenue',
        kpis.totalRevenue != null ? `$${Number(kpis.totalRevenue).toLocaleString()}` : '—',
      ],
      ['Total Cost', kpis.totalCost != null ? `$${Number(kpis.totalCost).toLocaleString()}` : '—'],
      [
        'Total Profit',
        kpis.totalProfit != null ? `$${Number(kpis.totalProfit).toLocaleString()}` : '—',
      ],
      ['Profit Margin', kpis.profitMargin != null ? `${kpis.profitMargin}%` : '—'],
    ];

    const colW = CONTENT_WIDTH / 4;
    this.ensureSpace(22);

    rows.forEach(([label, value], i) => {
      const x = MARGIN + colW * i;
      this.doc.setDrawColor(COLORS.line);
      this.doc.setFillColor('#f8f8fc');
      this.doc.roundedRect(x + 1, this.y, colW - 2, 18, 2, 2, 'FD');

      this.doc.setTextColor(COLORS.muted);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7.5);
      this.doc.text(label, x + 5, this.y + 6);

      this.doc.setTextColor(COLORS.text);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(11);
      this.doc.text(value, x + 5, this.y + 13);
    });

    this.y += 26;
  }

  private drawChart(canvas: HTMLCanvasElement): void {
    const imgData = canvas.toDataURL('image/png');
    const ratio = canvas.height / canvas.width;
    const imgW = CONTENT_WIDTH;
    const imgH = imgW * ratio;

    this.ensureSpace(imgH + 4);

    this.doc.setFillColor(COLORS.navy);
    this.doc.roundedRect(MARGIN, this.y, imgW, imgH, 2, 2, 'F');
    this.doc.addImage(imgData, 'PNG', MARGIN, this.y, imgW, imgH);
    this.y += imgH + 8;
  }

  private drawList(title: string, items: string[], color: string = COLORS.blue): void {
    if (!items.length) return;

    this.drawSection(title);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    for (const item of items) {
      const lines: string[] = this.doc.splitTextToSize(item, CONTENT_WIDTH - 6);
      this.ensureSpace(lines.length * 5 + 2);

      this.doc.setTextColor(color);
      this.doc.text('•', MARGIN, this.y);
      this.doc.setTextColor(COLORS.text);
      lines.forEach((line, i) => {
        this.doc.text(line, MARGIN + 5, this.y + i * 5);
      });
      this.y += lines.length * 5 + 2;
    }
    this.y += 4;
  }

  private drawChatSection(messages: ChatMessage[]): void {
    if (!messages.length) return;

    this.drawSection('Analyst Q&A');
    this.doc.setFontSize(10);

    for (const msg of messages) {
      if (msg.role === 'user') {
        // Question — bold, prefixed with Q:
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(COLORS.blue);
        const qLines: string[] = this.doc.splitTextToSize(`Q: ${msg.content}`, CONTENT_WIDTH);
        this.ensureSpace(qLines.length * 5 + 2);
        for (const line of qLines) {
          this.doc.text(line, MARGIN, this.y);
          this.y += 5;
        }
        this.y += 1;
      } else {
        // Answer — normal text, paragraph-aware
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(COLORS.text);
        const paragraphs = msg.content.split(/\n+/).filter((p) => p.trim());
        for (const para of paragraphs) {
          const aLines: string[] = this.doc.splitTextToSize(para.trim(), CONTENT_WIDTH - 4);
          for (const line of aLines) {
            this.ensureSpace(5);
            this.doc.text(line, MARGIN + 4, this.y);
            this.y += 5;
          }
          this.y += 2;
        }
        this.y += 4; // gap before next question
      }
    }
  }

  // ── plumbing ─────────────────────────────────────────

  private ensureSpace(needed: number): void {
    if (this.y + needed > PAGE_HEIGHT - 20) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  private drawFooters(): void {
    const pageCount = this.doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setTextColor(COLORS.muted);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.text(
        'Generated by DecisionIQ · decisioniq.sdcloudhub.com',
        MARGIN,
        PAGE_HEIGHT - 10,
      );
      this.doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, {
        align: 'right',
      });
    }
  }
}
