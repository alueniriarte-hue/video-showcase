/** Contextos compartidos por las escenas (el tema del "antes" se define en theme.json: papel o el mismo tema). */
import {createContext} from 'react';
import {PAPER} from '../theme.ts';
import type {Theme} from '../theme.ts';

export const BeforeThemeCtx = createContext<Theme>(PAPER);
