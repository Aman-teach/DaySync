// Web mock for Voice module to prevent bundler errors
export const Voice = {
  start: async (locale: string) => {},
  stop: async () => {},
  destroy: async () => {},
  removeAllListeners: () => {},
  onSpeechResults: null as any,
  onSpeechPartialResults: null as any,
  onSpeechError: null as any,
};
