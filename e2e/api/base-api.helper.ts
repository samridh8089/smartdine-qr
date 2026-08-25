/**
 * SmartDine SaaS — Base API Helper
 * Phase 7A.2 — Infrastructure
 */

import { APIRequestContext } from '@playwright/test';
import { EnvironmentHelper } from '../helpers/environment.helper';

export class BaseApiHelper {
  protected request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  protected get baseUrl(): string {
    return EnvironmentHelper.baseUrl;
  }

  protected async get(endpoint: string, headers?: Record<string, string>) {
    return await this.request.get(`${this.baseUrl}${endpoint}`, { headers });
  }

  protected async post(endpoint: string, body: unknown, headers?: Record<string, string>) {
    return await this.request.post(`${this.baseUrl}${endpoint}`, {
      data: body,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
  }
}
