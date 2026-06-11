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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
    this.error.set(null);
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
                error: () => {
                  this.isUploading.set(false);
                  this.error.set('Failed to analyze uploaded file.');
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
}
