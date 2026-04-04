import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, PhoneIncoming } from 'lucide-react';
import { CallStatus, CallType } from '@/hooks/useWebRTC';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { startRingtone, stopRingtone, startDialTone, stopDialTone, playEndTone } from '@/utils/callSounds';

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

const SlideToAnswer: React.FC<{ onAnswer: () => void }> = ({ onAnswer }) => {
  const x = useMotionValue(0);
  const maxSlide = 220;
  const background = useTransform(x, [0, maxSlide], ['hsl(var(--primary) / 0.15)', 'hsl(var(--primary) / 0.5)']);
  const iconOpacity = useTransform(x, [0, maxSlide * 0.8, maxSlide], [1, 0.5, 0]);
  const [answered, setAnswered] = useState(false);

  return (
    <div className="relative w-72 h-16 rounded-full bg-primary/10 border border-primary/20 overflow-hidden">
      {/* Shimmer hint */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
        animate={{ x: [-300, 300] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
      />
      {/* Label */}
      <motion.span
        className="absolute inset-0 flex items-center justify-center text-sm font-medium text-primary/60 select-none"
        style={{ opacity: iconOpacity }}
      >
        Slide to answer →
      </motion.span>
      {/* Draggable thumb */}
      <motion.div
        className="absolute top-1 left-1 h-14 w-14 rounded-full bg-primary flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg z-10"
        drag="x"
        dragConstraints={{ left: 0, right: maxSlide }}
        dragElastic={0}
        style={{ x }}
        onDragEnd={(_, info) => {
          if (info.point.x > 0 && x.get() > maxSlide * 0.75 && !answered) {
            setAnswered(true);
            onAnswer();
          }
        }}
      >
        <Phone className="h-6 w-6 text-primary-foreground" />
      </motion.div>
    </div>
  );
};

export const CallOverlay: React.FC<CallOverlayProps> = ({
  status, callType, remoteUserName, isMuted, isVideoOff, duration,
  isIncoming, localVideoRef, remoteVideoRef,
  onAnswer, onReject, onEnd, onToggleMute, onToggleVideo,
}) => {
  // Sound effects
  useEffect(() => {
    if (status === 'ringing' && isIncoming) startRingtone();
    else if (status === 'calling' && !isIncoming) startDialTone();
    else if (status === 'connected' || status === 'idle') { stopRingtone(); stopDialTone(); }
    else if (status === 'ended') { stopRingtone(); stopDialTone(); playEndTone(); }
    return () => { stopRingtone(); stopDialTone(); };
  }, [status, isIncoming]);

  if (status === 'idle') return null;

  const initials = remoteUserName?.charAt(0).toUpperCase() || '?';
  const name = remoteUserName || 'Unknown';

  const statusLabel = status === 'calling' ? 'Calling...'
    : status === 'ringing' ? (callType === 'video' ? 'Incoming video call' : 'Incoming voice call')
    : status === 'connected' ? formatDuration(duration)
    : 'Call ended';

  return (
    <AnimatePresence>
      <motion.div
        key="call-overlay"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-[100] flex flex-col"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/80 backdrop-blur-2xl" />

        {/* Video layer for connected video calls */}
        {callType === 'video' && status === 'connected' && (
          <>
            <div className="absolute inset-0 bg-black z-0">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-6 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-background/40 shadow-2xl z-10"
            >
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            </motion.div>
          </>
        )}

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center justify-between h-full py-12 px-6">
          {/* Top: Caller info */}
          <div className="flex flex-col items-center gap-4 mt-8">
            {/* Pulsing rings for ringing/calling */}
            <div className="relative">
              {(status === 'ringing' || status === 'calling') && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary/40"
                    animate={{ scale: [1, 2], opacity: [0.6, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
                    style={{ width: 128, height: 128, marginLeft: -16, marginTop: -16 }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary/20"
                    animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                    style={{ width: 128, height: 128, marginLeft: -16, marginTop: -16 }}
                  />
                </>
              )}
              <motion.div
                animate={status === 'ringing' || status === 'calling' ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Avatar className="h-24 w-24 border-4 border-primary/30 shadow-xl">
                  <AvatarFallback className="bg-primary/20 text-primary text-3xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-foreground">{name}</h2>
              <p className="text-muted-foreground text-base flex items-center gap-2 justify-center">
                {status === 'ringing' && isIncoming && (
                  <PhoneIncoming className="h-4 w-4 text-primary animate-bounce" />
                )}
                {statusLabel}
              </p>
            </div>

            {/* EDAS branding */}
            <span className="text-xs text-muted-foreground/50 tracking-widest uppercase mt-2">EDAS Call</span>
          </div>

          {/* Middle spacer */}
          <div className="flex-1" />

          {/* Bottom: Controls */}
          <div className="w-full max-w-sm">
            {/* Incoming: slide to answer + decline button */}
            {status === 'ringing' && isIncoming && (
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center gap-6"
              >
                <SlideToAnswer onAnswer={onAnswer} />
                <Button
                  onClick={onReject}
                  size="lg"
                  className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground px-8 gap-2"
                >
                  <PhoneOff className="h-5 w-5" />
                  Decline
                </Button>
              </motion.div>
            )}

            {/* Outgoing: cancel */}
            {status === 'calling' && (
              <div className="flex justify-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-2">
                  <Button
                    onClick={onEnd}
                    size="icon"
                    className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg"
                  >
                    <PhoneOff className="h-7 w-7" />
                  </Button>
                  <span className="text-xs text-muted-foreground">Cancel</span>
                </motion.div>
              </div>
            )}

            {/* Connected: mute, video, end */}
            {status === 'connected' && (
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center justify-center gap-6"
              >
                <ControlButton
                  onClick={onToggleMute}
                  active={isMuted}
                  icon={isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  label={isMuted ? 'Unmute' : 'Mute'}
                />
                {callType === 'video' && (
                  <ControlButton
                    onClick={onToggleVideo}
                    active={isVideoOff}
                    icon={isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                    label={isVideoOff ? 'Camera on' : 'Camera off'}
                  />
                )}
                <div className="flex flex-col items-center gap-2">
                  <Button
                    onClick={onEnd}
                    size="icon"
                    className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg"
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                  <span className="text-xs text-muted-foreground">End</span>
                </div>
              </motion.div>
            )}

            {/* Ended */}
            {status === 'ended' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                <p className="text-muted-foreground text-lg">Call ended</p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const ControlButton: React.FC<{
  onClick: () => void;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}> = ({ onClick, active, icon, label }) => (
  <div className="flex flex-col items-center gap-2">
    <Button
      onClick={onClick}
      size="icon"
      variant="secondary"
      className={`h-14 w-14 rounded-full transition-colors ${active ? 'bg-destructive/20 text-destructive hover:bg-destructive/30' : 'bg-secondary hover:bg-secondary/80'}`}
    >
      {icon}
    </Button>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);
