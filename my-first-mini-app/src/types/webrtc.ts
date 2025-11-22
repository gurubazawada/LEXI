export type CallState = 
  | 'idle'        // No call
  | 'calling'     // Outgoing call (ringing)
  | 'incoming'    // Incoming call (show accept/reject)
  | 'connecting'  // WebRTC connecting
  | 'active'      // Call in progress
  | 'ended';      // Call ended

export interface CallIncomingPayload {
  callerId: string;
  callerName: string;
}

export interface CallAcceptedPayload {
  calleeId: string;
}

export interface CallRejectedPayload {
  calleeId: string;
}

export interface CallEndedPayload {
  from: string;
}

export interface WebRTCOfferPayload {
  offer: RTCSessionDescriptionInit;
  from: string;
}

export interface WebRTCAnswerPayload {
  answer: RTCSessionDescriptionInit;
  from: string;
}

export interface ICECandidatePayload {
  candidate: RTCIceCandidateInit;
  from: string;
}

