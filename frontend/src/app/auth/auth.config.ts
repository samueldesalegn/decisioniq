import { OpenIdConfiguration } from 'angular-auth-oidc-client';

export const authConfig: OpenIdConfiguration = {
  authority: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_M9J86q7hd',
  redirectUrl: window.location.origin,
  postLogoutRedirectUri: window.location.origin,
  clientId: '4ttq9gorgkqcoip5ea2ssql0mv',
  scope: 'email openid profile',
  responseType: 'code',
  silentRenew: true,
  useRefreshToken: true,
  renewTimeBeforeTokenExpiresInSeconds: 30,
};
