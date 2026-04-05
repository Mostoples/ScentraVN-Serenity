# 🍔 Hamburger Menu Guide - Mobile Header

## ✅ Fitur Baru: Hamburger Dropdown Menu untuk Mobile

Header buttons sekarang otomatis jadi **hamburger menu** di mobile untuk menghemat space!

---

## 📱 Responsive Behavior

### Desktop (≥769px)
```
┌────────────────────────────────────────────┐
│ [Logo] Time    [🇮🇩≈≈≈] [🌐ID] [🔗] [•]   │
│                ↑ Semua button terlihat      │
└────────────────────────────────────────────┘
```
✅ **Semua button tampil** (Music, Language, BLE, Indicator)
✅ **Hamburger HIDDEN**
✅ **Normal header layout**

---

### Mobile (≤768px)
```
┌────────────────────────────┐
│ [Logo] Time      [☰]       │
│                   ↑         │
│              HAMBURGER      │
└────────────────────────────┘
```
✅ **Hanya hamburger icon** yang terlihat
✅ **Semua button HIDDEN** (tersimpan di menu)
✅ **Clean & minimal header**

---

## 🎬 How It Works

### 1️⃣ **Closed State (Default)**
```
MOBILE HEADER:
┌────────────────────────────┐
│ [Logo] 10:30 AM    [☰]     │
└────────────────────────────┘

All buttons hidden, hamburger visible
```

### 2️⃣ **User Taps Hamburger**
```
MOBILE HEADER:
┌────────────────────────────┐
│ [Logo] 10:30 AM    [✕]     │ ← Hamburger jadi X
├────────────────────────────┤
│ 🇮🇩 ≈≈≈ Music Player       │ ← Music button
├────────────────────────────┤
│ 🌐 Language     ID   →     │ ← Language toggle
├────────────────────────────┤
│ 🔗 Connect Device          │ ← BLE connect
├────────────────────────────┤
│ • Device Status            │ ← BLE indicator
└────────────────────────────┘
```

### 3️⃣ **User Taps Menu Item**
- ✅ Action executed (e.g., show music controller)
- ✅ Menu auto-closes
- ✅ Hamburger back to normal (☰)

### 4️⃣ **User Taps Outside or ESC**
- ✅ Menu closes
- ✅ Hamburger back to (☰)

---

## 🎨 Visual Design

### Hamburger Icon
```
Normal (☰):        Active (✕):
  ───              ╲   ╱
  ───               ╲ ╱
  ───                ✕
                   ╱ ╲
                  ╱   ╲
```

**Animation:**
- **Duration:** 0.3s
- **Easing:** cubic-bezier(0.4, 0, 0.2, 1)
- **Effect:** Smooth rotation to X

### Dropdown Menu
```
┌────────────────────────────┐
│ [Logo]          [✕]        │ ← Header (fixed)
├────────────────────────────┤
│                            │
│  Dropdown overlay          │ ← Backdrop blur
│  (dark transparent)        │
│                            │
│  ┌──────────────────────┐  │
│  │ Menu Items (white)   │  │ ← Slide down
│  │ ───────────────────  │  │
│  │ Item 1               │  │
│  │ Item 2               │  │
│  │ Item 3               │  │
│  └──────────────────────┘  │
│                            │
└────────────────────────────┘
```

**Properties:**
- **Background:** Dark overlay with blur
- **Dropdown:** White with slide-down animation
- **Position:** Full-width below header
- **Max-height:** `calc(100vh - header height)`
- **Scroll:** Auto if content too tall

---

## 🎯 Menu Items

Each menu item is a **full-width button** with proper spacing:

### Music Player Button
```
┌────────────────────────────┐
│ 🇮🇩  ≈≈≈  Music Player      │
│  ↑    ↑                     │
│ Flag Waves                  │
└────────────────────────────┘
```
- **Icon:** Flag + animated wave bars
- **Action:** Show music controller
- **Style:** Left-aligned with gap

### Language Toggle
```
┌────────────────────────────┐
│ 🌐 Language          ID  →  │
│  ↑                   ↑      │
│ Icon              Current   │
└────────────────────────────┘
```
- **Icon:** Globe
- **Text:** "Language"
- **Badge:** Current language (ID/EN)
- **Action:** Toggle language
- **Style:** Space-between layout

### BLE Connect
```
┌────────────────────────────┐
│ 🔗 Connect Device           │
│  ↑                          │
│ Link icon                   │
└────────────────────────────┘
```
- **Icon:** Link
- **Text:** "Connect Device"
- **Action:** Start BLE connection
- **Style:** Left-aligned

### BLE Indicator
```
┌────────────────────────────┐
│ • Device Status             │
│ ↑                           │
│ Pulsing dot (connected)     │
│ Gray dot (disconnected)     │
└────────────────────────────┘
```
- **Icon:** Colored dot
- **Green + pulse:** Connected
- **Gray:** Disconnected
- **Style:** Status display

---

## ✨ Animations

### Hamburger Icon Transform
```css
Normal → Active:
  Line 1: Rotate 45° + translate down
  Line 2: Scale to 0 (disappear)
  Line 3: Rotate -45° + translate up
  Result: Perfect X shape
```

### Dropdown Slide Down
```css
@keyframes slideDown {
  from: translateY(-20px), opacity: 0
  to:   translateY(0), opacity: 1
}
Duration: 0.3s
```

### Hover Effects
- **Hamburger hover:** Light purple background
- **Menu item hover:** Light purple background (5% opacity)
- **Menu item active:** Darker purple background (10% opacity)

---

## 📱 Responsive Breakpoints

### Desktop (≥769px)
- ✅ Hamburger: `display: none`
- ✅ All buttons: `display: flex`
- ✅ Dropdown: `display: none`

### Tablet (≤768px)
- ✅ Hamburger: `display: flex`
- ✅ All buttons: `display: none`
- ✅ Dropdown: Available on click

### Mobile (≤480px)
- ✅ Smaller hamburger icon (22px × 18px)
- ✅ Smaller menu item padding (12px 16px)
- ✅ Smaller font size (0.85rem)

---

## 🎯 User Interactions

### Opening Menu:
1. **Tap hamburger** (☰)
2. **Icon transforms** to X (0.3s)
3. **Backdrop appears** (fade in)
4. **Menu slides down** (0.3s)
5. **Body scroll locked** (prevent page scroll)

### Selecting Item:
1. **Tap menu item**
2. **Action executes** (show controller, toggle language, etc.)
3. **Menu closes automatically**
4. **Icon back to** (☰)

### Closing Menu:
**Method 1:** Tap X button
**Method 2:** Tap outside (backdrop)
**Method 3:** Press ESC key
**Method 4:** Select any menu item

All methods:
- ✅ Menu slides up (fade out)
- ✅ Backdrop fades out
- ✅ Icon back to (☰)
- ✅ Body scroll restored

---

## 🎨 Color Scheme

### Hamburger Button
- **Normal:** Transparent background
- **Hover:** `rgba(139, 92, 246, 0.1)`
- **Icon color:** `--primary-600` (#7c3aed)

### Dropdown Backdrop
- **Background:** `rgba(15, 23, 42, 0.8)`
- **Backdrop blur:** 8px

### Menu Items
- **Background:** White
- **Hover:** `rgba(139, 92, 246, 0.05)`
- **Active:** `rgba(139, 92, 246, 0.1)`
- **Border:** `rgba(139, 92, 246, 0.1)`
- **Text:** `--text-primary`
- **Icons:** `--primary-600`

---

## 🔧 Technical Implementation

### HTML Structure (Auto-generated)
```html
<!-- Hamburger Button -->
<button id="hamburgerBtn" class="hamburger-btn">
  <div class="hamburger-icon">
    <span></span> <!-- Line 1 -->
    <span></span> <!-- Line 2 -->
    <span></span> <!-- Line 3 -->
  </div>
</button>

<!-- Dropdown Menu -->
<div id="headerDropdown" class="header-dropdown">
  <div class="dropdown-content">
    <div class="dropdown-items">
      <!-- Cloned buttons from header -->
    </div>
  </div>
</div>
```

### JavaScript Functions
```javascript
HeaderMenu.init()        // Initialize menu
HeaderMenu.open()        // Open menu
HeaderMenu.close()       // Close menu
HeaderMenu.toggle()      // Toggle menu
HeaderMenu.cloneHeaderItems() // Clone buttons to dropdown
```

### Event Listeners
- **Hamburger click:** Toggle menu
- **Outside click:** Close menu
- **ESC key:** Close menu
- **Window resize:** Auto-close if desktop
- **Menu item click:** Execute action + close

---

## ✅ Features Checklist

- [x] Hamburger icon with smooth X animation
- [x] Full-screen dropdown with backdrop
- [x] Slide-down animation for menu
- [x] All header buttons cloned to dropdown
- [x] Event listeners preserved on cloned items
- [x] Auto-close on item selection
- [x] Close on outside click
- [x] Close on ESC key
- [x] Body scroll lock when open
- [x] Responsive breakpoints (769px threshold)
- [x] Touch-friendly tap targets
- [x] Smooth transitions & animations
- [x] Purple theme consistency

---

## 🚀 Testing Checklist

### Desktop (>768px):
- [ ] Hamburger NOT visible
- [ ] All buttons visible in header
- [ ] Normal header functionality

### Mobile (≤768px):
- [ ] Only hamburger visible
- [ ] All buttons hidden
- [ ] Tap hamburger → Menu opens
- [ ] Menu shows all items
- [ ] Wave bars animating on music button
- [ ] Tap item → Action works + menu closes
- [ ] Tap outside → Menu closes
- [ ] Tap X → Menu closes
- [ ] Press ESC → Menu closes

### Transitions:
- [ ] Hamburger → X animation smooth (0.3s)
- [ ] Dropdown slide down smooth (0.3s)
- [ ] Hover effects work on all items
- [ ] Active states visible on tap

---

## 💡 User Experience Flow

```
DESKTOP USER:
- Opens app → Sees all buttons in header
- Uses buttons directly → No hamburger needed

MOBILE USER:
- Opens app → Clean header with hamburger
- Taps hamburger → Menu opens with all options
- Selects Music → Music controller appears, menu closes
- Later needs language → Taps hamburger again
- Taps Language → Language toggles, menu closes
- Clean UI, accessible features ✅
```

---

## 🎯 Benefits

### Before (All Buttons on Mobile):
❌ Header crowded (4+ buttons)
❌ Buttons too small to tap
❌ Overlap on small screens
❌ Text truncated
❌ Bad UX on 320px width

### After (Hamburger Menu):
✅ **Clean header** - Just logo + time + hamburger
✅ **Space efficient** - No crowding
✅ **Touch-friendly** - Full-width tap targets
✅ **Organized** - All options in one place
✅ **Professional** - Standard mobile pattern
✅ **Scalable** - Easy to add more items

---

**Status:** ✅ Implemented & Production Ready
**Breakpoint:** 768px (mobile ≤768px, desktop ≥769px)
**Files:** `header-menu.js`, `header-menu.css`
**Auto-init:** Yes (on DOM ready)
**Dependencies:** None (standalone)
