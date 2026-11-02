'use client';
import { createToastHook } from '@gluestack-ui/core/toast/creator';
import { View } from 'react-native';

/** The native gluestack toast hook. `ToastProvider` is already mounted by `GluestackUIProvider`. */
export const useToast = createToastHook(View);
