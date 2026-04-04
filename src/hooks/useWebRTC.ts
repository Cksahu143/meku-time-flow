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
    // TURN servers for NAT traversal behind strict firewalls
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

const INITIAL_STATE: CallState = {
  status: 'idle',
  callId: null,
  callType: 'voice',
  remoteUserId: null,
  remoteUserName: null,
  isMuted: false,
  isVideoOff: false,
  duration: 0,
  isIncoming: false,
};

export const useWebRTC = () => {
  const [callState, setCallState] = useState<CallState>(INITIAL_STATE);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callStateRef = useRef(callState);
  callStateRef.current = callState;

  // Auth state
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Listen for incoming calls via Broadcast (instant, no DB lag)
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`user-calls-${currentUserId}`)
      .on('broadcast', { event: 'incoming-call' }, async (payload) => {
        const msg = payload.payload as {
          callId: string;
          callerId: string;
          callerName: string;
          callType: CallType;
        };
        if (callStateRef.current.status !== 'idle') return;

        // Show persistent OS notification to wake sleeping devices
        try {
          const reg = await navigator.serviceWorker?.ready;
          if (reg?.active) {
            reg.active.postMessage({
              type: 'SHOW_NOTIFICATION',
              title: `📞 Incoming ${msg.callType} call`,
              body: `${msg.callerName} is calling you`,
              tag: `call-${msg.callId}`,
              requireInteraction: true,
              data: { url: '/app', callId: msg.callId },
              actions: [
                { action: 'answer', title: '✅ Answer' },
                { action: 'reject', title: '❌ Decline' },
              ],
            });
          }
        } catch (e) {
          console.warn('Could not show call notification:', e);
        }

        setCallState({
          status: 'ringing',
          callId: msg.callId,
          callType: msg.callType,
          remoteUserId: msg.callerId,
          remoteUserName: msg.callerName,
          isMuted: false,
          isVideoOff: false,
          duration: 0,
          isIncoming: true,
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  // Per-call signaling channel (offer/answer/ICE/hangup via Broadcast)
  useEffect(() => {
    if (!callState.callId) return;

    const channel = supabase
      .channel(`call-signal-${callState.callId}`)
      .on('broadcast', { event: 'signal' }, async (payload) => {
        const msg = payload.payload as {
          type: 'offer' | 'answer' | 'ice-candidate' | 'hangup';
          data?: unknown;
          from: string;
        };

        if (msg.from === currentUserId) return; // ignore own messages

        const pc = peerConnectionRef.current;

        switch (msg.type) {
          case 'offer':
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.data as RTCSessionDescriptionInit));
              // Flush pending ICE candidates
              for (const c of pendingCandidatesRef.current) {
                try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
              }
              pendingCandidatesRef.current = [];
            }
            break;

          case 'answer':
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.data as RTCSessionDescriptionInit));
              for (const c of pendingCandidatesRef.current) {
                try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
              }
              pendingCandidatesRef.current = [];
            }
            break;

          case 'ice-candidate':
            if (pc && pc.remoteDescription) {
              try { await pc.addIceCandidate(new RTCIceCandidate(msg.data as RTCIceCandidateInit)); } catch { /* ignore */ }
            } else {
              pendingCandidatesRef.current.push(msg.data as RTCIceCandidateInit);
            }
            break;

          case 'hangup':
            cleanup();
            setCallState(prev => ({ ...prev, status: 'ended' }));
            setTimeout(() => setCallState(INITIAL_STATE), 2000);
            break;
        }
      })
      .subscribe();

    broadcastChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); broadcastChannelRef.current = null; };
  }, [callState.callId, currentUserId]);

  const sendSignal = useCallback((type: string, data?: unknown) => {
    broadcastChannelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: { type, data, from: currentUserId },
    });
  }, [currentUserId]);

  const cleanup = useCallback(() => {
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; }
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('ice-candidate', event.candidate.toJSON());
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
  }, [sendSignal]);

  const startCall = useCallback(async (remoteUserId: string, remoteUserName: string, callType: CallType) => {
    if (!currentUserId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Persist to DB
      const { data: callData, error } = await supabase
        .from('call_signals')
        .insert({ caller_id: currentUserId, callee_id: remoteUserId, call_type: callType, status: 'ringing' })
        .select()
        .single();

      if (error || !callData) throw new Error('Failed to create call');

      const callId = callData.id;

      setCallState({
        status: 'calling',
        callId,
        callType,
        remoteUserId,
        remoteUserName,
        isMuted: false,
        isVideoOff: false,
        duration: 0,
        isIncoming: false,
      });

      // Notify callee instantly via Broadcast
      const calleeChannel = supabase.channel(`user-calls-${remoteUserId}`);
      await calleeChannel.subscribe();
      await calleeChannel.send({
        type: 'broadcast',
        event: 'incoming-call',
        payload: { callId, callerId: currentUserId, callerName: remoteUserName, callType },
      });
      // We need the callerName from our profile, not the remote user's name
      const { data: myProfile } = await supabase.from('profiles').select('display_name, username').eq('id', currentUserId).maybeSingle();
      await calleeChannel.send({
        type: 'broadcast',
        event: 'incoming-call',
        payload: { callId, callerId: currentUserId, callerName: myProfile?.display_name || myProfile?.username || 'Unknown', callType },
      });
      supabase.removeChannel(calleeChannel);

      // Create peer connection & offer
      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer via broadcast (the signal channel for this callId is set up by the useEffect above)
      // Small delay to ensure signal channel is subscribed
      setTimeout(() => sendSignal('offer', offer), 300);

      // Also persist offer to DB as fallback
      await supabase.from('call_signals').update({ offer: offer as unknown as Json }).eq('id', callId);

      // Auto-end after 30s
      setTimeout(async () => {
        if (callStateRef.current.callId === callId && callStateRef.current.status === 'calling') {
          await supabase.from('call_signals').update({ status: 'missed', ended_at: new Date().toISOString() }).eq('id', callId);
          sendSignal('hangup');
          cleanup();
          setCallState(INITIAL_STATE);
        }
      }, 30000);

    } catch (err) {
      console.error('Error starting call:', err);
      cleanup();
      setCallState(INITIAL_STATE);
    }
  }, [currentUserId, createPeerConnection, sendSignal, cleanup]);

  const answerCall = useCallback(async () => {
    if (!callState.callId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callState.callType === 'video',
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Get offer from DB (fallback if broadcast offer was missed)
      const { data: callData } = await supabase
        .from('call_signals')
        .select('offer')
        .eq('id', callState.callId)
        .maybeSingle();

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Use offer from DB if peer connection doesn't have remote description yet
      if (!pc.remoteDescription && callData?.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(callData.offer as unknown as RTCSessionDescriptionInit));
      }

      // Flush pending candidates
      for (const c of pendingCandidatesRef.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer via broadcast (instant)
      sendSignal('answer', answer);

      // Persist to DB
      await supabase.from('call_signals').update({
        answer: answer as unknown as Json,
        status: 'answered',
        started_at: new Date().toISOString(),
      }).eq('id', callState.callId);

      setCallState(prev => ({ ...prev, status: 'connected', isIncoming: false }));
    } catch (err) {
      console.error('Error answering call:', err);
      cleanup();
      setCallState(INITIAL_STATE);
    }
  }, [callState.callId, callState.callType, createPeerConnection, sendSignal, cleanup]);

  const rejectCall = useCallback(async () => {
    if (!callState.callId) return;
    sendSignal('hangup');
    await supabase.from('call_signals').update({ status: 'rejected', ended_at: new Date().toISOString() }).eq('id', callState.callId);
    cleanup();
    setCallState(INITIAL_STATE);
  }, [callState.callId, sendSignal, cleanup]);

  const endCall = useCallback(async () => {
    if (callState.callId) {
      sendSignal('hangup');
      await supabase.from('call_signals').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', callState.callId);
    }
    cleanup();
    setTimeout(() => setCallState(INITIAL_STATE), 1500);
  }, [callState.callId, sendSignal, cleanup]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setCallState(prev => ({ ...prev, isMuted: !track.enabled })); }
  }, []);

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCallState(prev => ({ ...prev, isVideoOff: !track.enabled })); }
  }, []);

  return { callState, localVideoRef, remoteVideoRef, startCall, answerCall, rejectCall, endCall, toggleMute, toggleVideo };
};
