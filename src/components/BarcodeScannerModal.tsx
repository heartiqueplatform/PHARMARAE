import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    const scannerId = 'barcode-reader-container';

    // Wait for DOM element
    const timer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          scannerId,
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.QR_CODE
            ],
            rememberLastUsedCamera: true
          },
          /* verbose= */ false
        );

        scannerRef.current = scanner;

        scanner.render(
          (decodedText) => {
            if (decodedText) {
              onScanSuccess(decodedText);
              scanner.clear().catch(console.error);
              onClose();
            }
          },
          (errMessage) => {
            // Ignore scan frame error logs
          }
        );
      } catch (e: any) {
        setError(e.message || 'Camera access error or permission denied');
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [isOpen, onClose, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Camera className="w-5 h-5" />
            <span>Scan Product Barcode</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Container */}
        <div className="p-4 flex flex-col items-center">
          {error ? (
            <div className="bg-red-950/50 border border-red-800/80 text-red-200 p-4 rounded-xl text-xs flex items-center gap-2 my-4">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <span>{error}. Please ensure camera permissions are granted.</span>
            </div>
          ) : (
            <div id="barcode-reader-container" className="w-full rounded-xl overflow-hidden text-slate-900" />
          )}

          <p className="text-xs text-slate-400 text-center mt-3">
            Point camera at the drug barcode or QR code on the package.
          </p>
        </div>

        {/* Footer */}
        <div className="bg-slate-800/50 px-4 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
