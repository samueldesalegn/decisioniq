import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

const UPLOAD_BUCKET = 'backend-uploadbucket-zyal6uhrwu6a';

@Component({
  selector: 'app-upload',
  imports: [],
  templateUrl: './upload.html',
  styleUrl: './upload.scss',
})
export class Upload {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  selectedFile = signal<File | null>(null);
  isUploading = signal(false);
  error = signal<string | null>(null);
  showUpgrade = signal(false);
  isRedirecting = signal(false);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
    this.error.set(null);
    this.showUpgrade.set(false);
  }

  private async hashFile(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  analyze(): void {
    const file = this.selectedFile();

    if (!file) {
      this.error.set('Please select a CSV file first.');
      return;
    }

    this.isUploading.set(true);
    this.error.set(null);
    this.showUpgrade.set(false);

    this.hashFile(file).then((fileHash) => {
      this.api.getUploadUrl(file.name, file.type || 'text/csv', fileHash).subscribe({
        next: (uploadResponse) => {
          if (uploadResponse.duplicate) {
            this.isUploading.set(false);
            this.router.navigate(['/analysis', uploadResponse.analysisId]);
            return;
          }

          this.api.uploadFile(uploadResponse.uploadUrl!, file).subscribe({
            next: () => {
              this.api.analyze(UPLOAD_BUCKET, uploadResponse.key!, fileHash).subscribe({
                next: (analysisResponse) => {
                  this.isUploading.set(false);
                  this.router.navigate(['/analysis', analysisResponse.analysisId]);
                },
                error: (err) => {
                  this.isUploading.set(false);

                  if (err.status === 402) {
                    // Free plan limit reached → offer upgrade
                    this.error.set('You have used all 3 free analyses for this month.');
                    this.showUpgrade.set(true);
                  } else if (err.status === 429) {
                    // Pro fair-use cap reached → no upgrade box (already Pro)
                    this.error.set(
                      'You have reached the monthly fair-use limit. Please contact support for higher-volume needs.',
                    );
                  } else {
                    this.error.set('Failed to analyze uploaded file.');
                  }
                },
              });
            },
            error: () => {
              this.isUploading.set(false);
              this.error.set('Failed to upload file to S3.');
            },
          });
        },
        error: () => {
          this.isUploading.set(false);
          this.error.set('Failed to generate upload URL.');
        },
      });
    });
  }

  upgrade(): void {
    this.isRedirecting.set(true);

    this.api.createCheckoutSession().subscribe({
      next: (res) => {
        if (res.url) {
          window.location.href = res.url; // off to Stripe Checkout
        } else {
          this.isRedirecting.set(false);
          this.error.set('Could not start checkout. Please try again.');
        }
      },
      error: () => {
        this.isRedirecting.set(false);
        this.error.set('Could not start checkout. Please try again.');
      },
    });
  }
}
