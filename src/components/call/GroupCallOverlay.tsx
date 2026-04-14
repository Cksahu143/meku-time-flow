import React, { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff, Users } from 'lucide-react';
import type { CallType } from '@/hooks/useWebRTC';
import type { GroupCallParticipant } from '@/hooks/useGroupCall';

interface GroupCallOverlayProps {
  status: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
  groupName: string | null;
  invitedByName: string | null;
  callType: CallType;
  isIncoming: boolean;
  participants: GroupCallParticipant[];
  isMuted: boolean;
  isVideoOff: boolean;
  onAnswer: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

const ParticipantTile = ({ participant, callType }: { participant: GroupCallParticipant; callType: CallType }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasVideoTrack = participant.stream?.getVideoTracks().some((track) => track.enabled) ?? false;

  useEffect(() => {
    if (videoRef.current && participant.stream && callType === 'video') {
      videoRef.current.srcObject = participant.stream;
      videoRef.current.play().catch(() => undefined);
    }

    if (audioRef.current && participant.stream && !participant.isLocal) {
      audioRef.current.srcObject = participant.stream;
      audioRef.current.play().catch(() => undefined);
    }
  }, [participant.stream, participant.isLocal, callType]);

  const initials = participant.name.charAt(0).toUpperCase();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card/90 p-4 shadow-lg">
      {!participant.isLocal && <audio ref={audioRef} autoPlay playsInline className="hidden" />}
      {callType === 'video' && hasVideoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full min-h-48 w-full rounded-2xl object-cover"
          style={participant.isLocal ? { transform: 'scaleX(-1)' } : undefined}
        />
      ) : (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl bg-muted/60 text-center">
          <Avatar className="h-20 w-20 border border-border">
            <AvatarImage src={participant.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <p className="mt-4 text-base font-semibold text-foreground">{participant.name}</p>
          <p className="text-sm text-muted-foreground capitalize">{participant.status}</p>
        </div>
      )}

      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl bg-background/80 px-3 py-2 backdrop-blur">
        <div>
          <p className="text-sm font-medium text-foreground">{participant.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{participant.isLocal ? 'You' : participant.status}</p>
        </div>
        {participant.isLocal && (
          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">Local</span>
        )}
      </div>
    </div>
  );
};

export const GroupCallOverlay: React.FC<GroupCallOverlayProps> = ({
  status,
  groupName,
  invitedByName,
  callType,
  isIncoming,
  participants,
  isMuted,
  isVideoOff,
  onAnswer,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo,
}) => {
  if (status === 'idle') return null;

  const title = groupName || 'Group call';
  const subtitle = status === 'ringing'
    ? `${invitedByName || 'Someone'} invited you to a ${callType} call`
    : status === 'connected'
      ? `${participants.length} participant${participants.length === 1 ? '' : 's'} in call`
      : status === 'ended'
        ? 'Call ended'
        : `Inviting members to this ${callType} call`;

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-background/95 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-primary">
            <Users className="h-4 w-4" />
            Group calling
          </div>
          <h2 className="mt-1 text-2xl font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {participants.map((participant) => (
            <ParticipantTile key={participant.userId} participant={participant} callType={callType} />
          ))}
        </div>
      </div>

      <div className="border-t border-border px-6 py-5">
        {status === 'ringing' && isIncoming ? (
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" variant="secondary" className="rounded-full px-6" onClick={onReject}>
              <PhoneOff className="mr-2 h-5 w-5" />
              Decline
            </Button>
            <Button size="lg" className="rounded-full px-6" onClick={onAnswer}>
              <Phone className="mr-2 h-5 w-5" />
              Join call
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="icon" variant="secondary" className="h-14 w-14 rounded-full" onClick={onToggleMute}>
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            {callType === 'video' && (
              <Button size="icon" variant="secondary" className="h-14 w-14 rounded-full" onClick={onToggleVideo}>
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </Button>
            )}
            <Button size="icon" className="h-14 w-14 rounded-full" onClick={onEnd}>
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};