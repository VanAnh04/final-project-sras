import { Platform } from 'react-native';
import axiosClient from './axiosClient';

export interface AiDiagnosisRequest {
  vehicleType: 'CAR' | 'MOTORBIKE';
  vehicleModel?: string;
  symptomDescription?: string;
  photoUrls?: string[];
}

export interface AiDiagnosisResponse {
  diagnosedIssue: string;
  confidence: 'CAO' | 'TRUNG_BINH' | 'CAN_KIEM_TRA';
  confidenceScore: number;
  severity: 'NGUY_HIEM' | 'CANH_BAO' | 'NHE';
  emergencyAdvice: string;
  suggestedIssueType: 'OUT_OF_FUEL' | 'FLAT_TIRE' | 'DEAD_BATTERY' | 'ENGINE_FAILURE' | 'ACCIDENT' | 'OTHER';
  suggestedService: string;
  autoFilledNote: string;
  troubleshootingSteps?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'model';
  content: string;
  imageUrl?: string;
  isVoice?: boolean;
}

export interface ProposedRescueOrder {
  garageId?: number;
  garageName?: string;
  vehicleType?: 'MOTORBIKE' | 'CAR';
  vehicleModel?: string;
  issueType?: string;
  title?: string;
  description?: string;
  estimatedPrice?: string;
  estimatedTravelFee?: string;
  distanceKm?: number;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface AiChatRequest {
  messages: ChatMessage[];
  userLocation?: string;
  lat?: number;
  lng?: number;
  vehicleType?: 'CAR' | 'MOTORBIKE';
  photoUrls?: string[];
}

export interface AiChatResponse {
  reply: string;
  isRescueProposal?: boolean;
  proposedOrder?: ProposedRescueOrder;
}

export const aiApi = {
  diagnose: async (payload: AiDiagnosisRequest): Promise<AiDiagnosisResponse> => {
    // axiosClient interceptor đã unwrap response.data -> res là ApiResponse<AiDiagnosisResponse>
    const res: any = await axiosClient.post('/ai/diagnose', payload, { timeout: 60000 });
    return res.data;
  },

  chat: async (payload: AiChatRequest): Promise<AiChatResponse> => {
    const res: any = await axiosClient.post('/ai/chat', payload, { timeout: 60000 });
    return res.data;
  },

  transcribeVoice: async (fileUri: string): Promise<string> => {
    const formData = new FormData();
    const fileName = fileUri.split('/').pop()?.split('?')[0] || `voice_${Date.now()}.m4a`;
    const ext = /\.(\w+)$/.exec(fileName)?.[1]?.toLowerCase();
    const mime =
      ext === 'wav'
        ? 'audio/wav'
        : ext === 'mp3'
        ? 'audio/mp3'
        : ext === 'webm'
        ? 'audio/webm'
        : 'audio/mp4';

    if (Platform.OS === 'web' || fileUri.startsWith('blob:') || fileUri.startsWith('data:')) {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      formData.append('file', blob, fileName);
    } else {
      formData.append('file', { uri: fileUri, name: fileName, type: mime } as any);
    }

    const res: any = await axiosClient.post('/ai/transcribe-voice', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return (res?.data?.text || res?.text || '') as string;
  },
};


