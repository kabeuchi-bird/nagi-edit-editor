// keymapper のキー名（Linux）。大文字小文字を区別する
// 出典: houmain/keymapper src/runtime/Key.h の Linux 有効部分（2026-10-24 取得）
// 加えて README「Key names」「Virtual keys」「Any key」記載の 0〜9・Virtual0〜255・Any
const FROM_KEY_H =
  "Escape Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0 Minus Equal Backspace Tab " +
  "KeyQ Q KeyW W KeyE E KeyR R KeyT T KeyY Y KeyU U KeyI I KeyO O KeyP P BracketLeft BracketRight Enter ControlLeft " +
  "KeyA A KeyS S KeyD D KeyF F KeyG G KeyH H KeyJ J KeyK K KeyL L Semicolon Quote Backquote ShiftLeft Backslash " +
  "KeyZ Z KeyX X KeyC C KeyV V KeyB B KeyN N KeyM M Comma Period Slash ShiftRight NumpadMultiply AltLeft Space " +
  "CapsLock F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 ScrollLock Numpad7 Numpad8 Numpad9 NumpadSubtract Numpad4 Numpad5 " +
  "Numpad6 NumpadAdd Numpad1 Numpad2 Numpad3 Numpad0 NumpadDecimal IntlBackslash F11 F12 NumLock IntlRo Convert " +
  "KanaMode NonConvert NumpadEnter ControlRight NumpadDivide PrintScreen AltRight Cancel Home ArrowUp PageUp " +
  "ArrowLeft ArrowRight End ArrowDown PageDown Insert Delete AudioVolumeMute AudioVolumeDown AudioVolumeUp Power " +
  "NumpadEqual Settings Pause NumpadComma Lang1 Lang2 IntlYen MetaLeft MetaRight ContextMenu BrowserStop Again " +
  "Props Undo Select Copy Open Paste Find Cut Help LaunchApp2 Sleep WakeUp LaunchApp1 LaunchMail BrowserFavorites " +
  "BrowserBack BrowserForward Eject MediaTrackNext MediaPlayPause MediaTrackPrevious MediaStop MediaRewind " +
  "LaunchMediaPlayer BrowserHome BrowserRefresh F13 F14 F15 F16 F17 F18 F19 F20 F21 F22 F23 F24 MediaPlay " +
  "MediaPause Prog3 MediaFastForward BrowserSearch BrightnessDown BrightnessUp DisplayToggleIntExt WLAN Fn " +
  "ButtonLeft ButtonRight ButtonMiddle ButtonBack ButtonForward WheelUp WheelDown WheelLeft WheelRight " +
  "ContextActive Shift Control Alt Meta";

export const KEYS: ReadonlySet<string> = new Set([
  ...FROM_KEY_H.split(" "),
  ..."0123456789",
  ...Array.from({ length: 256 }, (_, i) => `Virtual${i}`),
  "Any",
]);
