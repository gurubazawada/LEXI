'use client';

import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebRTC } from '@/hooks/useWebRTC';

interface VoiceCallProps {
  partnerId: string | null;
  partnerName: string | null;
}

export function VoiceCall({ partnerId, partnerName }: VoiceCallProps) {
  const {
    callState,
    isMuted,
    callDuration,
    incomingCallerName,
    error,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  } = useWebRTC(partnerId, partnerName);

  // Format call duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render different UI based on call state
  if (callState === 'idle') {
    return (
      <Button
        onClick={startCall}
        disabled={!partnerId}
        className="w-full h-12 text-base font-semibold rounded-xl"
        variant="outline"
      >
        <Phone className="mr-2 h-5 w-5" />
        Start Voice Call
      </Button>
    );
  }

  return (
    <AnimatePresence>
      {/* Incoming Call Modal */}
      {callState === 'incoming' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <Card className="w-full max-w-sm border-primary/20 shadow-2xl">
              <CardContent className="flex flex-col items-center justify-center py-8 space-y-6">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Phone className="h-12 w-12 text-primary animate-pulse" />
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-foreground">Incoming Call</h3>
                  <p className="text-muted-foreground">
                    {incomingCallerName || 'Partner'} wants to start a voice call
                  </p>
                </div>

                <div className="flex gap-4 w-full">
                  <Button
                    onClick={rejectCall}
                    variant="destructive"
                    className="flex-1 h-12"
                  >
                    <PhoneOff className="mr-2 h-5 w-5" />
                    Reject
                  </Button>
                  <Button
                    onClick={acceptCall}
                    className="flex-1 h-12"
                  >
                    <Phone className="mr-2 h-5 w-5" />
                    Accept
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Calling/Connecting/Active Call Modal */}
      {(callState === 'calling' || callState === 'connecting' || callState === 'active') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <Card className="w-full max-w-sm border-primary/20 shadow-2xl">
              <CardContent className="flex flex-col items-center justify-center py-8 space-y-6">
                <div className={`p-4 rounded-full ${callState === 'active' ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                  <Phone className={`h-12 w-12 ${callState === 'active' ? 'text-green-500' : 'text-primary animate-pulse'}`} />
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-foreground">
                    {callState === 'calling' && 'Calling...'}
                    {callState === 'connecting' && 'Connecting...'}
                    {callState === 'active' && 'Voice Call Active'}
                  </h3>
                  <p className="text-muted-foreground">
                    {partnerName || 'Partner'}
                  </p>
                  {callState === 'active' && (
                    <p className="text-2xl font-mono text-primary">
                      {formatDuration(callDuration)}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-4 w-full">
                  {callState === 'active' && (
                    <Button
                      onClick={toggleMute}
                      variant="outline"
                      className="flex-1 h-12"
                    >
                      {isMuted ? (
                        <>
                          <MicOff className="mr-2 h-5 w-5" />
                          Unmute
                        </>
                      ) : (
                        <>
                          <Mic className="mr-2 h-5 w-5" />
                          Mute
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    onClick={endCall}
                    variant="destructive"
                    className={`h-12 ${callState === 'active' ? 'flex-1' : 'w-full'}`}
                  >
                    <PhoneOff className="mr-2 h-5 w-5" />
                    {callState === 'calling' ? 'Cancel' : 'End Call'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

