import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
export type CallType = 'voice' | 'video';

interface CallState {
  status: CallStatus;
  callId: string | null;
  callType: CallType;
  remoteUserId: string | null;
  remoteUserName: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
  duration: number;
  isIncoming: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTC = () => {
  const [callState, setCallState] = useState<CallState>({
    status: 'idle',
    callId: null,
    callType: 'voice',
    remoteUserId: null,
    remoteUserName: null,
    isMuted: false,
    isVideoOff: false,
    duration: 0,
    isIncoming: false,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) currentUserIdRef.current = user.id;
    };
    getUser();
  }, []);

  // Listen for incoming calls
  useEffect(() => {
    if (!currentUserIdRef.current) return;

    const incomingChannel = supabase
      .channel('incoming-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `callee_id=eq.${currentUserIdRef.current}`,
        },
        async (payload) => {
          const signal = payload.new as Record<string, unknown>;
          if (signal.status === 'ringing' && callState.status === 'idle') {
            // Fetch caller name
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, username')
              .eq('id', signal.caller_id as string)
              .maybeSingle();

            setCallState({
              status: 'ringing',
              callId: signal.id as string,
              callType: signal.call_type as CallType,
              remoteUserId: signal.caller_id as string,
              remoteUserName: profile?.display_name || profile?.username || 'Unknown',
              isMuted: false,
              isVideoOff: false,
              duration: 0,
              isIncoming: true,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(incomingChannel);
    };
  }, [callState.status]);

  // Subscribe to call signal updates when in a call
  useEffect(() => {
    if (!callState.callId) return;

    const callChannel = supabase
      .channel(`call-${callState.callId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_signals',
          filter: `id=eq.${callState.callId}`,
        },
        async (payload) => {
          const signal = payload.new as Record<string, unknown>;

          if (signal.status === 'answered' && callState.isIncoming === false) {
            // Caller receives answer
            if (signal.answer && peerConnectionRef.current) {
              try {
                await peerConnectionRef.current.setRemoteDescription(
                  new RTCSessionDescription(signal.answer as RTCSessionDescriptionInit)
                );
              } catch (err) {
                console.error('Error setting remote description:', err);
              }
            }
          }

          if (signal.status === 'ended' || signal.status === 'rejected' || signal.status === 'missed') {
            cleanup();
            setCallState(prev => ({ ...prev, status: 'ended' }));
            setTimeout(() => resetCallState(), 2000);
          }

          // Handle ICE candidates
          if (signal.ice_candidates && Array.isArray(signal.ice_candidates)) {
            const candidates = signal.ice_candidates as RTCIceCandidateInit[];
            for (const candidate of candidates) {
              if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
                try {
                  await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                  // Ignore duplicate candidates
                }
              }
            }
          }
        }
      )
      .subscribe();

    channelRef.current = callChannel;

    return () => {
      supabase.removeChannel(callChannel);
    };
  }, [callState.callId, callState.isIncoming]);

  const resetCallState = useCallback(() => {
    setCallState({
      status: 'idle',
      callId: null,
      callType: 'voice',
      remoteUserId: null,
      remoteUserName: null,
      isMuted: false,
      isVideoOff: false,
      duration: 0,
      isIncoming: false,
    });
  }, []);

  const cleanup = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    remoteStreamRef.current = null;
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = async (event) => {
      if (event.candidate && callState.callId) {
        // Fetch current candidates and append
        const { data } = await supabase
          .from('call_signals')
          .select('ice_candidates')
          .eq('id', callState.callId)
          .maybeSingle();

        const existing = (data?.ice_candidates as RTCIceCandidateInit[] | null) || [];
        await supabase
          .from('call_signals')
          .update({ ice_candidates: [...existing, event.candidate.toJSON()] })
          .eq('id', callState.callId);
      }
    };

    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState(prev => ({ ...prev, status: 'connected' }));
        durationTimerRef.current = setInterval(() => {
          setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
        }, 1000);
      }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [callState.callId]);

  const startCall = useCallback(async (remoteUserId: string, remoteUserName: string, callType: CallType) => {
    if (!currentUserIdRef.current) return;

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video',
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create call signal record
      const { data: callData, error } = await supabase
        .from('call_signals')
        .insert({
          caller_id: currentUserIdRef.current,
          callee_id: remoteUserId,
          call_type: callType,
          status: 'ringing',
        })
        .select()
        .single();

      if (error || !callData) throw new Error('Failed to create call signal');

      setCallState({
        status: 'calling',
        callId: callData.id,
        callType,
        remoteUserId,
        remoteUserName,
        isMuted: false,
        isVideoOff: false,
        duration: 0,
        isIncoming: false,
      });

      // Create peer connection and offer
      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await supabase
        .from('call_signals')
        .update({ offer: offer })
        .eq('id', callData.id);

      // Auto-end after 30s if not answered
      setTimeout(async () => {
        const { data } = await supabase
          .from('call_signals')
          .select('status')
          .eq('id', callData.id)
          .maybeSingle();

        if (data?.status === 'ringing') {
          await supabase
            .from('call_signals')
            .update({ status: 'missed', ended_at: new Date().toISOString() })
            .eq('id', callData.id);
          cleanup();
          resetCallState();
        }
      }, 30000);

    } catch (err) {
      console.error('Error starting call:', err);
      cleanup();
      resetCallState();
    }
  }, [createPeerConnection, cleanup, resetCallState]);

  const answerCall = useCallback(async () => {
    if (!callState.callId) return;

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callState.callType === 'video',
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Get the offer
      const { data: callData } = await supabase
        .from('call_signals')
        .select('offer')
        .eq('id', callState.callId)
        .maybeSingle();

      if (!callData?.offer) throw new Error('No offer found');

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer as RTCSessionDescriptionInit));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await supabase
        .from('call_signals')
        .update({
          answer: answer,
          status: 'answered',
          started_at: new Date().toISOString(),
        })
        .eq('id', callState.callId);

      setCallState(prev => ({ ...prev, status: 'connected', isIncoming: false }));

      // Process any pending ICE candidates
      const { data: signalData } = await supabase
        .from('call_signals')
        .select('ice_candidates')
        .eq('id', callState.callId)
        .maybeSingle();

      if (signalData?.ice_candidates && Array.isArray(signalData.ice_candidates)) {
        for (const candidate of signalData.ice_candidates as RTCIceCandidateInit[]) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {
            // Ignore
          }
        }
      }

    } catch (err) {
      console.error('Error answering call:', err);
      cleanup();
      resetCallState();
    }
  }, [callState.callId, callState.callType, createPeerConnection, cleanup, resetCallState]);

  const rejectCall = useCallback(async () => {
    if (!callState.callId) return;
    await supabase
      .from('call_signals')
      .update({ status: 'rejected', ended_at: new Date().toISOString() })
      .eq('id', callState.callId);
    cleanup();
    resetCallState();
  }, [callState.callId, cleanup, resetCallState]);

  const endCall = useCallback(async () => {
    if (callState.callId) {
      await supabase
        .from('call_signals')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', callState.callId);
    }
    cleanup();
    setTimeout(() => resetCallState(), 1500);
  }, [callState.callId, cleanup, resetCallState]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState(prev => ({ ...prev, isVideoOff: !videoTrack.enabled }));
      }
    }
  }, []);

  return {
    callState,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
};
