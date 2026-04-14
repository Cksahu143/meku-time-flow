import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CallType } from '@/hooks/useWebRTC';

type GroupCallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export interface GroupCallInvitee {
  userId: string;
  name: string;
  avatarUrl?: string | null;
}

export interface GroupCallParticipant {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  status: string;
  stream: MediaStream | null;
  isLocal: boolean;
}

interface GroupCallState {
  status: GroupCallStatus;
  callId: string | null;
  groupId: string | null;
  groupName: string | null;
  callType: CallType;
  isIncoming: boolean;
  invitedByName: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
}

interface ParticipantRow {
  user_id: string;
  status: string;
  left_at: string | null;
}

interface GroupSignal {
  from: string;
  to: string | '*';
  type: 'offer' | 'answer' | 'ice-candidate' | 'hangup';
  data?: unknown;
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

const INITIAL_STATE: GroupCallState = {
  status: 'idle',
  callId: null,
  groupId: null,
  groupName: null,
  callType: 'video',
  isIncoming: false,
  invitedByName: null,
  isMuted: false,
  isVideoOff: false,
};

const shouldInitiateOffer = (currentUserId: string, remoteUserId: string) => currentUserId.localeCompare(remoteUserId) < 0;

export const useGroupCall = () => {
  const [callState, setCallState] = useState<GroupCallState>(INITIAL_STATE);
  const [participants, setParticipants] = useState<GroupCallParticipant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const currentUserIdRef = useRef<string | null>(null);
  const callStateRef = useRef(callState);
  const participantRowsRef = useRef<ParticipantRow[]>([]);
  const profilesCacheRef = useRef<Record<string, { name: string; avatarUrl?: string | null }>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamsRef = useRef<Record<string, MediaStream>>({});
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const signalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const participantChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const signalQueueRef = useRef<Array<{ to: string | '*'; type: GroupSignal['type']; data?: unknown }>>([]);
  const signalReadyRef = useRef(false);

  callStateRef.current = callState;
  currentUserIdRef.current = currentUserId;

  const syncParticipants = () => {
    const rows = participantRowsRef.current.filter((row) => !row.left_at);
    const localUserId = currentUserIdRef.current;

    const nextParticipants = rows.map((row) => ({
      userId: row.user_id,
      name: row.user_id === localUserId
        ? 'You'
        : profilesCacheRef.current[row.user_id]?.name || 'Unknown',
      avatarUrl: profilesCacheRef.current[row.user_id]?.avatarUrl,
      status: row.status,
      stream: row.user_id === localUserId
        ? localStreamRef.current
        : remoteStreamsRef.current[row.user_id] ?? null,
      isLocal: row.user_id === localUserId,
    }));

    nextParticipants.sort((a, b) => Number(b.isLocal) - Number(a.isLocal));
    setParticipants(nextParticipants);
  };

  const hydrateProfiles = async (userIds: string[]) => {
    const missingIds = userIds.filter((userId) => userId && !profilesCacheRef.current[userId]);

    if (missingIds.length === 0) {
      return;
    }

    const { data, error } = await supabase
      .from('profiles_secure')
      .select('id, display_name, username, avatar_url')
      .in('id', missingIds);

    if (error) {
      console.error('Failed to load participant profiles:', error);
      return;
    }

    data?.forEach((profile) => {
      profilesCacheRef.current[profile.id] = {
        name: profile.display_name || profile.username || 'Unknown',
        avatarUrl: profile.avatar_url,
      };
    });
  };

  const flushSignalQueue = async () => {
    if (!signalChannelRef.current || !signalReadyRef.current || !currentUserIdRef.current) return;

    const queuedSignals = [...signalQueueRef.current];
    signalQueueRef.current = [];

    for (const signal of queuedSignals) {
      const response = await signalChannelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          from: currentUserIdRef.current,
          ...signal,
        },
      });

      if (response !== 'ok') {
        signalQueueRef.current.unshift(signal);
        break;
      }
    }
  };

  const sendSignal = async (to: string | '*', type: GroupSignal['type'], data?: unknown) => {
    if (!signalChannelRef.current || !signalReadyRef.current || !currentUserIdRef.current) {
      signalQueueRef.current.push({ to, type, data });
      return;
    }

    const response = await signalChannelRef.current.send({
      type: 'broadcast',
      event: 'signal',
      payload: {
        from: currentUserIdRef.current,
        to,
        type,
        data,
      },
    });

    if (response !== 'ok') {
      signalQueueRef.current.push({ to, type, data });
    }
  };

  const cleanupPeer = (remoteUserId: string) => {
    peerConnectionsRef.current[remoteUserId]?.close();
    delete peerConnectionsRef.current[remoteUserId];
    delete pendingCandidatesRef.current[remoteUserId];

    const remoteStream = remoteStreamsRef.current[remoteUserId];
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      delete remoteStreamsRef.current[remoteUserId];
    }

    syncParticipants();
  };

  const cleanupAll = () => {
    Object.keys(peerConnectionsRef.current).forEach(cleanupPeer);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setLocalStream(null);
    participantRowsRef.current = [];
    setParticipants([]);
    signalQueueRef.current = [];
    signalReadyRef.current = false;

    if (signalChannelRef.current) {
      supabase.removeChannel(signalChannelRef.current);
      signalChannelRef.current = null;
    }

    if (participantChannelRef.current) {
      supabase.removeChannel(participantChannelRef.current);
      participantChannelRef.current = null;
    }
  };

  const ensurePeerConnection = (remoteUserId: string) => {
    const existing = peerConnectionsRef.current[remoteUserId];
    if (existing) {
      return existing;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current[remoteUserId] = pc;

    const remoteStream = remoteStreamsRef.current[remoteUserId] ?? new MediaStream();
    remoteStreamsRef.current[remoteUserId] = remoteStream;
    syncParticipants();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current as MediaStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        void sendSignal(remoteUserId, 'ice-candidate', event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      const stream = remoteStreamsRef.current[remoteUserId] ?? new MediaStream();
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

      remoteStreamsRef.current[remoteUserId] = stream;
      syncParticipants();
      setCallState((prev) => (prev.status === 'calling' ? { ...prev, status: 'connected' } : prev));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState((prev) => (prev.status === 'calling' ? { ...prev, status: 'connected' } : prev));
      }

      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanupPeer(remoteUserId);
      }

      if (pc.connectionState === 'disconnected') {
        setTimeout(() => {
          if (pc.connectionState === 'disconnected') {
            cleanupPeer(remoteUserId);
          }
        }, 4000);
      }
    };

    return pc;
  };

  const maybeStartPeer = async (remoteUserId: string) => {
    const localUserId = currentUserIdRef.current;

    if (!localUserId || !localStreamRef.current || remoteUserId === localUserId) {
      return;
    }

    if (!shouldInitiateOffer(localUserId, remoteUserId)) {
      return;
    }

    const pc = ensurePeerConnection(remoteUserId);
    if (pc.localDescription || pc.remoteDescription || pc.signalingState !== 'stable') {
      return;
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal(remoteUserId, 'offer', offer);
  };

  const handleSignalMessage = async (message: GroupSignal) => {
    const localUserId = currentUserIdRef.current;
    if (!localUserId || message.from === localUserId) return;
    if (message.to !== '*' && message.to !== localUserId) return;

    switch (message.type) {
      case 'offer': {
        if (!localStreamRef.current) return;
        const pc = ensurePeerConnection(message.from);
        await pc.setRemoteDescription(new RTCSessionDescription(message.data as RTCSessionDescriptionInit));

        const pendingCandidates = pendingCandidatesRef.current[message.from] || [];
        for (const candidate of pendingCandidates) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {
            console.warn('Failed to apply queued ICE candidate');
          }
        }
        pendingCandidatesRef.current[message.from] = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal(message.from, 'answer', answer);
        break;
      }
      case 'answer': {
        const pc = peerConnectionsRef.current[message.from];
        if (!pc) return;

        await pc.setRemoteDescription(new RTCSessionDescription(message.data as RTCSessionDescriptionInit));

        const pendingCandidates = pendingCandidatesRef.current[message.from] || [];
        for (const candidate of pendingCandidates) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {
            console.warn('Failed to apply queued ICE candidate');
          }
        }
        pendingCandidatesRef.current[message.from] = [];
        setCallState((prev) => ({ ...prev, status: 'connected' }));
        break;
      }
      case 'ice-candidate': {
        const pc = peerConnectionsRef.current[message.from];
        if (pc?.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(message.data as RTCIceCandidateInit));
          } catch {
            console.warn('Failed to add ICE candidate');
          }
        } else {
          pendingCandidatesRef.current[message.from] = [
            ...(pendingCandidatesRef.current[message.from] || []),
            message.data as RTCIceCandidateInit,
          ];
        }
        break;
      }
      case 'hangup': {
        cleanupAll();
        setCallState((prev) => ({ ...prev, status: 'ended' }));
        setTimeout(() => setCallState(INITIAL_STATE), 1500);
        break;
      }
    }
  };

  const ensureSignalChannel = async (callId: string) => {
    if (signalChannelRef.current) {
      return;
    }

    signalReadyRef.current = false;

    await new Promise<void>((resolve) => {
      const channel = supabase
        .channel(`group-call-${callId}`)
        .on('broadcast', { event: 'signal' }, (payload) => {
          void handleSignalMessage(payload.payload as GroupSignal);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            signalReadyRef.current = true;
            signalChannelRef.current = channel;
            void flushSignalQueue();
            resolve();
          }
        });
    });
  };

  const refreshParticipants = async () => {
    const callId = callStateRef.current.callId;
    const localUserId = currentUserIdRef.current;

    if (!callId || !localUserId) return;

    const { data, error } = await supabase
      .from('group_call_participants')
      .select('user_id, status, left_at')
      .eq('group_call_id', callId);

    if (error) {
      console.error('Failed to refresh group call participants:', error);
      return;
    }

    participantRowsRef.current = (data || []) as ParticipantRow[];
    await hydrateProfiles(participantRowsRef.current.map((row) => row.user_id));

    const activeUserIds = new Set(participantRowsRef.current.filter((row) => !row.left_at).map((row) => row.user_id));
    Object.keys(peerConnectionsRef.current).forEach((remoteUserId) => {
      if (!activeUserIds.has(remoteUserId)) {
        cleanupPeer(remoteUserId);
      }
    });

    syncParticipants();

    const joinedRemotes = participantRowsRef.current.filter((row) => row.user_id !== localUserId && row.status === 'joined' && !row.left_at);
    if (localStreamRef.current && callStateRef.current.status !== 'ringing') {
      await Promise.all(joinedRemotes.map((row) => maybeStartPeer(row.user_id)));
    }

    setCallState((prev) => {
      if (prev.status === 'ringing' && !localStreamRef.current) return prev;
      if (joinedRemotes.length > 0) return { ...prev, status: 'connected' };
      if (prev.status === 'ended') return prev;
      return { ...prev, status: 'calling' };
    });
  };

  const loadIncomingCall = async (groupCallId: string) => {
    if (callStateRef.current.status !== 'idle' && callStateRef.current.callId !== groupCallId) return;

    const { data: call, error } = await supabase
      .from('group_calls')
      .select('id, group_id, created_by, call_type, status')
      .eq('id', groupCallId)
      .maybeSingle();

    if (error || !call || call.status !== 'active') return;

    const [{ data: group }, { data: caller }] = await Promise.all([
      supabase.from('groups').select('name').eq('id', call.group_id).maybeSingle(),
      supabase.from('profiles_secure').select('display_name, username').eq('id', call.created_by).maybeSingle(),
    ]);

    setCallState({
      status: 'ringing',
      callId: call.id,
      groupId: call.group_id,
      groupName: group?.name || 'Group call',
      callType: call.call_type as CallType,
      isIncoming: true,
      invitedByName: caller?.display_name || caller?.username || 'Someone',
      isMuted: false,
      isVideoOff: false,
    });
  };

  const startGroupCall = async (
    groupId: string,
    groupName: string,
    invitees: GroupCallInvitee[],
    callType: CallType,
  ) => {
    const localUserId = currentUserIdRef.current;
    if (!localUserId || invitees.length === 0 || callStateRef.current.status !== 'idle') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: callType === 'video' ? { facingMode: 'user' } : false,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      invitees.forEach((invitee) => {
        profilesCacheRef.current[invitee.userId] = {
          name: invitee.name,
          avatarUrl: invitee.avatarUrl,
        };
      });

      const { data: groupCall, error } = await supabase
        .from('group_calls')
        .insert({ group_id: groupId, created_by: localUserId, call_type: callType, status: 'active' })
        .select('id')
        .single();

      if (error || !groupCall) throw error || new Error('Failed to start group call');

      const participantRows = [
        {
          group_call_id: groupCall.id,
          user_id: localUserId,
          status: 'joined',
          joined_at: new Date().toISOString(),
        },
        ...invitees.map((invitee) => ({
          group_call_id: groupCall.id,
          user_id: invitee.userId,
          status: 'invited',
        })),
      ];

      const { error: participantsError } = await supabase.from('group_call_participants').insert(participantRows);
      if (participantsError) throw participantsError;

      setCallState({
        status: 'calling',
        callId: groupCall.id,
        groupId,
        groupName,
        callType,
        isIncoming: false,
        invitedByName: null,
        isMuted: false,
        isVideoOff: false,
      });

      await ensureSignalChannel(groupCall.id);
      await refreshParticipants();

      const session = (await supabase.auth.getSession()).data.session;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (supabaseUrl && session?.access_token) {
        invitees.forEach((invitee) => {
          fetch(`${supabaseUrl}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              userId: invitee.userId,
              title: `📹 Group ${callType} call`,
              body: `${groupName} has an incoming group call`,
              tag: `group-call-${groupCall.id}`,
              data: { url: '/app', groupCallId: groupCall.id, groupId },
            }),
          }).catch(() => undefined);
        });
      }
    } catch (error) {
      console.error('Failed to start group call:', error);
      cleanupAll();
      setCallState(INITIAL_STATE);
      toast.error('Could not start the group call');
    }
  };

  const answerGroupCall = async () => {
    const callId = callStateRef.current.callId;
    const localUserId = currentUserIdRef.current;

    if (!callId || !localUserId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: callStateRef.current.callType === 'video' ? { facingMode: 'user' } : false,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      await supabase
        .from('group_call_participants')
        .update({ status: 'joined', joined_at: new Date().toISOString(), left_at: null })
        .eq('group_call_id', callId)
        .eq('user_id', localUserId);

      setCallState((prev) => ({ ...prev, status: 'calling', isIncoming: false }));

      await ensureSignalChannel(callId);
      await refreshParticipants();
    } catch (error) {
      console.error('Failed to answer group call:', error);
      cleanupAll();
      setCallState(INITIAL_STATE);
      toast.error('Could not join the group call');
    }
  };

  const rejectGroupCall = async () => {
    const callId = callStateRef.current.callId;
    const localUserId = currentUserIdRef.current;

    if (callId && localUserId) {
      await supabase
        .from('group_call_participants')
        .update({ status: 'left', left_at: new Date().toISOString() })
        .eq('group_call_id', callId)
        .eq('user_id', localUserId);
    }

    cleanupAll();
    setCallState(INITIAL_STATE);
  };

  const endGroupCall = async () => {
    const callId = callStateRef.current.callId;
    if (!callId) return;

    await sendSignal('*', 'hangup');
    await Promise.all([
      supabase.from('group_calls').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', callId),
      currentUserIdRef.current
        ? supabase
            .from('group_call_participants')
            .update({ status: 'left', left_at: new Date().toISOString() })
            .eq('group_call_id', callId)
            .eq('user_id', currentUserIdRef.current)
        : Promise.resolve(),
    ]);

    cleanupAll();
    setCallState((prev) => ({ ...prev, status: 'ended' }));
    setTimeout(() => setCallState(INITIAL_STATE), 1500);
  };

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setCallState((prev) => ({ ...prev, isMuted: !audioTrack.enabled }));
  };

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;
    setCallState((prev) => ({ ...prev, isVideoOff: !videoTrack.enabled }));
    syncParticipants();
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const inviteChannel = supabase
      .channel(`group-call-invites-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_call_participants',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const row = payload.new as { group_call_id?: string; status?: string };
          if (row.group_call_id && row.status === 'invited') {
            void loadIncomingCall(row.group_call_id);
          }
        },
      )
      .subscribe();

    const invitePoll = setInterval(async () => {
      if (callStateRef.current.status !== 'idle') return;

      const { data } = await supabase
        .from('group_call_participants')
        .select('group_call_id, status')
        .eq('user_id', currentUserId)
        .eq('status', 'invited')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data?.[0]?.group_call_id) {
        void loadIncomingCall(data[0].group_call_id);
      }
    }, 3000);

    return () => {
      clearInterval(invitePoll);
      supabase.removeChannel(inviteChannel);
    };
  }, [currentUserId]);

  useEffect(() => {
    const callId = callState.callId;
    if (!callId) return;

    void ensureSignalChannel(callId);
    void refreshParticipants();

    const participantChannel = supabase
      .channel(`group-call-participants-${callId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_call_participants',
          filter: `group_call_id=eq.${callId}`,
        },
        () => {
          void refreshParticipants();
        },
      )
      .subscribe();

    participantChannelRef.current = participantChannel;

    return () => {
      if (participantChannelRef.current) {
        supabase.removeChannel(participantChannelRef.current);
        participantChannelRef.current = null;
      }
    };
  }, [callState.callId]);

  useEffect(() => () => cleanupAll(), []);

  return {
    callState,
    participants,
    localStream,
    startGroupCall,
    answerGroupCall,
    rejectGroupCall,
    endGroupCall,
    toggleMute,
    toggleVideo,
  };
};