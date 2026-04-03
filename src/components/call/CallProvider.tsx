import React, { createContext, useContext } from 'react';
import { useWebRTC, CallType } from '@/hooks/useWebRTC';
import { CallOverlay } from './CallOverlay';

interface CallContextType {
  startCall: (remoteUserId: string, remoteUserName: string, callType: CallType) => Promise<void>;
  callStatus: string;
}

const CallContext = createContext<CallContextType>({
  startCall: async () => {},
  callStatus: 'idle',
});

export const useCall = () => useContext(CallContext);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    callState,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useWebRTC();

  return (
    <CallContext.Provider value={{ startCall, callStatus: callState.status }}>
      {children}
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
        onAnswer={answerCall}
        onReject={rejectCall}
        onEnd={endCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
      />
    </CallContext.Provider>
  );
};
