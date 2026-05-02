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
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteMediaStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callStateRef = useRef(callState);
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iceCandidateRetryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signalQueueRef = useRef<Array<{ type: string; data?: unknown }>>([]);
  const channelReadyRef = useRef(false);
  const localIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
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

  // Listen for call actions from Service Worker notifications
  const answerCallRef = useRef<() => void>(() => {});
  const rejectCallRef = useRef<() => void>(() => {});

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'CALL_ACTION') {
        if (event.data.action === 'answer' && callStateRef.current.status === 'ringing') {
          answerCallRef.current();
        } else if (event.data.action === 'reject' && callStateRef.current.status === 'ringing') {
          rejectCallRef.current();
        }
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  const flushSignalQueue = useCallback(async () => {
    if (!broadcastChannelRef.current || !channelReadyRef.current) return;

    const queuedSignals = [...signalQueueRef.current];
    signalQueueRef.current = [];

    for (const signal of queuedSignals) {
      const response = await broadcastChannelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: { ...signal, from: currentUserId },
      });

      if (response !== 'ok') {
        signalQueueRef.current.unshift(signal);
        break;
      }
    }
  }, [currentUserId]);

  const sendSignal = useCallback(async (type: string, data?: unknown) => {
    const signal = { type, data };

    if (!broadcastChannelRef.current || !channelReadyRef.current) {
      signalQueueRef.current.push(signal);
      return;
    }

    const response = await broadcastChannelRef.current.send({
      type: 'broadcast',
      event: 'signal',
      payload: { ...signal, from: currentUserId },
    });

    if (response !== 'ok') {
      signalQueueRef.current.push(signal);
    }
  }, [currentUserId]);

  const rebroadcastLocalIceCandidates = useCallback((attempts = 8) => {
    if (iceCandidateRetryRef.current) clearInterval(iceCandidateRetryRef.current);

    let attempt = 0;
    iceCandidateRetryRef.current = setInterval(() => {
      if (callStateRef.current.status === 'idle' || callStateRef.current.status === 'ended') {
        if (iceCandidateRetryRef.current) clearInterval(iceCandidateRetryRef.current);
        iceCandidateRetryRef.current = null;
        return;
      }

      localIceCandidatesRef.current.forEach((candidate) => {
        void sendSignal('ice-candidate', candidate);
      });

      attempt += 1;
      if (attempt >= attempts) {
        if (iceCandidateRetryRef.current) clearInterval(iceCandidateRetryRef.current);
        iceCandidateRetryRef.current = null;
      }
    }, 500);
  }, [sendSignal]);

  // Listen for incoming calls via Broadcast
  useEffect(() => {
    if (!currentUserId) return;

    const handleIncomingCall = async (msg: {
      callId: string;
      callerId: string;
      callerName: string;
      callType: CallType;
    }) => {
      if (callStateRef.current.status !== 'idle') return;

      // Show persistent OS notification
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
    };

    const channel = supabase
      .channel(`user-calls-${currentUserId}`)
      .on('broadcast', { event: 'incoming-call' }, (payload) => {
        handleIncomingCall(payload.payload as any);
      })
      .subscribe();

    // DB polling fallback
    const pollInterval = setInterval(async () => {
      if (callStateRef.current.status !== 'idle') return;
      try {
        const { data } = await supabase
          .from('call_signals')
          .select('id, caller_id, call_type')
          .eq('callee_id', currentUserId)
          .eq('status', 'ringing')
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const call = data[0];
          const { data: profile } = await supabase.from('profiles').select('display_name, username').eq('id', call.caller_id).maybeSingle();
          const callerName = profile?.display_name || profile?.username || 'Unknown';
          handleIncomingCall({
            callId: call.id,
            callerId: call.caller_id,
            callerName,
            callType: call.call_type as CallType,
          });
        }
      } catch { /* ignore */ }
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [currentUserId]);

  // Per-call signaling channel
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

        if (msg.from === currentUserId) return;

        const pc = peerConnectionRef.current;

        switch (msg.type) {
          case 'offer':
            if (pc) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(msg.data as RTCSessionDescriptionInit));
                for (const c of pendingCandidatesRef.current) {
                  try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* */ }
                }
                pendingCandidatesRef.current = [];
              } catch (e) {
                console.error('Error setting offer:', e);
              }
            }
            break;

          case 'answer':
            if (pc) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(msg.data as RTCSessionDescriptionInit));
                for (const c of pendingCandidatesRef.current) {
                  try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* */ }
                }
                pendingCandidatesRef.current = [];
                // Immediately transition caller to connected
                setCallState(prev => {
                  if (prev.status === 'calling') return { ...prev, status: 'connected' };
                  return prev;
                });
                // Start duration timer
                if (!durationTimerRef.current) {
                  durationTimerRef.current = setInterval(() => {
                    setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
                  }, 1000);
                }
                // Clear retry intervals
                if (retryIntervalRef.current) { clearInterval(retryIntervalRef.current); retryIntervalRef.current = null; }
                if (answerPollRef.current) { clearInterval(answerPollRef.current); answerPollRef.current = null; }
              } catch (e) {
                console.error('Error setting answer:', e);
              }
            }
            break;

          case 'ice-candidate':
            if (pc && pc.remoteDescription) {
              try { await pc.addIceCandidate(new RTCIceCandidate(msg.data as RTCIceCandidateInit)); } catch { /* */ }
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelReadyRef.current = true;
          void flushSignalQueue();
        }

        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          channelReadyRef.current = false;
        }
      });

    broadcastChannelRef.current = channel;
    return () => {
      channelReadyRef.current = false;
      signalQueueRef.current = [];
      supabase.removeChannel(channel);
      broadcastChannelRef.current = null;
    };
  }, [callState.callId, currentUserId, flushSignalQueue]);

  const cleanup = useCallback(() => {
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
    if (retryIntervalRef.current) { clearInterval(retryIntervalRef.current); retryIntervalRef.current = null; }
    if (answerPollRef.current) { clearInterval(answerPollRef.current); answerPollRef.current = null; }
    if (iceCandidateRetryRef.current) { clearInterval(iceCandidateRetryRef.current); iceCandidateRetryRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (remoteMediaStreamRef.current) { remoteMediaStreamRef.current.getTracks().forEach(t => t.stop()); remoteMediaStreamRef.current = null; }
    if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; }
    setLocalStream(null);
    setRemoteStream(null);
    pendingCandidatesRef.current = [];
    signalQueueRef.current = [];
    localIceCandidatesRef.current = [];
    channelReadyRef.current = false;
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const remoteMediaStream = new MediaStream();
    remoteMediaStreamRef.current = remoteMediaStream;
    setRemoteStream(remoteMediaStream);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        void sendSignal('ice-candidate', event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      const stream = remoteMediaStreamRef.current ?? new MediaStream();
      const inboundStream = event.streams[0];

      if (inboundStream) {
        inboundStream.getTracks().forEach((track) => {
          if (!stream.getTracks().some((existingTrack) => existingTrack.id === track.id)) {
            stream.addTrack(track);
          }
        });
      } else if (!stream.getTracks().some((track) => track.id === event.track.id)) {
        stream.addTrack(event.track);
      }

      remoteMediaStreamRef.current = stream;
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => undefined);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        // Ensure we're in connected state
        setCallState(prev => {
          if (prev.status !== 'connected') {
            if (!durationTimerRef.current) {
              durationTimerRef.current = setInterval(() => {
                setCallState(p => ({ ...p, duration: p.duration + 1 }));
              }, 1000);
            }
            return { ...prev, status: 'connected' };
          }
          return prev;
        });
      }
      if (pc.connectionState === 'failed') {
        try {
          pc.restartIce();
          pc.createOffer({ iceRestart: true }).then(offer => {
            pc.setLocalDescription(offer);
            void sendSignal('offer', offer);
          });
        } catch {
          endCall();
        }
      }
      if (pc.connectionState === 'disconnected') {
        setTimeout(() => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            endCall();
          }
        }, 5000);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [sendSignal]);

  const startCall = useCallback(async (remoteUserId: string, remoteUserName: string, callType: CallType) => {
    if (!currentUserId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: callType === 'video' ? { facingMode: 'user' } : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => undefined);
      }

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

      const { data: myProfile } = await supabase.from('profiles').select('display_name, username').eq('id', currentUserId).maybeSingle();
      const callerName = myProfile?.display_name || myProfile?.username || 'Unknown';

      // Notify callee via Broadcast
      const calleeChannel = supabase.channel(`user-calls-${remoteUserId}`);
      await calleeChannel.subscribe();
      await new Promise(r => setTimeout(r, 200));
      await calleeChannel.send({
        type: 'broadcast',
        event: 'incoming-call',
        payload: { callId, callerId: currentUserId, callerName, callType },
      });
      supabase.removeChannel(calleeChannel);

      // Send push notification for device wake-up
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gkkeysrfmgmxoypnjkdl.supabase.co';
        fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
          body: JSON.stringify({
            userId: remoteUserId,
            title: `📞 Incoming ${callType} call`,
            body: `${callerName} is calling you`,
            tag: `call-${callId}`,
            data: { url: '/app', callId },
          }),
        }).catch(e => console.warn('Push notification failed:', e));
      } catch (e) {
        console.warn('Push send error:', e);
      }

      // Create peer connection & offer
      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer via broadcast with queueing support
      void sendSignal('offer', offer);

      // Persist offer to DB as fallback
      await supabase.from('call_signals').update({ offer: offer as unknown as Json }).eq('id', callId);

      // Retry broadcast every 3s
      retryIntervalRef.current = setInterval(async () => {
        if (callStateRef.current.callId !== callId || callStateRef.current.status !== 'calling') {
          if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
          return;
        }
        const retryChannel = supabase.channel(`user-calls-${remoteUserId}-retry-${Date.now()}`);
        await retryChannel.subscribe();
        await new Promise(r => setTimeout(r, 150));
        await retryChannel.send({
          type: 'broadcast',
          event: 'incoming-call',
          payload: { callId, callerId: currentUserId, callerName, callType },
        });
        supabase.removeChannel(retryChannel);
      }, 3000);

      // Poll DB for answer (fallback if broadcast answer is missed)
      answerPollRef.current = setInterval(async () => {
        if (callStateRef.current.callId !== callId || callStateRef.current.status !== 'calling') {
          if (answerPollRef.current) clearInterval(answerPollRef.current);
          return;
        }
        try {
          const { data: sig } = await supabase
            .from('call_signals')
            .select('status, answer')
            .eq('id', callId)
            .maybeSingle();
          if (sig?.status === 'answered' && sig.answer && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.answer as unknown as RTCSessionDescriptionInit));
            for (const c of pendingCandidatesRef.current) {
              try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* */ }
            }
            pendingCandidatesRef.current = [];
            setCallState(prev => ({ ...prev, status: 'connected' }));
            if (!durationTimerRef.current) {
              durationTimerRef.current = setInterval(() => {
                setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
              }, 1000);
            }
            if (answerPollRef.current) { clearInterval(answerPollRef.current); answerPollRef.current = null; }
            if (retryIntervalRef.current) { clearInterval(retryIntervalRef.current); retryIntervalRef.current = null; }
          } else if (sig?.status === 'rejected' || sig?.status === 'missed') {
            cleanup();
            setCallState(prev => ({ ...prev, status: 'ended' }));
            setTimeout(() => setCallState(INITIAL_STATE), 2000);
          }
        } catch { /* ignore */ }
      }, 2000);

      // Auto-end after 30s
      setTimeout(async () => {
        if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
        if (answerPollRef.current) clearInterval(answerPollRef.current);
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
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: callState.callType === 'video' ? { facingMode: 'user' } : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => undefined);
      }

      // Get offer from DB (fallback)
      const { data: callData } = await supabase
        .from('call_signals')
        .select('offer')
        .eq('id', callState.callId)
        .maybeSingle();

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      if (!pc.remoteDescription && callData?.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(callData.offer as unknown as RTCSessionDescriptionInit));
      }

      // Flush pending candidates
      for (const c of pendingCandidatesRef.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* */ }
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer via broadcast (instant) - retry a few times
      void sendSignal('answer', answer);
      setTimeout(() => { void sendSignal('answer', answer); }, 500);
      setTimeout(() => { void sendSignal('answer', answer); }, 1500);

      // Persist to DB
      await supabase.from('call_signals').update({
        answer: answer as unknown as Json,
        status: 'answered',
        started_at: new Date().toISOString(),
      }).eq('id', callState.callId);

      // Transition to connected immediately
      setCallState(prev => ({ ...prev, status: 'connected', isIncoming: false }));

      // Start duration timer
      if (!durationTimerRef.current) {
        durationTimerRef.current = setInterval(() => {
          setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
        }, 1000);
      }

      // Dismiss notification
      try {
        const reg = await navigator.serviceWorker?.ready;
        const notifications = await reg?.getNotifications({ tag: `call-${callState.callId}` });
        notifications?.forEach(n => n.close());
      } catch { /* */ }
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
    // Dismiss notification
    try {
      const reg = await navigator.serviceWorker?.ready;
      const notifications = await reg?.getNotifications({ tag: `call-${callState.callId}` });
      notifications?.forEach(n => n.close());
    } catch { /* */ }
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

  answerCallRef.current = answerCall;
  rejectCallRef.current = rejectCall;

  return {
    callState, localVideoRef, remoteVideoRef,
    localStream, remoteStream,
    startCall, answerCall, rejectCall, endCall, toggleMute, toggleVideo,
  };
};
