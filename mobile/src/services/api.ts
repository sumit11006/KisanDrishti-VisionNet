/**
 * Krishi-Vision API Client
 * Handles all communication with the FastAPI backend including
 * REST calls, WebSocket advisory streaming, and file uploads.
 */

import {
  DiagnosticRequest,
  DiseaseDiagnosticResponse,
  RegenerativeRequest,
  RegenerativeAdvisoryResponse,
  SatelliteAnalysisResponse,
  TranscriptionResponse,
  BRICSContribution,
  BRICSExchangeResponse,
  FarmerProfile,
  WeatherForecast,
  SyncOperation,
  SyncStatus
} from "../types";
import { syncQueue, offlineStore } from "./offlineStore";

const ENV = process.env.NODE_ENV || "development";
const BASE_URL = ENV === "production" ? "https://api.krishivision.com/api/v1" : "http://localhost:8080/api/v1";
const WS_URL = ENV === "production" ? "wss://api.krishivision.com/ws/advisory" : "ws://localhost:8080/ws/advisory";

class ApiClient {
  private token: string | null = null;

  public setToken(token: string) {
    this.token = token;
  }

  private async fetchWithTimeout(url: string, options: RequestInit & { timeout?: number }, retries = 3): Promise<Response> {
    const { timeout = 30000, ...fetchOptions } = options;

    const executeRequest = async (attempt: number): Promise<Response> => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
          headers: {
            ...fetchOptions.headers,
            ...(this.token ? { "Authorization": `Bearer ${this.token}` } : {})
          }
        });
        clearTimeout(id);
        
        // Logging
        console.log(`[API] ${fetchOptions.method || 'GET'} ${url} - ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
      } catch (error: any) {
        clearTimeout(id);
        console.error(`[API Error] ${fetchOptions.method || 'GET'} ${url} - ${error.message}`);
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return executeRequest(attempt + 1);
        }
        throw error;
      }
    };

    return executeRequest(1);
  }

  private isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
  }

  private async queueRequest(endpoint: string, method: "GET" | "POST" | "PUT" | "DELETE", payload?: any, headers?: Record<string, string>): Promise<void> {
    const operation: SyncOperation = {
      id: crypto.randomUUID(),
      endpoint: `${BASE_URL}${endpoint}`,
      method,
      payload,
      headers: {
        ...headers,
        ...(this.token ? { "Authorization": `Bearer ${this.token}` } : {})
      },
      status: SyncStatus.PENDING,
      created_at: Date.now(),
      retry_count: 0
    };
    await syncQueue.enqueue(operation);
  }

  public async diagnoseCrop(imageBase64: string, metadata: DiagnosticRequest): Promise<DiseaseDiagnosticResponse> {
    if (!this.isOnline()) {
      await this.queueRequest("/diagnostics/analyze", "POST", { image: imageBase64, ...metadata }, { "Content-Type": "application/json" });
      throw new Error("Offline. Request queued for synchronization.");
    }

    const response = await this.fetchWithTimeout(`${BASE_URL}/diagnostics/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64, ...metadata }),
      timeout: 120000 // 120s for uploads
    });
    const data = await response.json();
    await offlineStore.set("diagnostics_cache", `diag_${Date.now()}`, data);
    return data;
  }

  public async getRegenerativeAdvisory(request: RegenerativeRequest): Promise<RegenerativeAdvisoryResponse> {
    if (!this.isOnline()) {
      const cached = await offlineStore.get<RegenerativeAdvisoryResponse>("advisory_cache", JSON.stringify(request));
      if (cached) return cached;
      throw new Error("Offline. No cached data available.");
    }

    const response = await this.fetchWithTimeout(`${BASE_URL}/advisory/regenerative`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
    const data = await response.json();
    await offlineStore.set("advisory_cache", JSON.stringify(request), data, 86400000); // 24h ttl
    return data;
  }

  public async getSatelliteAnalysis(lat: number, lon: number, geometry?: any): Promise<SatelliteAnalysisResponse> {
    const cacheKey = `${lat}_${lon}`;
    if (!this.isOnline()) {
      const cached = await offlineStore.get<SatelliteAnalysisResponse>("satellite_cache", cacheKey);
      if (cached) return cached;
      throw new Error("Offline. No cached data available.");
    }

    const response = await this.fetchWithTimeout(`${BASE_URL}/satellite/analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lon, geometry })
    });
    const data = await response.json();
    await offlineStore.set("satellite_cache", cacheKey, data, 604800000); // 7 days ttl
    return data;
  }

  public async transcribeVoice(audioBlob: Blob, languageCode: string): Promise<TranscriptionResponse> {
    const formData = new FormData();
    formData.append("audio", audioBlob);
    formData.append("language", languageCode);

    const response = await this.fetchWithTimeout(`${BASE_URL}/voice/transcribe`, {
      method: "POST",
      body: formData,
      timeout: 120000
    });
    return await response.json();
  }

  public async synthesizeSpeech(text: string, languageCode: string): Promise<ArrayBuffer> {
    const response = await this.fetchWithTimeout(`${BASE_URL}/voice/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: languageCode })
    });
    return await response.arrayBuffer();
  }

  public async submitBRICSData(data: BRICSContribution): Promise<BRICSExchangeResponse> {
    if (!this.isOnline()) {
      await this.queueRequest("/brics/contribute", "POST", data, { "Content-Type": "application/json" });
      throw new Error("Offline. Request queued for synchronization.");
    }

    const response = await this.fetchWithTimeout(`${BASE_URL}/brics/contribute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await response.json();
  }

  public async getFarmerProfile(ufid: string): Promise<FarmerProfile> {
    const response = await this.fetchWithTimeout(`${BASE_URL}/farmers/${ufid}`, {
      method: "GET"
    });
    return await response.json();
  }

  public async getWeatherForecast(lat: number, lon: number): Promise<WeatherForecast> {
    const response = await this.fetchWithTimeout(`${BASE_URL}/weather/forecast?lat=${lat}&lon=${lon}`, {
      method: "GET"
    });
    return await response.json();
  }
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private onMessageCb?: (msg: any) => void;
  private onErrorCb?: (err: any) => void;
  private onCloseCb?: () => void;

  public connectAdvisoryStream(
    onMessage: (msg: any) => void,
    onError: (err: any) => void,
    onClose: () => void
  ) {
    this.onMessageCb = onMessage;
    this.onErrorCb = onError;
    this.onCloseCb = onClose;

    this.initWebSocket();
  }

  private initWebSocket() {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(`${WS_URL}/advisory/stream`);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.onMessageCb) this.onMessageCb(data);
      } catch (e) {
        if (this.onMessageCb) this.onMessageCb(event.data);
      }
    };

    this.ws.onerror = (error) => {
      if (this.onErrorCb) this.onErrorCb(error);
    };

    this.ws.onclose = () => {
      if (this.onCloseCb) this.onCloseCb();
      this.handleReconnect();
    };
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const timeout = Math.pow(2, this.reconnectAttempts) * 1000;
      setTimeout(() => {
        this.reconnectAttempts++;
        this.initWebSocket();
      }, timeout);
    }
  }

  public sendAdvisoryQuery(query: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ query }));
    } else {
      throw new Error("WebSocket is not connected");
    }
  }

  public disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const apiClient = new ApiClient();
export const wsManager = new WebSocketManager();
