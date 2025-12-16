# Quick iOS Installation Guide

## ✅ Step 1: Install CocoaPods (Required)

```bash
sudo gem install cocoapods
```

## ✅ Step 2: Install Pods

```bash
cd ios/App
pod install
cd ../..
```

## ✅ Step 3: Open in Xcode

```bash
npx cap open ios
```

या manually:
```bash
cd ios/App
open App.xcworkspace
```

**⚠️ Important:** हमेशा `.xcworkspace` file open करें, `.xcodeproj` नहीं!

## ✅ Step 4: Configure in Xcode

1. **Project Navigator** में `App` project select करें
2. **TARGETS** → `App` select करें
3. **Signing & Capabilities** tab:
   - **Team** select करें (अपना Apple ID)
   - **Automatically manage signing** ✅ enable करें

## ✅ Step 5: Select Your iPhone

Xcode toolbar में device selector से अपना iPhone select करें

## ✅ Step 6: Build & Run

**Product** → **Run** (या `Cmd + R`)

## 🔧 Troubleshooting

### CocoaPods Install Error
```bash
# Try with sudo
sudo gem install cocoapods

# Or use Homebrew
brew install cocoapods
```

### Xcode Not Found
1. App Store से Xcode install करें
2. Xcode open करें और accept करें
3. Command line tools setup:
   ```bash
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   ```

### Pod Install Error
```bash
cd ios/App
pod deintegrate
pod install
```

### Trust Developer Certificate (First Time)
iPhone पर:
- **Settings** → **General** → **VPN & Device Management**
- अपना certificate select करें
- **Trust** tap करें

## 📱 Ready!

App आपके iPhone पर install हो जाएगा! 🎉

