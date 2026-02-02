export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type ImageQuality = '1K' | '2K' | '4K';

export interface MockupRequest {
  baseImage: File | null;
  logoImage: File | null;
  color: string;
  quality: ImageQuality;
}

export interface MockupResponse {
  imageUrl: string;
}