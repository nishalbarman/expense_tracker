import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "light" | "dark" | null;

export interface ThemeState {
  themePref: ThemeMode;
  preferenceModifiedByUser: boolean;
}

const initialState: ThemeState = {
  themePref: null,
  preferenceModifiedByUser: false,
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.themePref = state.themePref === "light" ? "dark" : "light";
    },
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.themePref = action.payload;
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
