export const APPWRITE_CONFIG = {
  ENDPOINT:    process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT    || 'https://sgp.cloud.appwrite.io/v1',
  PROJECT_ID:  process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID  || '6a4b75b7003d538d3d92',
  DATABASE_ID: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || 'atlas_os_db',
  COLLECTIONS: {
    ENTRIES:      process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ENTRIES   || 'cadence_entries',
    DAY_SUMMARIES:process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_SUMMARIES || 'cadence_daysummaries',
    EPISODES:     process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_EPISODES  || 'episodes',
    ACTIONS:      process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ACTIONS   || 'actions',
    TASKS:        process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_TASKS     || 'tasks',
    TAGS:         process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_TAGS      || 'cadence_tags',
  },
  IMAGES_BUCKET_ID: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_IMAGES || '6a60c17d003ab60c617c',
  FUNCTIONS: {
    TRANSCRIBE: process.env.EXPO_PUBLIC_APPWRITE_FUNCTION_TRANSCRIBE || '6a60cc55000f4089752f',
  },
};
