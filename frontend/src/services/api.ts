import axios, { AxiosInstance, AxiosResponse } from "axios";
import config from "../config";
import {
  APIResponse,
  PaginatedResponse,
  URLEntry,
  CrawlResult,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  URLFormData,
  CrawlStatus,
} from "../types";

class APIService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: config.apiUrl,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("access_token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Don't try to refresh tokens for authentication endpoints
        const isAuthEndpoint = originalRequest.url?.includes("/auth/");

        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !isAuthEndpoint &&
          this.isAuthenticated()
        ) {
          originalRequest._retry = true;

          try {
            await this.refreshToken();
            return this.api(originalRequest);
          } catch (refreshError) {
            this.logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    try {
      const response: AxiosResponse<APIResponse<AuthTokens>> =
        await this.api.post("/auth/login", credentials);

      if (response.data.success && response.data.data) {
        const tokens = response.data.data;
        localStorage.setItem("access_token", tokens.access_token);
        localStorage.setItem("refresh_token", tokens.refresh_token);
        return tokens;
      }

      throw new Error(response.data.message || "Login failed");
    } catch (error: any) {
      // Handle different types of errors
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error("Login failed. Please check your credentials.");
      }
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthTokens> {
    try {
      const response: AxiosResponse<APIResponse<AuthTokens>> =
        await this.api.post("/auth/register", credentials);

      if (response.data.success && response.data.data) {
        const tokens = response.data.data;
        localStorage.setItem("access_token", tokens.access_token);
        localStorage.setItem("refresh_token", tokens.refresh_token);
        return tokens;
      }

      throw new Error(response.data.message || "Registration failed");
    } catch (error: any) {
      // Handle different types of errors
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error("Registration failed. Please try again.");
      }
    }
  }

  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response: AxiosResponse<APIResponse<AuthTokens>> =
      await this.api.post("/auth/refresh", {
        refresh_token: refreshToken,
      });

    if (response.data.success && response.data.data) {
      const tokens = response.data.data;
      localStorage.setItem("access_token", tokens.access_token);
      localStorage.setItem("refresh_token", tokens.refresh_token);
      return tokens;
    }

    throw new Error("Token refresh failed");
  }

  logout(): void {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem("access_token");
  }

  // URL management methods
  async addURL(data: URLFormData): Promise<URLEntry> {
    const response: AxiosResponse<APIResponse<URLEntry>> = await this.api.post(
      "/urls",
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || "Failed to add URL");
  }

  async getURLs(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string | CrawlStatus
  ): Promise<PaginatedResponse<URLEntry>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) {
      params.append("search", search);
    }

    if (status && status !== "all") {
      params.append("status", status);
    }

    const response: AxiosResponse<APIResponse<PaginatedResponse<URLEntry>>> =
      await this.api.get(`/urls?${params}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || "Failed to get URLs");
  }

  async deleteURL(id: number): Promise<void> {
    const response: AxiosResponse<APIResponse<void>> = await this.api.delete(
      `/urls/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to delete URL");
    }
  }

  // Crawl control methods
  async startCrawl(id: number): Promise<void> {
    const response: AxiosResponse<APIResponse<void>> = await this.api.post(
      `/crawl/start/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to start crawl");
    }
  }

  async stopCrawl(id: number): Promise<void> {
    const response: AxiosResponse<APIResponse<void>> = await this.api.post(
      `/crawl/stop/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to stop crawl");
    }
  }

  // Bulk operations
  async bulkStartCrawl(ids: number[]): Promise<void> {
    const response: AxiosResponse<APIResponse<void>> = await this.api.post(
      "/crawl/bulk-start",
      { ids }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to start crawls");
    }
  }

  async bulkStopCrawl(ids: number[]): Promise<void> {
    const response: AxiosResponse<APIResponse<void>> = await this.api.post(
      "/crawl/bulk-stop",
      { ids }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to stop crawls");
    }
  }

  async bulkDeleteURLs(ids: number[]): Promise<void> {
    const response: AxiosResponse<APIResponse<void>> = await this.api.delete(
      "/urls",
      {
        data: { ids },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to delete URLs");
    }
  }

  // Results Dashboard methods
  async getResults(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    sortBy?: string,
    sortOrder?: string
  ): Promise<PaginatedResponse<CrawlResult>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) {
      params.append("search", search);
    }

    if (status && status !== "all") {
      params.append("status", status);
    }

    if (sortBy) {
      params.append("sort_by", sortBy);
    }

    if (sortOrder) {
      params.append("sort_order", sortOrder);
    }

    const response: AxiosResponse<APIResponse<PaginatedResponse<CrawlResult>>> =
      await this.api.get(`/results?${params}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || "Failed to get results");
  }

  async getResultDetail(id: number): Promise<CrawlResult> {
    const response: AxiosResponse<APIResponse<CrawlResult>> =
      await this.api.get(`/results/${id}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || "Failed to get result detail");
  }

  async getResultLinks(
    id: number,
    page: number = 1,
    limit: number = 50,
    type?: string,
    search?: string
  ): Promise<any> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (type) {
      params.append("type", type);
    }

    if (search) {
      params.append("search", search);
    }

    const response: AxiosResponse<APIResponse<any>> = await this.api.get(
      `/results/${id}/links?${params}`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || "Failed to get result links");
  }

  // Legacy results method (keeping for compatibility)
  async getCrawlResult(urlId: number): Promise<CrawlResult> {
    const response: AxiosResponse<APIResponse<CrawlResult>> =
      await this.api.get(`/urls/${urlId}/result`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || "Failed to get crawl result");
  }
}

const apiService = new APIService();
export default apiService;
