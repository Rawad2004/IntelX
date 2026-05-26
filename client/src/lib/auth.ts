// ============================================
// AUTH TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

export interface OTPVerification {
  email: string;
  code: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
  refreshToken?: string;
  requiresVerification?: boolean;
}

// ============================================
// API BASE URL
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// ============================================
// API ENDPOINTS
// ============================================

export const AUTH_ENDPOINTS = {
  login: `${API_BASE_URL}/api/auth/login`,
  register: `${API_BASE_URL}/api/auth/register`,
  verifyOTP: `${API_BASE_URL}/api/auth/verify-otp`,
  resendOTP: `${API_BASE_URL}/api/auth/resend-otp`,
  googleAuth: `${API_BASE_URL}/api/auth/google`,
  logout: `${API_BASE_URL}/api/auth/logout`,
  me: `${API_BASE_URL}/api/auth/me`,
  forgotPassword: `${API_BASE_URL}/api/auth/forgot-password`,
  resetPassword: `${API_BASE_URL}/api/auth/reset-password`,
} as const;

// ============================================
// TOKEN STORAGE
// ============================================

const TOKEN_KEY = 'intelx_token';
const REFRESH_TOKEN_KEY = 'intelx_refresh_token';

export function setTokens(token: string, refreshToken?: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function getRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return null;
}

export function clearTokens(): void { 
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

// ============================================
// AUTH API FUNCTIONS
// ============================================

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(AUTH_ENDPOINTS.login, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  
  const data = await response.json();
  
  // Store tokens if login successful
  if (data.success && data.token) {
    setTokens(data.token, data.refreshToken);
  }
  
  return data;
}

export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  const response = await fetch(AUTH_ENDPOINTS.register, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  
  return response.json();
}

export async function verifyOTP(data: OTPVerification): Promise<AuthResponse> {
  const response = await fetch(AUTH_ENDPOINTS.verifyOTP, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  const result = await response.json();
  
  // Store tokens if verification successful
  if (result.success && result.token) {
    setTokens(result.token, result.refreshToken);
  }
  
  return result;
}

export async function resendOTP(email: string): Promise<AuthResponse> {
  const response = await fetch(AUTH_ENDPOINTS.resendOTP, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  
  return response.json();
}

export async function googleAuthCallback(credential: string): Promise<AuthResponse> {
  const response = await fetch(AUTH_ENDPOINTS.googleAuth, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  
  const data = await response.json();
  
  // Store tokens if Google auth successful
  if (data.success && data.token) {
    setTokens(data.token, data.refreshToken);
  }
  
  return data;
}

export async function logout(): Promise<void> {
  const token = getToken();
  
  try {
    await fetch(AUTH_ENDPOINTS.logout, {
      method: "POST",
      headers: {
        "Authorization": token ? `Bearer ${token}` : "",
      },
    });
  } finally {
    clearTokens();
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const token = getToken();
  
  if (!token) return null;
  
  try {
    const response = await fetch(AUTH_ENDPOINTS.me, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      clearTokens();
      return null;
    }
    
    const data = await response.json();
    return data.user;
  } catch {
    return null;
  }
}

export async function forgotPassword(email: string): Promise<AuthResponse> {
  const response = await fetch(AUTH_ENDPOINTS.forgotPassword, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  
  return response.json();
}

export async function resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
  const response = await fetch(AUTH_ENDPOINTS.resetPassword, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  
  return response.json();
}

// ============================================
// VALIDATION HELPERS
// ============================================

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("At least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("One uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("One lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("One number");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getPasswordStrength(password: string): "weak" | "medium" | "strong" {
  const { errors } = validatePassword(password);
  
  if (password.length < 6) return "weak";
  if (errors.length > 2) return "weak";
  if (errors.length > 0) return "medium";
  if (password.length >= 12) return "strong";
  return "medium";
}

// ============================================
// AUTH STATE CHECK
// ============================================

export function isAuthenticated(): boolean {
  return !!getToken();
}