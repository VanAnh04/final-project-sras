import axiosClient from './axiosClient';

export interface VehiclePhotoAnalysisResult {
  vehiclePresent: boolean;
  isRescueVehicle?: boolean;
  detectedKind?: 'TOW_TRUCK' | 'MOTORBIKE' | 'VAN' | 'OTHER';
  detectedKindDescription?: string;
  detectedPlate?: string;
  normalizedPlate?: string;
  confidenceScore?: number;
  plateMatch?: boolean | null;
  kindMatch?: boolean | null;
  photoQuality?: string;
  isScreenCapture?: boolean;
  status: 'VERIFIED' | 'WARNING' | 'REJECTED' | 'UNVERIFIED';
  message: string;
  suggestion?: string;
}

export interface DocumentPhotoAnalysisResult {
  docType: string;
  validDocument: boolean;
  confidenceScore?: number;
  photoQuality?: string;
  isScreenCapture?: boolean;
  status: 'VERIFIED' | 'WARNING' | 'REJECTED' | 'UNVERIFIED';
  message: string;
  extractedData?: Record<string, any>;
}

export interface GarageDossierAnalysisResult {
  overallScore: number;
  overallStatus: 'VERIFIED' | 'WARNING' | 'REJECTED' | 'UNVERIFIED';
  summaryText: string;
  idCardFront?: DocumentPhotoAnalysisResult;
  idCardBack?: DocumentPhotoAnalysisResult;
  businessLicense?: DocumentPhotoAnalysisResult;
  facadePhoto?: DocumentPhotoAnalysisResult;
  representativeMatched?: boolean;
  representativeComparison?: string;
  garageNameMatched?: boolean;
  garageNameComparison?: string;
  addressMatched?: boolean;
  addressComparison?: string;
  warnings?: string[];
  recommendations?: string[];
}

export const aiVerifyApi = {
  verifyVehiclePhoto: async (
    photoUrl: string,
    expectedPlate?: string,
    expectedKind?: string
  ): Promise<VehiclePhotoAnalysisResult> => {
    const res: any = await axiosClient.post(
      '/ai/verify/vehicle-photo',
      {
        photoUrl,
        expectedPlate: expectedPlate || undefined,
        expectedKind: expectedKind || undefined,
      },
      { timeout: 45000 }
    );
    return (res?.data !== undefined ? res.data : res) as VehiclePhotoAnalysisResult;
  },

  verifyDocumentPhoto: async (
    photoUrl: string,
    docType: string,
    expectedName?: string,
    expectedAddress?: string
  ): Promise<DocumentPhotoAnalysisResult> => {
    const res: any = await axiosClient.post(
      '/ai/verify/document-photo',
      {
        photoUrl,
        docType,
        expectedName: expectedName || undefined,
        expectedAddress: expectedAddress || undefined,
      },
      { timeout: 45000 }
    );
    return (res?.data !== undefined ? res.data : res) as DocumentPhotoAnalysisResult;
  },

  verifyGarageDossier: async (payload: {
    garageName?: string;
    ownerName?: string;
    phone?: string;
    address?: string;
    idCardFrontUrl?: string;
    idCardBackUrl?: string;
    businessLicenseUrl?: string;
    facadePhotoUrl?: string;
  }): Promise<GarageDossierAnalysisResult> => {
    const res: any = await axiosClient.post('/ai/verify/garage-dossier', payload, { timeout: 60000 });
    return (res?.data !== undefined ? res.data : res) as GarageDossierAnalysisResult;
  },
};

