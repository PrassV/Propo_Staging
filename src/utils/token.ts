import { v4 as uuidv4 } from 'uuid';
import config from '../config/urls';

// Generate a secure token with additional entropy
export function generateToken(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2);
  const uuid = uuidv4().replace(/-/g, '');
  return `${timestamp}-${randomPart}-${uuid}`;
}

// Generate invitation URL using configured base URL
export function generateInvitationUrl(token: string): string {
  const baseUrl = config.getBaseUrl();
  return `${baseUrl}/#/invite/${token}`;
}

// Store invitation token in session storage
export function storeInvitationToken(token: string): void {
  sessionStorage.setItem('invitation_token', token);
}

// Retrieve invitation token from session storage
export function getStoredInvitationToken(): string | null {
  return sessionStorage.getItem('invitation_token');
}

// Clear invitation token from session storage
export function clearInvitationToken(): void {
  sessionStorage.removeItem('invitation_token');
}

// === API Authentication Token Management ===

// Store authentication token in local storage
export function storeToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

// Retrieve authentication token from local storage
export function getStoredToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Store refresh token in local storage
export function storeRefreshToken(token: string): void {
  localStorage.setItem('refresh_token', token);
}

// Retrieve refresh token from local storage
export function getStoredRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

// Clear all authentication tokens
export function clearTokens(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
}