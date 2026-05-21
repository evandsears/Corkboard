import { Timestamp } from "firebase/firestore";

export type Mood = 'happy' | 'calm' | 'neutral' | 'sad' | 'anxious' | 'angry' | 'excited' | 'tired' | 'focused' | 'confused' | 'horny';

export interface Entry {
  id: string;
  content?: string;
  image?: string;
  mood?: Mood;
  createdAt: Timestamp;
  uid: string;
  favorite?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
}
