// JS surface of the local native module. NEVER import this directly from
// app code — go through lib/native/system.ts, which soft-fails on builds
// whose binary predates the module.
import { requireNativeModule } from 'expo-modules-core';

export type SpotlightTask = { id: number; title: string; due?: string };

type MultitaskNativeModule = {
  indexTasks(items: SpotlightTask[]): Promise<void>;
  clearIndex(): Promise<void>;
};

export default requireNativeModule<MultitaskNativeModule>('MultitaskNative');
