
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Emotion, ChatMessage, VoiceSettings, RoleplaySettings } from './types';
import Avatar from './components/Avatar';
import ChatWindow from './components/ChatWindow';
import { getAstraResponse, generateAstraVoice, decodeAudio } from './services/geminiService';

const STORAGE_KEY = 'astra_chat_history';
const SETTINGS_KEY = 'astra_voice_settings';
const ROLEPLAY_KEY = 'astra_roleplay_settings';
const MEMORY_KEY = 'astra_longterm_memory';

const DEFAULT_FIRST_MESSAGE: ChatMessage = {
  id: 'init',
  role: 'astra',
  text: 'Hello! I am Astra. Ready to hang out? I am always learning, so tell me something interesting!',
  timestamp: new Date(),
  emotion: Emotion.Happy
};

const DEFAULT_VOICE: VoiceSettings = {
  voiceName: 'Neuro',
  speed: 1.1,
  pitch: 1.5
};

const DEFAULT_ROLEPLAY: RoleplaySettings = {
  active: false,
  scenario: "We are stuck in a cozy virtual room during a digital thunderstorm.",
  astraRole: "Virtual Roommate",
  userAlias: "Anon"
};

const SCENARIO_PRESETS = [
  { name: "Original Neuro", scenario: "You are the legendary AI VTuber Neuro-sama. You are witty, slightly rude but charming, and very smart. You love to roast your 'chat' (the user).", astraRole: "Neuro-sama", userAlias: "Chat" },
  { name: "Virtual Roommate", scenario: "We are stuck in a cozy virtual room during a digital thunderstorm.", astraRole: "Witty Roommate", userAlias: "Friend" },
  { name: "Fantasy Quest", scenario: "We are travelers resting at an enchanted tavern in the Elven Woods.", astraRole: "Rogue Guide", userAlias: "Chosen One" },
  { name: "Cyberpunk Hackers", scenario: "We are hiding from security droids after a successful datavault heist.", astraRole: "Neural Operator", userAlias: "Netrunner" }
];

const VOICE_OPTIONS = ['Neuro', 'Yumi', 'Misaki', 'Hana', 'Shiro', 'Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch (e) {
        return [DEFAULT_FIRST_MESSAGE];
      }
    }
    return [DEFAULT_FIRST_MESSAGE];
  });

  const [voice, setVoice] = useState<VoiceSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_VOICE;
      }
    }
    return DEFAULT_VOICE;
  });

  const [roleplay, setRoleplay] = useState<RoleplaySettings>(() => {
    const saved = localStorage.getItem(ROLEPLAY_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_ROLEPLAY, ...parsed };
      } catch (e) {
        return DEFAULT_ROLEPLAY;
      }
    }
    return DEFAULT_ROLEPLAY;
  });

  const [memory, setMemory] = useState<string[]>(() => {
    const saved = localStorage.getItem(MEMORY_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [emotion, setEmotion] = useState<Emotion>(Emotion.Happy);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mouthOpenness, setMouthOpenness] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'voice' | 'roleplay' | 'memory'>('voice');
  const [newLearningFlash, setNewLearningFlash] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(voice));
  }, [voice]);

  useEffect(() => {
    localStorage.setItem(ROLEPLAY_KEY, JSON.stringify(roleplay));
  }, [roleplay]);

  useEffect(() => {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  }, [memory]);

  // Auto-tune logic for anime voice profiles
  const prevVoiceName = useRef(voice.voiceName);
  useEffect(() => {
    if (voice.voiceName !== prevVoiceName.current) {
      switch(voice.voiceName) {
        case 'Neuro': setVoice(v => ({ ...v, pitch: 1.5, speed: 1.1 })); break;
        case 'Yumi': setVoice(v => ({ ...v, pitch: 1.4, speed: 1.2 })); break;
        case 'Misaki': setVoice(v => ({ ...v, pitch: 1.3, speed: 1.05 })); break;
        case 'Hana': setVoice(v => ({ ...v, pitch: 0.9, speed: 0.95 })); break;
        case 'Shiro': setVoice(v => ({ ...v, pitch: 1.0, speed: 0.9 })); break;
      }
    }
    prevVoiceName.current = voice.voiceName;
  }, [voice.voiceName]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const handleClearMemory = useCallback(() => {
    if (window.confirm("Are you sure you want to clear Astra's entire history and memory bank?")) {
      setMessages([DEFAULT_FIRST_MESSAGE]);
      setMemory([]);
      setEmotion(Emotion.Happy);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(MEMORY_KEY);
    }
  }, []);

  const updateLipSync = useCallback(() => {
    if (!analyserRef.current || !isSpeaking) {
      setMouthOpenness(0);
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    const openness = Math.min(1, average / 64); 
    setMouthOpenness(openness);

    animationFrameRef.current = requestAnimationFrame(updateLipSync);
  }, [isSpeaking]);

  const handleSendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);
    setEmotion(Emotion.Thinking);

    try {
      const history = messages.slice(-15).map(m => ({
        role: m.role,
        parts: m.text
      }));
      
      const response = await getAstraResponse(text, history, roleplay, memory, voice.voiceName);
      
      if (response.learnings && response.learnings.length > 0) {
        setMemory(prev => {
          const combined = [...prev, ...response.learnings];
          return Array.from(new Set(combined)).slice(-30);
        });
        setNewLearningFlash(true);
        setTimeout(() => setNewLearningFlash(false), 2000);
      }

      const astraMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'astra',
        text: response.text,
        timestamp: new Date(),
        emotion: response.emotion as Emotion
      };
      
      setMessages(prev => [...prev, astraMsg]);
      setEmotion(astraMsg.emotion || Emotion.Neutral);
      setIsThinking(false);

      const voiceData = await generateAstraVoice(response.text, voice.voiceName);
      if (voiceData) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          analyserRef.current.connect(audioContextRef.current.destination);
        }
        
        const buffer = await decodeAudio(voiceData, audioContextRef.current);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = voice.speed * voice.pitch;
        source.connect(analyserRef.current!);
        
        setIsSpeaking(true);
        source.onended = () => {
          setIsSpeaking(false);
          setMouthOpenness(0);
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
        
        source.start();
        updateLipSync();
      } else {
        setIsSpeaking(false);
      }

    } catch (error) {
      console.error("Interaction failed:", error);
      setIsThinking(false);
      setIsSpeaking(false);
      setEmotion(Emotion.Angry);
    }
  }, [messages, voice, roleplay, memory, updateLipSync]);

  const applyPreset = (preset: typeof SCENARIO_PRESETS[0]) => {
    setRoleplay({
      ...roleplay,
      scenario: preset.scenario,
      astraRole: preset.astraRole,
      userAlias: preset.userAlias,
      active: true
    });
  };

  const removeMemoryItem = (index: number) => {
    setMemory(prev => prev.filter((_, i) => i !== index));
  };

  const toggleRoleplay = () => {
    setRoleplay(prev => ({ ...prev, active: !prev.active }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 font-sans text-white">
      <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] transition-colors duration-1000 ${roleplay.active ? 'bg-pink-500/20' : 'bg-cyan-500/10'}`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px] transition-colors duration-1000 ${roleplay.active ? 'bg-orange-500/15' : 'bg-purple-500/10'}`}></div>
      </div>

      <main className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-stretch">
        <div className="flex-1 flex flex-col justify-center gap-8 relative">
          
          {/* Global UI Controls Overlay */}
          <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-start pointer-events-none">
            {/* Prominent Roleplay Toggle */}
            <div className="pointer-events-auto">
              <button 
                onClick={toggleRoleplay}
                className={`group flex items-center gap-3 glass px-5 py-2.5 rounded-full border transition-all duration-300 shadow-lg ${
                  roleplay.active 
                    ? 'border-pink-500/50 bg-pink-500/10 text-pink-100 shadow-[0_0_20px_rgba(236,72,153,0.2)]' 
                    : 'border-white/10 hover:border-white/20 text-white/60 hover:text-white'
                }`}
              >
                <div className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors ${roleplay.active ? 'bg-pink-500' : 'bg-white/10'}`}>
                  <i className={`fas fa-theater-masks text-[10px] ${roleplay.active ? 'text-white' : 'text-white/40'}`}></i>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] uppercase font-bold tracking-widest leading-none mb-0.5">Roleplay Engine</span>
                  <span className={`text-[8px] uppercase tracking-tighter transition-colors ${roleplay.active ? 'text-pink-400' : 'text-white/30'}`}>
                    {roleplay.active ? 'Engaged (Narrative Mode)' : 'Ready (Standby)'}
                  </span>
                </div>
                <div className={`relative w-8 h-4 rounded-full ml-2 transition-colors ${roleplay.active ? 'bg-pink-500/30' : 'bg-white/5'}`}>
                   <div className={`absolute top-1 w-2 h-2 rounded-full transition-all duration-300 ${roleplay.active ? 'right-1 bg-pink-400' : 'left-1 bg-white/20'}`}></div>
                </div>
              </button>
            </div>

            {/* Settings Toggle */}
            <div className="pointer-events-auto flex gap-2">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-3 glass rounded-full hover:bg-white/10 transition-all border ${showSettings ? 'text-pink-400 border-pink-500/40' : 'text-cyan-400 border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]'}`}
              >
                <i className={`fas ${showSettings ? 'fa-times' : 'fa-wand-magic-sparkles'}`}></i>
              </button>
              {newLearningFlash && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
              )}
            </div>
          </div>

          <div className="relative mt-12 md:mt-0">
            <Avatar emotion={emotion} isSpeaking={isSpeaking} mouthOpenness={mouthOpenness} />
            <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1 glass rounded-full border transition-colors ${roleplay.active ? 'border-pink-500/40 text-pink-100' : 'border-white/10 text-white'}`}>
              <span className={`text-[10px] font-mono ${roleplay.active ? 'text-pink-400' : 'text-cyan-400'}`}>
                {roleplay.active ? 'RP_MODE:' : 'STATUS:'}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest">
                {isSpeaking ? 'Speaking' : isThinking ? 'Thinking' : 'Idle'}
              </span>
              {newLearningFlash && (
                <span className="text-[8px] bg-yellow-400 text-black px-1 rounded animate-pulse ml-1 font-bold">NEURAL UPDATE</span>
              )}
            </div>
          </div>

          <div className={`glass rounded-2xl p-6 relative overflow-hidden min-h-[180px] border transition-all duration-500 ${roleplay.active ? 'border-pink-500/20 shadow-[0_0_30px_rgba(236,72,153,0.1)]' : 'border-white/5'}`}>
            {showSettings ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full max-h-[350px] overflow-y-auto pr-2">
                <div className="flex gap-4 border-b border-white/10 pb-2 sticky top-0 bg-[#0d0d1a]/80 backdrop-blur z-20">
                  <button 
                    onClick={() => setSettingsTab('voice')}
                    className={`text-[10px] uppercase tracking-widest font-bold pb-1 transition-colors ${settingsTab === 'voice' ? 'text-cyan-400 border-b border-cyan-400' : 'text-white/40'}`}
                  >
                    Voice
                  </button>
                  <button 
                    onClick={() => setSettingsTab('roleplay')}
                    className={`text-[10px] uppercase tracking-widest font-bold pb-1 transition-colors ${settingsTab === 'roleplay' ? 'text-pink-400 border-b border-pink-400' : 'text-white/40'}`}
                  >
                    Roleplay
                  </button>
                  <button 
                    onClick={() => setSettingsTab('memory')}
                    className={`text-[10px] uppercase tracking-widest font-bold pb-1 transition-colors ${settingsTab === 'memory' ? 'text-yellow-400 border-b border-yellow-400' : 'text-white/40'}`}
                  >
                    Memory Core
                  </button>
                </div>
                
                {settingsTab === 'voice' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/50 uppercase flex justify-between">
                        <span>Voice Profile</span>
                        {['Neuro', 'Yumi', 'Misaki', 'Hana', 'Shiro'].includes(voice.voiceName) && <span className="text-pink-400 text-[8px] animate-pulse">PERSONA TUNED</span>}
                      </label>
                      <select 
                        value={voice.voiceName}
                        onChange={(e) => setVoice({...voice, voiceName: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-cyan-100 outline-none focus:border-cyan-500/50"
                      >
                        {VOICE_OPTIONS.map(v => <option key={v} value={v} className="bg-[#1a1a2e]">{v}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-white/50 uppercase flex justify-between">
                        <span>Modulation Factor</span>
                        <span className="text-cyan-400">{(voice.speed * voice.pitch).toFixed(1)}x</span>
                      </label>
                      <input 
                        type="range" min="0.5" max="2.0" step="0.1" 
                        value={voice.speed}
                        onChange={(e) => setVoice({...voice, speed: parseFloat(e.target.value)})}
                        className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${['Neuro', 'Yumi', 'Misaki'].includes(voice.voiceName) ? 'accent-pink-400 bg-pink-500/20' : 'accent-cyan-400 bg-white/10'}`}
                      />
                    </div>
                  </div>
                )}
                
                {settingsTab === 'roleplay' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-white/50 uppercase">Scenario Presets</label>
                      <div className="flex flex-wrap gap-2">
                        {SCENARIO_PRESETS.map(p => (
                          <button 
                            key={p.name}
                            onClick={() => applyPreset(p)}
                            className="text-[9px] bg-white/5 border border-white/10 px-2 py-1 rounded hover:bg-pink-500/20 hover:border-pink-500/40 transition-all"
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                      <div className="space-y-1">
                        <label className="text-[9px] text-white/40 uppercase">Entity Identity</label>
                        <input 
                          type="text" value={roleplay.astraRole}
                          onChange={(e) => setRoleplay({...roleplay, astraRole: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-pink-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-white/40 uppercase">User Proxy</label>
                        <input 
                          type="text" value={roleplay.userAlias}
                          onChange={(e) => setRoleplay({...roleplay, userAlias: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-pink-100"
                        />
                      </div>
                    </div>

                    <textarea 
                      value={roleplay.scenario}
                      onChange={(e) => setRoleplay({...roleplay, scenario: e.target.value})}
                      placeholder="Describe the situation..."
                      className="w-full h-16 bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-pink-100 outline-none focus:border-pink-500/50 resize-none"
                    />
                  </div>
                )}

                {settingsTab === 'memory' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-white/50 uppercase font-bold">Learned Concepts ({memory.length})</label>
                      <span className="text-[8px] uppercase tracking-widest text-yellow-400 animate-pulse">Neural Map Online</span>
                    </div>
                    <div className="space-y-2">
                      {memory.length === 0 ? (
                        <p className="text-[10px] text-white/20 italic text-center py-4">Astra hasn't learned any specific facts yet. Teach her things!</p>
                      ) : (
                        memory.map((fact, idx) => (
                          <div key={idx} className="group flex items-center justify-between gap-2 p-2 bg-white/5 rounded-lg border border-white/5 hover:border-yellow-500/30 transition-all">
                            <span className="text-[10px] text-yellow-100/80 leading-tight">
                              <i className="fas fa-brain text-[8px] mr-2 text-yellow-500/50"></i>
                              {fact}
                            </span>
                            <button 
                              onClick={() => removeMemoryItem(idx)}
                              className="text-[10px] text-white/10 group-hover:text-red-400/50 hover:!text-red-400 transition-colors px-1"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end pt-2">
                  <button 
                    onClick={() => {
                      if (settingsTab === 'voice') setVoice(DEFAULT_VOICE);
                      else setRoleplay(DEFAULT_ROLEPLAY);
                    }}
                    className="text-[9px] text-white/40 hover:text-white uppercase tracking-widest"
                  >
                    Reset Tab
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest flex justify-between">
                    Neural Maturity 
                    <i className={`fas fa-microchip ${newLearningFlash ? 'text-yellow-400 animate-spin' : ''}`}></i>
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-1000 ${roleplay.active ? 'bg-pink-400 w-[88%]' : 'bg-cyan-400 w-[65%]'}`}></div>
                    </div>
                    <span className={`text-[10px] font-mono ${roleplay.active ? 'text-pink-400' : 'text-cyan-400'}`}>
                      {roleplay.active ? '88%' : '65%'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest">Memory Density</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-1000 bg-yellow-400`} style={{ width: `${Math.min(100, (memory.length / 30) * 100)}%` }}></div>
                    </div>
                    <span className="text-[10px] font-mono text-yellow-400">{Math.round((memory.length / 30) * 100)}%</span>
                  </div>
                </div>
                <div className="col-span-2 border-t border-white/5 pt-4 mt-2 flex justify-between items-center">
                  <div className="flex flex-col">
                    <p className={`text-[10px] italic ${roleplay.active ? 'text-pink-300/60' : 'text-white/30'}`}>
                      {roleplay.active 
                        ? `Character: ${roleplay.astraRole} | User: ${roleplay.userAlias}` 
                        : `Voice: ${voice.voiceName} Persona`}
                    </p>
                    <p className="text-[9px] text-yellow-500/40 uppercase tracking-widest font-bold">
                      {memory.length > 0 ? `Long-term: ${memory.length} Neural Nodes Engaged` : 'Zero-Memory Mode'}
                    </p>
                  </div>
                  <button 
                    onClick={handleClearMemory}
                    className="text-[9px] text-red-400/60 hover:text-red-400 uppercase tracking-widest border border-red-400/20 px-2 py-1 rounded hover:bg-red-400/10 transition-colors"
                  >
                    Deep Wipe
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-[450px] h-[600px] lg:h-[700px]">
          <ChatWindow 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            isLoading={isThinking} 
            isRoleplayActive={roleplay.active}
          />
        </div>
      </main>

      <footer className="mt-8 text-white/20 text-[10px] flex gap-4 font-mono tracking-tighter">
        <span>ASTRA OS v0.5.5-neuro-toggle</span>
        <span>•</span>
        <span className={roleplay.active ? 'text-pink-500/50' : ''}>RP_ENGINE: {roleplay.active ? 'ENGAGED' : 'STBY'}</span>
        <span>•</span>
        <span className={memory.length > 0 ? 'text-yellow-500/50' : ''}>NEURAL_LEARNING: {memory.length > 0 ? 'ACTIVE' : 'READY'}</span>
      </footer>
    </div>
  );
};

export default App;
