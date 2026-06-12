// Web stub — CameraScanner is native-only. Web uses the hidden <input capture> approach in sell.tsx.
export interface ScanResult {
  imageUri: string;
  barcode?: { type: string; data: string };
  productName?: string;
  scanData?: any;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onCapture: (result: ScanResult) => void;
}

export default function CameraScanner(_props: Props) {
  return null;
}
