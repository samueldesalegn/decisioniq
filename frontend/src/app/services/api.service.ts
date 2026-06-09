import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'https://2wdb1i9pj6.execute-api.us-east-1.amazonaws.com/Prod';

  getUploadUrl(fileName: string, contentType: string) {
    return this.http.post<{
      datasetId: string;
      uploadUrl: string;
      key: string;
    }>(`${this.apiUrl}/upload-url`, {
      fileName,
      contentType,
    });
  }

  uploadFile(uploadUrl: string, file: File) {
    return this.http.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type || 'text/csv',
      },
      responseType: 'text',
    });
  }

  analyze(bucket: string, key: string) {
    return this.http.post<{
      analysisId: string;
      status: string;
      processingMode: string;
      resultLocation: unknown;
      summary: unknown;
    }>(`${this.apiUrl}/analyze`, {
      bucket,
      key,
    });
  }

  getAnalysis(analysisId: string) {
    return this.http.get(`${this.apiUrl}/analysis/${analysisId}`);
  }

  listAnalyses() {
    return this.http.get(`${this.apiUrl}/analyses`);
  }
}
