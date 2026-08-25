# CleverOps Mobile App Branding & Icon Setup Guide

> [!NOTE]
> This guide documents the setup instructions for applying the official CleverOps logo asset (`public/logo.png`) to the Android/iOS mobile applications in `smartdine-mobile` when future mobile builds are executed.

---

## 1. Official Asset Source

- **Source Image**: `public/logo.png`
- **Format**: PNG (Transparent / High-resolution square asset)

---

## 2. Android App Launcher & Adaptive Icon Asset Paths

When updating `smartdine-mobile/android/app/src/main/res/`:

1. **Launcher Icon (`mipmap-hdpi`, `mipmap-mdpi`, `mipmap-xhdpi`, `mipmap-xxhdpi`, `mipmap-xxxhdpi`)**:
   - `ic_launcher.png`
   - `ic_launcher_round.png`

2. **Adaptive Icon (Android 8.0+)**:
   - `mipmap-anydpi-v26/ic_launcher.xml`
   - Foreground vector/PNG: `ic_launcher_foreground.png`
   - Background color: `#0F172A` (Slate Dark) or `#10B981` (Emerald Accent)

3. **Notification Icon (`drawable/ic_notification.png`)**:
   - Monochromatic white silhouette logo on transparent background.

---

## 3. Expo / React Native App Configuration (`app.json`)

```json
{
  "expo": {
    "name": "CleverOps Staff",
    "slug": "cleverops-staff",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0F172A"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0F172A"
      },
      "package": "in.cleverops.staff"
    }
  }
}
```
