import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Loader2, Volume2, Phone } from 'lucide-react';
import { ConnectionState } from '../types';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';
import { MODEL_NAME, SYSTEM_INSTRUCTION, VOICE_NAME } from '../constants';
import Visualizer from './Visualizer';

const LiveAgent: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  
  // Refs for audio processing to avoid stale closures in callbacks
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null); // To store the session object properly
  
  // Cleanup function to stop all audio and reset state
  const stopSession = useCallback(() => {
    // 1. Close session if possible (the SDK doesn't always expose a clean close on the promise result easily without the variable)
    // We rely on the connection closing from the server side or just stopping the stream.
    // However, we can send a close signal if we had the session object, but here we just cut the cord locally.
    
    // 2. Stop Microphone Stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // 3. Disconnect Audio Nodes
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // 4. Close Audio Contexts
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    // 5. Stop Playing Audio
    activeSourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) { /* ignore */ }
    });
    activeSourcesRef.current.clear();

    setConnectionState(ConnectionState.DISCONNECTED);
    setAgentSpeaking(false);
    sessionRef.current = null;
  }, []);

  const startSession = async () => {
    if (connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.CONNECTED) return;
    
    setConnectionState(ConnectionState.CONNECTING);
    setErrorMessage(null);

    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            throw new Error("API Key not found in environment.");
        }

        // Initialize Audio Contexts
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const inputCtx = new AudioContextClass({ sampleRate: 16000 });
        const outputCtx = new AudioContextClass({ sampleRate: 24000 });
        
        inputAudioContextRef.current = inputCtx;
        outputAudioContextRef.current = outputCtx;
        nextStartTimeRef.current = outputCtx.currentTime;

        // Get Microphone Access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Initialize GenAI
        const ai = new GoogleGenAI({ apiKey });
        
        // Connect to Live API
        const sessionPromise = ai.live.connect({
            model: MODEL_NAME,
            callbacks: {
                onopen: () => {
                    console.log("Connection Opened");
                    setConnectionState(ConnectionState.CONNECTED);
                    
                    // Setup Audio Input Processing inside onopen
                    if (!inputAudioContextRef.current || !streamRef.current) return;

                    const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
                    // Buffer size 4096, 1 input channel, 1 output channel
                    const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessor.onaudioprocess = (e) => {
                         const inputData = e.inputBuffer.getChannelData(0);
                         const pcmBlob = createBlob(inputData);
                         
                         // Send to Gemini
                         sessionPromise.then(session => {
                             session.sendRealtimeInput({ media: pcmBlob });
                         });
                    };

                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current.destination);
                    
                    sourceRef.current = source;
                    processorRef.current = scriptProcessor;
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Handle Audio Output from Model
                    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    
                    if (base64Audio && outputAudioContextRef.current) {
                        setAgentSpeaking(true);
                        const ctx = outputAudioContextRef.current;
                        
                        try {
                            const audioData = decode(base64Audio);
                            const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
                            
                            // Schedule Playback
                            // Ensure we don't schedule in the past
                            const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
                            nextStartTimeRef.current = startTime + audioBuffer.duration;

                            const source = ctx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(ctx.destination);
                            
                            source.onended = () => {
                                activeSourcesRef.current.delete(source);
                                if (activeSourcesRef.current.size === 0) {
                                     // Small delay to prevent flickering visualizer
                                     setTimeout(() => {
                                        if (activeSourcesRef.current.size === 0) {
                                            setAgentSpeaking(false);
                                        }
                                     }, 200);
                                }
                            };
                            
                            source.start(startTime);
                            activeSourcesRef.current.add(source);
                            
                        } catch (err) {
                            console.error("Error processing audio chunk", err);
                        }
                    }

                    // Handle Interruption
                    if (message.serverContent?.interrupted) {
                        console.log("Model interrupted");
                        activeSourcesRef.current.forEach(s => {
                            try { s.stop(); } catch(e) {}
                        });
                        activeSourcesRef.current.clear();
                        if (outputAudioContextRef.current) {
                             nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
                        }
                        setAgentSpeaking(false);
                    }
                },
                onclose: () => {
                    console.log("Connection Closed");
                    stopSession();
                },
                onerror: (err) => {
                    console.error("Connection Error", err);
                    setErrorMessage("Connection failed. Please try again.");
                    stopSession();
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } }
                },
                systemInstruction: SYSTEM_INSTRUCTION,
            }
        });
        
        // Save session promise result handling (though callbacks handle most logic)
        sessionRef.current = sessionPromise;

    } catch (error: any) {
        console.error("Setup Error:", error);
        setErrorMessage(error.message || "Failed to access microphone or connect.");
        setConnectionState(ConnectionState.ERROR);
    }
  };

  return (
    <div className="bg-shahi-red/50 backdrop-blur-md border border-shahi-gold rounded-2xl p-6 md:p-10 shadow-2xl flex flex-col items-center justify-center gap-8 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-shahi-gold to-transparent opacity-50"></div>
        
        {/* Connection Status / Error */}
        {errorMessage && (
            <div className="absolute top-4 bg-red-800/80 text-white px-4 py-2 rounded-lg text-sm border border-red-500 animate-pulse">
                {errorMessage}
            </div>
        )}

        {/* Visualizer Area */}
        <div className="w-full h-32 flex items-center justify-center bg-black/40 rounded-xl border border-shahi-gold/20 shadow-inner overflow-hidden">
            <Visualizer 
                isActive={connectionState === ConnectionState.CONNECTED}
                isSpeaking={agentSpeaking} 
            />
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-4 z-10">
            {connectionState === ConnectionState.DISCONNECTED || connectionState === ConnectionState.ERROR ? (
                <button 
                    onClick={startSession}
                    className="group relative flex items-center gap-3 bg-shahi-gold hover:bg-yellow-400 text-shahi-dark px-8 py-4 rounded-full font-serif font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                >
                    <div className="bg-shahi-red p-2 rounded-full text-shahi-gold group-hover:bg-shahi-dark transition-colors">
                        <Phone size={20} />
                    </div>
                    <span>Talk to Ananya</span>
                </button>
            ) : connectionState === ConnectionState.CONNECTING ? (
                <button disabled className="flex items-center gap-3 bg-shahi-dark/50 border border-shahi-gold/30 text-shahi-gold px-8 py-4 rounded-full cursor-wait">
                    <Loader2 className="animate-spin" />
                    <span>Connecting...</span>
                </button>
            ) : (
                <div className="flex flex-col items-center gap-4">
                    <div className="text-shahi-gold font-serif italic text-lg animate-pulse">
                        {agentSpeaking ? "Ananya is speaking..." : "Listening..."}
                    </div>
                    <button 
                        onClick={stopSession}
                        className="flex items-center gap-2 bg-red-900/80 hover:bg-red-800 border border-red-500 text-red-100 px-6 py-3 rounded-full transition-all"
                    >
                        <MicOff size={18} />
                        <span>End Call</span>
                    </button>
                </div>
            )}
        </div>

        {/* Helpful hints */}
        <div className="text-center space-y-2 mt-2">
            <p className="text-shahi-cream/60 text-sm">
                Try asking:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
                {["Book a table for 2", "Do you have Butter Chicken?", "Is the meat Halal?", "Where do I park?"].map((hint, i) => (
                    <span key={i} className="text-xs bg-shahi-dark/40 border border-shahi-gold/20 px-3 py-1 rounded-full text-shahi-gold/80">
                        "{hint}"
                    </span>
                ))}
            </div>
        </div>
    </div>
  );
};

export default LiveAgent;