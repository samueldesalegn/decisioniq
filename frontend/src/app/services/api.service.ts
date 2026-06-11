import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly apiUrl = 'https://2wdb1i9pj6.execute-api.us-east-1.amazonaws.com/Prod';

  private getAuthHeaders() {
    const token = this.auth.getAccessToken();

    if (!token) {
      return {};
    }

    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  getUploadUrl(fileName: string, contentType: string, fileHash: string) {
    return this.http.post<{
      duplicate: boolean;
      analysisId?: string;
      uploadUrl?: string;
      key?: string;
      fileHash?: string;
    }>(`${this.apiUrl}/upload-url`, { fileName, contentType, fileHash }, this.getAuthHeaders());
  }

  uploadFile(uploadUrl: string, file: File) {
    return this.http.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type || 'text/csv',
      },
      responseType: 'text',
    });
  }

  analyze(bucket: string, key: string, fileHash: string) {
    return this.http.post<{
      analysisId: string;
      status: string;
      processingMode: string;
      resultLocation: unknown;
      summary: unknown;
    }>(`${this.apiUrl}/analyze`, { bucket, key, fileHash }, this.getAuthHeaders());
  }

  getAnalysis(analysisId: string) {
    return this.http.get(`${this.apiUrl}/analysis/${analysisId}`, this.getAuthHeaders());
  }

  listAnalyses() {
    return this.http.get(`${this.apiUrl}/analyses`, this.getAuthHeaders());
  }
}
