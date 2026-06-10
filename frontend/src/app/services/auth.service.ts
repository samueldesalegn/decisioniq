import { Injectable, computed, signal } from '@angular/core';

const cognitoDomain = 'https://decisioniq-auth-samuel.auth.us-east-1.amazoncognito.com';

const clientId = '4ttq9gorgkqcoip5ea2ssql0mv';

const localRedirectUri = 'http://localhost:4200';
const prodRedirectUri = 'https://decisioniq.sdcloudhub.com';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly idTokenKey = 'decisioniq_id_token';
  private readonly accessTokenKey = 'decisioniq_access_token';
  private readonly codeVerifierKey = 'decisioniq_code_verifier';

  readonly idToken = signal<string | null>(this.getValidStoredToken(this.idTokenKey));

  readonly isAuthenticated = computed(() => !!this.idToken());

  private get redirectUri(): string {
    return window.location.origin.includes('localhost') ? localRedirectUri : prodRedirectUri;
  }

  private getValidStoredToken(key: string): string | null {
    const token = localStorage.getItem(key);

    if (token && !AuthService.isTokenExpired(token)) {
      return token;
    }

    localStorage.removeItem(key);
    return null;
  }

  private static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

    return Array.from(crypto.getRandomValues(new Uint8Array(length)))
      .map((b) => chars[b % chars.length])
      .join('');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoded = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', encoded);

    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async login(): Promise<void> {
    const codeVerifier = this.generateRandomString(64);
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    sessionStorage.setItem(this.codeVerifierKey, codeVerifier);

    const url =
      `${cognitoDomain}/oauth2/authorize?` +
      `client_id=${clientId}` +
      `&response_type=code` +
      `&scope=openid+email+profile` +
      `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256`;

    window.location.href = url;
  }

  logout(): void {
    localStorage.removeItem(this.idTokenKey);
    localStorage.removeItem(this.accessTokenKey);
    sessionStorage.removeItem(this.codeVerifierKey);

    this.idToken.set(null);

    const url =
      `${cognitoDomain}/logout?` +
      `client_id=${clientId}` +
      `&logout_uri=${encodeURIComponent(this.redirectUri)}`;

    window.location.href = url;
  }

  async handleAuthCallback(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      return;
    }

    const codeVerifier = sessionStorage.getItem(this.codeVerifierKey);

    if (!codeVerifier) {
      console.error('No code verifier found.');
      return;
    }

    const response = await fetch(`${cognitoDomain}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        code,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      console.error('Token exchange failed:', await response.text());
      return;
    }

    const tokens = await response.json();

    if (!tokens.id_token || !tokens.access_token) {
      console.error('Missing tokens in Cognito response:', tokens);
      return;
    }

    sessionStorage.removeItem(this.codeVerifierKey);

    localStorage.setItem(this.idTokenKey, tokens.id_token);
    localStorage.setItem(this.accessTokenKey, tokens.access_token);

    this.idToken.set(tokens.id_token);

    window.history.replaceState({}, document.title, '/analyses');
  }

  getIdToken(): string | null {
    return this.getValidStoredToken(this.idTokenKey);
  }

  getAccessToken(): string | null {
    return this.getValidStoredToken(this.accessTokenKey);
  }
}
