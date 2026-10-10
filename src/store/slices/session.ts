import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { hydrateAll } from '../actions';

export interface Profile { name: string; avatarColor: string }
export interface SessionState {
  /** True once persisted state has been loaded on the client; gates localStorage writes. */
  hydrated: boolean;
  email: string | null;
  profile: Profile;
}

export const DEFAULT_PROFILE: Profile = { name: 'Demo User', avatarColor: '#6366f1' };

const initialState: SessionState = { hydrated: false, email: null, profile: DEFAULT_PROFILE };

const slice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setSessionEmail(s, a: PayloadAction<string | null>) { s.email = a.payload; },
    updateProfile(s, a: PayloadAction<Partial<Profile>>) { s.profile = { ...s.profile, ...a.payload }; },
  },
  extraReducers: (b) => {
    b.addCase(hydrateAll, (s, a) => ({
      ...s,
      hydrated: true,
      profile: a.payload.profile ?? s.profile,
    }));
  },
});

export const { setSessionEmail, updateProfile } = slice.actions;
export default slice.reducer;
