# Android APK Build Guide for TalkEast

यह guide आपको TalkEast app का Android APK बनाने में मदद करेगा।

## Prerequisites (आवश्यक सामान)

1. **Node.js** (v18 या उच्चतर) - [Download](https://nodejs.org/)
2. **Java JDK 17** - [Download](https://adoptium.net/)
3. **Android Studio** - [Download](https://developer.android.com/studio)
4. **Android SDK** (Android Studio के साथ install होता है)

## Step-by-Step Instructions

### Step 1: Dependencies Install करें

```bash
npm install
```

### Step 2: Capacitor Initialize करें

```bash
npx cap init
```

जब prompt आए:
- **App name**: TalkEast
- **App ID**: com.talkeast.lingoflow
- **Web dir**: dist

### Step 3: Android Platform Add करें

```bash
npx cap add android
```

### Step 4: Web App Build करें

```bash
npm run build
```

यह `dist` folder में production build बनाएगा।

### Step 5: Capacitor Sync करें

```bash
npx cap sync android
```

यह web build को Android project में copy करेगा।

### Step 6: Android Studio में Open करें

```bash
npx cap open android
```

या manually:
```bash
cd android
```

फिर Android Studio में `android` folder open करें।

### Step 7: APK Build करें

#### Option A: Android Studio से (Recommended)

1. Android Studio में project open करें
2. **Build** menu → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. Build complete होने के बाद, **locate** button click करें
4. APK file path: `android/app/build/outputs/apk/debug/app-debug.apk`

#### Option B: Command Line से

```bash
cd android
./gradlew assembleDebug
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 8: Release APK (Production के लिए)

Production APK के लिए keystore बनाना होगा:

```bash
cd android/app
keytool -genkey -v -keystore talkeast-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias talkeast
```

फिर `android/app/build.gradle` में signing config add करें।

## Quick Build Script

सभी steps एक साथ:

```bash
npm run android:build
```

यह automatically:
1. Web app build करेगा
2. Capacitor sync करेगा
3. Android Studio open करेगा

## Troubleshooting

### Error: "SDK location not found"
- Android Studio में SDK path set करें
- `local.properties` file में `sdk.dir` add करें

### Error: "Gradle sync failed"
- Android Studio में **File** → **Sync Project with Gradle Files**

### Error: "Build failed"
- `android/gradle.properties` में `org.gradle.jvmargs` check करें
- Java version verify करें: `java -version`

## APK Install करना

1. APK file को Android device में transfer करें
2. Device में **Settings** → **Security** → **Unknown Sources** enable करें
3. APK file पर tap करें और install करें

## Important Notes

- **Debug APK**: Testing के लिए (unsigned)
- **Release APK**: Production के लिए (signed keystore के साथ)
- **First build**: 5-10 minutes लग सकते हैं (dependencies download)
- **Subsequent builds**: 1-2 minutes

## Environment Variables

`.env.local` file में `GEMINI_API_KEY` set करना न भूलें:

```
GEMINI_API_KEY=your_api_key_here
```

## Support

अगर कोई issue आए तो:
1. Android Studio में error logs check करें
2. `android/app/build` folder clean करें: `cd android && ./gradlew clean`
3. Dependencies reinstall करें: `npm install && npx cap sync android`

