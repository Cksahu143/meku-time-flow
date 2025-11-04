import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CameraCaptureProps {
  onCapture: (file: File) => Promise<void>;
  disabled?: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [sending, setSending] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      
      setStream(mediaStream);
      setIsOpen(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error: any) {
      toast({
        title: 'Camera Error',
        description: error.message || 'Could not access camera',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsOpen(false);
    setCapturedImage(null);
  };

  const switchCamera = async () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setTimeout(startCamera, 100);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    
    // Stop camera after capture
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleSend = async () => {
    if (!capturedImage) return;

    try {
      setSending(true);

      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Create file from blob
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      await onCapture(file);
      
      stopCamera();
      
      toast({
        title: 'Photo sent',
        description: 'Your photo has been sent to the group',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send photo',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={startCamera}
        disabled={disabled || isOpen}
      >
        <Camera className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-card border-b">
            <h2 className="font-semibold">Take Photo</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={stopCamera}
              disabled={sending}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Camera View / Preview */}
          <div className="flex-1 relative bg-black flex items-center justify-center">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="max-w-full max-h-full"
                />
                <canvas ref={canvasRef} className="hidden" />
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Captured"
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>

          {/* Controls */}
          <div className="p-6 bg-card border-t">
            {!capturedImage ? (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={switchCamera}
                  className="h-12 w-12"
                >
                  <RotateCw className="h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  onClick={capturePhoto}
                  className="h-16 w-16 rounded-full"
                >
                  <div className="h-12 w-12 rounded-full border-4 border-background" />
                </Button>
                <div className="w-12" />
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleRetake}
                  disabled={sending}
                  className="flex-1"
                >
                  Retake
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex-1"
                >
                  {sending ? 'Sending...' : 'Send Photo'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
