# DaySync

I built DaySync because I wanted a frictionless way to track my focus, energy, and daily activities without feeling like I was doing data entry. 

Most time-trackers make you click through five different menus just to log that you spent 30 minutes reading. With DaySync, you just tap the mic, say what you did ("I spent the last hour debugging that weird Appwrite permissions issue"), and the app transcribes it, lets you pick a tag, and saves it. 

If you prefer typing, it has a clean text interface for that too.

## What's actually in this repo?

This is a full-stack React Native application built with Expo. Here are the core pieces:

* **The Mobile App (`artifacts/mobile/`):** An offline-first React Native app. I relied heavily on Reanimated for the UI because I wanted the check-in modal to feel genuinely premium—smooth transitions, mic pulse rings, and haptic feedback.
* **The Backend (Appwrite):** I'm using Appwrite for the database to sync entries across devices. It handles offline caching out of the box so the app works even when you're disconnected.
* **Voice Transcription:** Voice logging is powered by Deepgram. There's an Appwrite Function (`functions/transcribe/`) that securely talks to the Deepgram API so we don't leak API keys in the client code (learned that lesson the hard way).

## Tech Stack

* **Frontend:** React Native, Expo, React Native Reanimated, Expo Router.
* **Backend:** Appwrite (Database, Storage, Cloud Functions).
* **Voice:** Deepgram API for insanely fast server-side transcription, plus `react-native-voice/voice` for local capture.
* **Package Manager:** `pnpm` (specifically v9.15.0, because v10 currently breaks the EAS build workers).

## Getting Started

If you want to spin this up locally, you'll need Node, pnpm, and an Appwrite project.

1. **Clone the repo:**
   ```bash
   git clone https://github.com/Aman-teach/DaySync.git
   cd DaySync/artifacts/mobile
   ```

2. **Install dependencies:**
   Make sure you are using pnpm.
   ```bash
   pnpm install
   ```

3. **Set up environment variables:**
   Create an `.env` file in `artifacts/mobile/` and drop your Appwrite endpoint and project ID in there. Do not commit this file.

4. **Run it:**
   ```bash
   pnpm start
   ```

## A quick note on Android EAS Builds
If you try to build an APK using Expo Application Services (EAS), pay attention to the Gradle step. We hit a nasty `Duplicate class android.support.v4.*` error for a while because of a legacy dependency in the voice library. 

I wrote a custom Expo config plugin (`plugins/withAndroidSupportExclude.js`) that forcibly strips legacy support libraries during the pre-build phase. If you're forking this and upgrading Expo versions later, make sure that plugin doesn't get dropped.

## Contributing
If you find a bug, open an issue. If you want to fix it, open a PR. I review everything.
