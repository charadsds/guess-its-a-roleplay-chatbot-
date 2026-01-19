
export enum Emotion {
  Neutral = 'neutral',
  Happy = 'happy',
  Thinking = 'thinking',
  Surprised = 'surprised',
  Angry = 'angry',
}

export interface VoiceSettings {
  voiceName: string;
  speed: number;
  pitch: number;
}

export interface RoleplaySettings {
  active: boolean;
  scenario: string;
  astraRole: string;
  userAlias: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'astra';
  text: string;
  timestamp: Date;
  emotion?: Emotion;
}

export interface AstraState {
  emotion: Emotion;
  isThinking: boolean;
  isSpeaking: boolean;
  messages: ChatMessage[];
  voice: VoiceSettings;
  roleplay: RoleplaySettings;
  memory: string[];
}
