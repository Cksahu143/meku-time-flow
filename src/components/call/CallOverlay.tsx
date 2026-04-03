import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, PhoneIncoming } from 'lucide-react';
import { CallStatus, CallType } from '@/hooks/useWebRTC';
import { motion, AnimatePresence } from 'framer-motion';

interface CallOverlayProps {
  status: CallStatus;
  callType: CallType;
  remoteUserName: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
  duration: number;
  isIncoming: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  onAnswer: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const CallOverlay: React.FC<CallOverlayProps> = ({
  status,
  callType,
  remoteUserName,
  isMuted,
  isVideoOff,
  duration,
  isIncoming,
  localVideoRef,
  remoteVideoRef,
  onAnswer,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo,
}) => {
  const localVideoContainerRef = useRef<HTMLDivElement>(null);
  const remoteVideoContainerRef = useRef<HTMLDivElement>(null);

  // Attach video refs to DOM
  useEffect(() => {
    if (localVideoRef.current && localVideoContainerRef.current) {
      localVideoContainerRef.current.appendChild(localVideoRef.current);
    }
    if (remoteVideoRef.current && remoteVideoContainerRef.current) {
      remoteVideoContainerRef.current.appendChild(remoteVideoRef.current);
    }
  }, [status]);

  if (status === 'idle') return null;

  const statusText = status === 'calling' ? 'Calling...'
    : status === 'ringing' ? 'Incoming call...'
    : status === 'connected' ? formatDuration(duration)
    : 'Call ended';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-between"
      >
        {/* Video area */}
        {callType === 'video' && status === 'connected' && (
          <>
            {/* Remote video - fullscreen */}
            <div className="absolute inset-0 bg-black">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            {/* Local video - picture-in-picture */}
            <div className="absolute top-4 right-4 w-32 h-44 rounded-2xl overflow-hidden border-2 border-background/50 shadow-lg z-10">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
          </>
        )}

        {/* Avatar and status for voice calls or pre-connect */}
        {(callType === 'voice' || status !== 'connected') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10">
            <motion.div
              animate={status === 'ringing' || status === 'calling' ? {
                scale: [1, 1.1, 1],
              } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Avatar className="h-28 w-28 border-4 border-primary/30">
                <AvatarFallback className="bg-primary/20 text-primary text-4xl font-bold">
                  {remoteUserName?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </motion.div>

            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">{remoteUserName || 'Unknown'}</h2>
              <p className="text-muted-foreground text-lg">
                {isIncoming && status === 'ringing' ? (
                  <span className="flex items-center gap-2 justify-center">
                    <PhoneIncoming className="h-5 w-5 text-green-500 animate-bounce" />
                    {callType === 'video' ? 'Incoming video call' : 'Incoming voice call'}
                  </span>
                ) : statusText}
              </p>
            </div>

            {/* Pulse ring animation for ringing/calling */}
            {(status === 'ringing' || status === 'calling') && (
              <div className="relative">
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-primary/30"
                  animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{ width: 120, height: 120, marginLeft: -60, marginTop: -60 }}
                />
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="pb-12 pt-6 z-10 w-full">
          {/* Incoming call: answer + reject */}
          {status === 'ringing' && isIncoming && (
            <div className="flex items-center justify-center gap-16">
              <div className="flex flex-col items-center gap-2">
                <Button
                  onClick={onReject}
                  size="icon"
                  className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg"
                >
                  <PhoneOff className="h-7 w-7" />
                </Button>
                <span className="text-xs text-muted-foreground">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Button
                  onClick={onAnswer}
                  size="icon"
                  className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 shadow-lg"
                >
                  <Phone className="h-7 w-7" />
                </Button>
                <span className="text-xs text-muted-foreground">Accept</span>
              </div>
            </div>
          )}

          {/* Calling: cancel */}
          {status === 'calling' && (
            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-2">
                <Button
                  onClick={onEnd}
                  size="icon"
                  className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg"
                >
                  <PhoneOff className="h-7 w-7" />
                </Button>
                <span className="text-xs text-muted-foreground">Cancel</span>
              </div>
            </div>
          )}

          {/* Connected: mute, video, end */}
          {status === 'connected' && (
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <Button
                  onClick={onToggleMute}
                  size="icon"
                  variant={isMuted ? 'destructive' : 'secondary'}
                  className="h-14 w-14 rounded-full"
                >
                  {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
                <span className="text-xs text-muted-foreground">{isMuted ? 'Unmute' : 'Mute'}</span>
              </div>

              {callType === 'video' && (
                <div className="flex flex-col items-center gap-2">
                  <Button
                    onClick={onToggleVideo}
                    size="icon"
                    variant={isVideoOff ? 'destructive' : 'secondary'}
                    className="h-14 w-14 rounded-full"
                  >
                    {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                  </Button>
                  <span className="text-xs text-muted-foreground">{isVideoOff ? 'Camera on' : 'Camera off'}</span>
                </div>
              )}

              <div className="flex flex-col items-center gap-2">
                <Button
                  onClick={onEnd}
                  size="icon"
                  className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
                <span className="text-xs text-muted-foreground">End</span>
              </div>
            </div>
          )}

          {/* Ended */}
          {status === 'ended' && (
            <div className="flex justify-center">
              <p className="text-muted-foreground">Call ended</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
