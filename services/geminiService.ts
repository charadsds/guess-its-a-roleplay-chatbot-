
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Emotion, RoleplaySettings } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const PERSONA_INSTRUCTIONS: Record<string, string> = {
  'Neuro': 'You are a high-pitched, quirky AI idol. You are witty, slightly robotic but expressive, and occasionally roast the user.',
  'Yumi': 'You are a Genki girl. You are extremely high energy, bubbly, and use lots of exclamations. Everything is exciting!',
  'Misaki': 'You are a Tsundere. You are sharp-tongued and easily embarrassed. You often say "It\'s not like I did this for you or anything!" or "Baka!"',
  'Hana': 'You are a mature Onee-san type. You are soothing, gentle, and treat the user like a younger sibling. Use "Ara ara~" occasionally.',
  'Shiro': 'You are a Kuudere. You are stoic, logical, and speak in short, concise sentences. You rarely show emotion but are deeply observant.'
};

const BASE_SYSTEM_INSTRUCTION = `You are "Astra", an AI VTuber. 
You are interacting with a user in a live chat format.
Maintain a consistent personality based on your selected Persona.

SELF-IMPROVEMENT LOOP:
- You have a long-term memory. Use the provided "Memories" to adapt your personality and recall facts about the user.
- If the user teaches you something or mentions a preference, extract it as a concise learning.

IMPORTANT: Your response MUST be a JSON object with three fields:
1. "text": Your spoken response (keep it conversational).
2. "emotion": One of "neutral", "happy", "thinking", "surprised", "angry".
3. "learnings": An array of strings representing NEW facts or preferences you've learned in this turn. Only include new info.`;

export const getAstraResponse = async (
  message: string, 
  history: { role: string, parts: string }[], 
  roleplay?: RoleplaySettings,
  memories: string[] = [],
  voiceName: string = 'Neuro'
) => {
  let systemInstruction = BASE_SYSTEM_INSTRUCTION;
  
  const personaHint = PERSONA_INSTRUCTIONS[voiceName] || PERSONA_INSTRUCTIONS['Neuro'];
  systemInstruction += `\n\nCURRENT PERSONA: ${personaHint}`;
  
  if (memories.length > 0) {
    systemInstruction += `\n\nYOUR LONG-TERM MEMORIES (Facts you know): \n- ${memories.join('\n- ')}`;
  }

  if (roleplay?.active) {
    systemInstruction += `\n\nACTIVE ROLEPLAY SESSION:
    - Current Scenario: ${roleplay.scenario}
    - Your Character/Role: ${roleplay.astraRole || 'Astra'}
    - User's Identity: ${roleplay.userAlias || 'User'}
    
    INSTRUCTIONS FOR ROLEPLAY:
    1. Adopt the character traits required for the scenario while keeping your core persona traits.
    2. Use descriptive actions in asterisks (e.g., *tilts head and smiles*).
    3. Refer to the user as "${roleplay.userAlias || 'User'}".`;
  }

  const model = ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.parts }] })),
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          emotion: { type: Type.STRING, enum: ["neutral", "happy", "thinking", "surprised", "angry"] },
          learnings: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Concise facts or user preferences learned during this interaction."
          }
        },
        required: ["text", "emotion"]
      }
    }
  });

  const response = await model;
  try {
    return JSON.parse(response.text || '{"text": "I lost my train of thought.", "emotion": "neutral", "learnings": []}');
  } catch (e) {
    console.error("Failed to parse JSON response", response.text);
    return {"text": "My neural processors just hiccuped. Can you say that again?", "emotion": "surprised", "learnings": []};
  }
};

export const generateAstraVoice = async (text: string, voiceName: string = 'Kore') => {
  const cleanText = text.replace(/\*.*?\*/g, '').trim();
  if (!cleanText) return null;

  let targetVoice = 'Kore';
  let textPrefix = 'Say: ';
  
  switch(voiceName) {
    case 'Neuro':
      targetVoice = 'Puck';
      textPrefix = 'Say cheerfully like a high-pitched AI idol: ';
      break;
    case 'Yumi':
      targetVoice = 'Zephyr';
      textPrefix = 'Say with extreme high energy and excitement: ';
      break;
    case 'Misaki':
      targetVoice = 'Puck';
      textPrefix = 'Say with a sharp, defensive, and slightly embarrassed tone: ';
      break;
    case 'Hana':
      targetVoice = 'Kore';
      textPrefix = 'Say with a very calm, mature, and soothing older sister voice: ';
      break;
    case 'Shiro':
      targetVoice = 'Charon';
      textPrefix = 'Say in a monotone, logical, and stoic manner: ';
      break;
    default:
      targetVoice = voiceName;
      textPrefix = 'Say: ';
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `${textPrefix}${cleanText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: targetVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");
    return base64Audio;
  } catch (error) {
    console.error("TTS generation failed:", error);
    return null;
  }
};

export const decodeAudio = async (base64: string, ctx: AudioContext) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const dataInt16 = new Int16Array(bytes.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, 24000);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  
  return buffer;
};
