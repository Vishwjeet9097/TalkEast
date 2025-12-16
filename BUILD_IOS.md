# iOS Installation Guide for TalkEast

यह guide आपको TalkEast app को iPhone पर install करने में मदद करेगा।

## Prerequisites (आवश्यक सामान)

1. **macOS** (Mac computer required for iOS development)
2. **Xcode** (latest version) - [Download from App Store](https://apps.apple.com/app/xcode/id497799835)
3. **Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```
4. **CocoaPods** (iOS dependency manager):
   ```bash
   sudo gem install cocoapods
   ```

## Step-by-Step Instructions

### Step 1: Install iOS Platform

```bash
npm install
npx cap add ios
```

यह iOS platform को project में add करेगा।

### Step 2: Build Web App

```bash
npm run build
```

यह `dist` folder में production build बनाएगा।

### Step 3: Sync with iOS

```bash
npx cap sync ios
```

यह web build को iOS project में copy करेगा।

### Step 4: Open in Xcode

```bash
npx cap open ios
```

या manually:

```bash
cd ios
open App.xcworkspace
```

**Important:** हमेशा `.xcworkspace` file open करें, `.xcodeproj` नहीं!

### Step 5: Configure Signing & Capabilities

Xcode में:

1. **Project Navigator** में `App` project select करें
2. **TARGETS** में `App` select करें
3. **Signing & Capabilities** tab पर जाएं:
   - **Team** select करें (अपना Apple Developer account)
   - **Bundle Identifier** check करें: `com.talkeast.lingoflow`
   - **Automatically manage signing** enable करें

### Step 6: Configure Permissions

**Info.plist** में permissions already configured हैं:

- Microphone
- Photo Library
- Camera
- Notifications

यदि manually check करना हो:

1. `ios/App/App/Info.plist` file open करें
2. सभी permission descriptions verify करें

### Step 7: Select Device

Xcode toolbar में:

1. Device selector में अपना iPhone select करें
   - या **Any iOS Device** for simulator
   - या **Your iPhone Name** (USB connected)

### Step 8: Build & Run

#### Option A: Xcode से (Recommended)

1. **Product** menu → **Run** (या `Cmd + R`)
2. App automatically build होगा और iPhone पर install होगा

#### Option B: Command Line से

```bash
cd ios
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug -destination 'platform=iOS,name=Your iPhone Name' build
```

### Step 9: Trust Developer Certificate (First Time Only)

iPhone पर:

1. **Settings** → **General** → **VPN & Device Management**
2. अपना developer certificate select करें
3. **Trust** button tap करें

### Step 10: Run App

iPhone पर app icon tap करें और app open करें!

## Testing on Simulator

यदि physical device नहीं है:

1. Xcode में device selector में **iPhone Simulator** select करें
2. **Product** → **Run** (या `Cmd + R`)
3. Simulator automatically open होगा

## Troubleshooting

### Error: "No signing certificate found"

- **Solution**: Xcode में Signing & Capabilities में अपना Apple ID add करें

### Error: "Bundle identifier already exists"

- **Solution**: `capacitor.config.ts` में `appId` change करें

### Error: "CocoaPods not installed"

- **Solution**:
  ```bash
  sudo gem install cocoapods
  cd ios/App
  pod install
  ```

### Error: "Build failed"

- **Solution**:
  1. Xcode में **Product** → **Clean Build Folder** (`Cmd + Shift + K`)
  2. `ios/App` folder में:
     ```bash
     pod deintegrate
     pod install
     ```
  3. फिर से build करें

### App not appearing on iPhone

- **Solution**:
  1. iPhone को unlock करें
  2. Xcode में device logs check करें
  3. Settings में developer certificate trust करें

## Production Build (App Store के लिए)

### Step 1: Archive Build

1. Xcode में **Product** → **Archive**
2. Archive complete होने के बाद **Organizer** window open होगा

### Step 2: Distribute

1. **Distribute App** button click करें
2. **App Store Connect** select करें
3. Distribution options follow करें

## Quick Commands Summary

```bash
# Install dependencies
npm install

# Add iOS platform (first time only)
npx cap add ios

# Build web app
npm run build

# Sync with iOS
npx cap sync ios

# Open in Xcode
npx cap open ios

# Or manually
cd ios
open App.xcworkspace
```

## Important Notes

1. **macOS Required**: iOS development के लिए Mac computer जरूरी है
2. **Apple Developer Account**: Physical device पर test करने के लिए free Apple ID भी काम करेगा
3. **Xcode Version**: Latest Xcode version use करें
4. **iOS Version**: Minimum iOS 13+ support

## Next Steps

App successfully install होने के बाद:

- सभी permissions (Notifications, Microphone) test करें
- Offline functionality check करें
- Performance verify करें

Happy coding! 🚀
