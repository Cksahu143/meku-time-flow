import React, { createContext, useContext } from 'react';
import { useWebRTC, CallType } from '@/hooks/useWebRTC';
import { useGroupCall } from '@/hooks/useGroupCall';
import { CallOverlay } from './CallOverlay';
import { GroupCallOverlay } from './GroupCallOverlay';
import { usePushSubscription } from '@/hooks/usePushSubscription';

interface CallContextType {
  startCall: (remoteUserId: string, remoteUserName: string, callType: CallType) => Promise<void>;
  startGroupCall: (
    groupId: string,
    groupName: string,
    members: Array<{ userId: string; name: string; avatarUrl?: string | null }>,
    callType: CallType,
  ) => Promise<void>;
  callStatus: string;
}

const CallContext = createContext<CallContextType>({
  startCall: async () => {},
  startGroupCall: async () => {},
  callStatus: 'idle',
});

export const useCall = () => useContext(CallContext);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  usePushSubscription();

  const {
    callState,
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useWebRTC();

  const groupCall = useGroupCall();

  const activeStatus = groupCall.callState.status !== 'idle'
    ? groupCall.callState.status
    : callState.status;

  return (
    <CallContext.Provider
      value={{
        startCall,
        startGroupCall: groupCall.startGroupCall,
        callStatus: activeStatus,
      }}
    >
      {children}
      <GroupCallOverlay
        status={groupCall.callState.status}
        groupName={groupCall.callState.groupName}
        invitedByName={groupCall.callState.invitedByName}
        callType={groupCall.callState.callType}
        isIncoming={groupCall.callState.isIncoming}
        participants={groupCall.participants}
        isMuted={groupCall.callState.isMuted}
        isVideoOff={groupCall.callState.isVideoOff}
        onAnswer={groupCall.answerGroupCall}
        onReject={groupCall.rejectGroupCall}
        onEnd={groupCall.endGroupCall}
        onToggleMute={groupCall.toggleMute}
        onToggleVideo={groupCall.toggleVideo}
      />
      <CallOverlay
        status={callState.status}
        callType={callState.callType}
        remoteUserName={callState.remoteUserName}
        isMuted={callState.isMuted}
        isVideoOff={callState.isVideoOff}
        duration={callState.duration}
        isIncoming={callState.isIncoming}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        localStream={localStream}
        remoteStream={remoteStream}
        onAnswer={answerCall}
        onReject={rejectCall}
        onEnd={endCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
      />
    </CallContext.Provider>
  );
};
