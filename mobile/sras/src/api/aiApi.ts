import { Platform } from 'react-native';
import axiosClient, { BASE_URL, getAccessToken } from './axiosClient';

export interface AiDiagnosisRequest {
  vehicleType: 'CAR' | 'MOTORBIKE';
  vehicleModel?: string;
  customerVehicleId?: number;
  lat?: number;
  lng?: number;
  address?: string;
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
  personalizationNote?: string;
  isFrequentBreakdownLocation?: boolean;
  locationIncidentCount?: number;
}

export interface PastIncidentSummary {
  date: string;
  issueType: string;
  issueTypeName: string;
  vehicleName: string;
  symptom?: string;
}

export interface RoadHazardWarningResponse {
  hasWarning: boolean;
  roadName?: string;
  incidentCount: number;
  pastIncidents?: PastIncidentSummary[];
  aiWarningMessage?: string;
  safetyRecommendations?: string[];
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
  checkRoadHazardWarning: async (params: { lat?: number; lng?: number; address?: string }): Promise<RoadHazardWarningResponse> => {
    const res: any = await axiosClient.get('/ai/road-hazard-warning', { params, timeout: 15000 });
    return res.data;
  },

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
    try {
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

      // Ưu tiên 1: Dùng fetch thuần để native bridge React Native tự động tính boundary multipart chuẩn xác
      try {
        const token = getAccessToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const fetchRes = await fetch(`${BASE_URL}/ai/transcribe-voice`, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (fetchRes.ok) {
          const resJson = await fetchRes.json();
          const text = (resJson?.data?.text || resJson?.text || '') as string;
          if (text) return text.trim();
        } else {
          console.warn('[aiApi] Fetch voice failed with status:', fetchRes.status);
        }
      } catch (fetchErr) {
        console.warn('[aiApi] Fetch upload error, trying axios fallback:', fetchErr);
      }

      // Ưu tiên 2 (Fallback): Gửi qua axiosClient (đã được fix xóa Content-Type ở interceptor)
      const res: any = await axiosClient.post('/ai/transcribe-voice', formData, {
        timeout: 45000,
      });
      return (res?.data?.text || res?.text || '') as string;
    } catch (err: any) {
      console.warn('[aiApi] transcribeVoice failed gracefully:', err?.message || err);
      return '';
    }
  },
};


