AVON TOASTMASTERS TIMER PRO
================================

VERSION 9.0
  If “Version 9.0” is visible below Timing Desk on a mobile screen,
  the latest non-cached release is running.

FILES
  index.html       Main website
  styles-v9.css    Accessible responsive design (versioned to prevent old cache)
  scripts-v9.js    Timer, PWA installation, settings, records and report exports
  features-v9.js   Optional agenda, recovery, presets, templates and backups
  sw.js            Offline app worker for Cloudflare Pages
  wake-lock.mp4    Tiny local compatibility file for older mobile screen-awake support
  app-icon-192.png Android and browser installation icon
  app-icon-512.png Large application icon
  app-icon-maskable-512.png Safe maskable Android application icon
  apple-touch-icon.png iPhone and iPad Home Screen icon
  toastmasters-logo.png       Since 1924 logo used on the PowerPoint title slide locally and online
  site.webmanifest Installable-app information

HOW TO USE
  1. Keep all files together in this folder.
  2. Open index.html in Chrome, Microsoft Edge, Firefox or Safari.
  3. Enter the meeting and participant details.
  4. Select the agenda role and timing range. For Custom timing, enter each
     green, yellow, red and overtime cue using separate minute and second boxes.
  5. Run the timer and save each result.
  6. Open Report to view minute-based graphs and Table Topics analysis.
  7. Use the pencil button beside any saved result to correct its name, title,
     role, section, actual time, or green/yellow/red timing range.
  8. Download PowerPoint or CSV, or choose Print / PDF for a printable report.
  9. The Agenda builder is optional. Ignore it for the normal one-person-at-a-time
     workflow, or use it to queue participants and load the next person quickly.

ACCESSIBILITY AND TIMER SETTINGS
  Open Settings from the top-right of the website. Each person's choices are
  stored only in their browser and expire 30 days after the most recent change.
  Available choices include large text, extra-high contrast, optional
  high-visibility focus outlines, enhanced colour labels, reduced motion,
  sound cues, spoken cues, vibration, keyboard shortcuts, screen wake lock,
  and confirmation before resetting an active timer.
  Enhanced labels use both words and different symbols, so colour is never the
  only way to understand the current timer cue.
  Keyboard shortcuts: Space start/pause, R reset, L save, F full screen,
  and S opens Settings. Shortcuts can be disabled.
  Screen wake lock works on supported browsers while the timer is running.
  Version 8.2 also re-requests the native screen lock after returning to the
  app and provides a local compatibility mode for older iPhones, iPads and
  Android browsers. A visible timer status confirms whether screen-awake mode
  is active. Leave Keep screen awake enabled in Settings.
  Reset confirmation is enabled by default. If a recorded time has not been
  saved, the warning shows the exact unsaved time before it can be cleared.

INSTALL TM TIMING DESK
  The secure Cloudflare Pages version can be installed as TM Timing Desk.
  Open Settings and choose Install app.
  Android and supported computer browsers show a normal installation prompt.
  On iPhone or iPad, the Settings panel explains how to use Safari's Share
  button and Add to Home Screen, as required by iOS.
  The installed app opens in its own window and can run the main timer offline.
  PowerPoint export still requires an internet connection.
  The public HTTP address redirects to secure HTTPS. Cloudflare Access protects
  the online website with 2FA and a 24-hour session. After a successful online
  sign-in, the installed timer can use its local cache while completely offline.
  When the device is online and that session has expired, Cloudflare asks for
  2FA again. Install only on a trusted device because offline files and locally
  saved meeting information remain available on that device without a new login.

VERSION 9.0 CHANGES
  The optional Agenda builder can queue participants without changing the
  normal manual timing workflow. Queues can be saved as meeting templates.
  Custom green, yellow, red and overtime timings can be saved as reusable presets.
  An active unsaved timer can be recovered after refresh, closure or a browser crash.
  Deleted results, cleared reports and unsaved resets can be undone or restored
  from the 30-day recycle bin.
  Competition mode locks the official 5–7 speech, 1–2 Table Topics or 2–3
  Evaluation signals and provides a dedicated full-screen signal-light view.
  Reports can be printed or saved as PDF from the browser.
  Complete JSON backup and restore includes the meeting, agenda, results,
  settings, timing presets and meeting templates.
  The Settings changelog lists every Version 9.0 addition.

VERSION 8.2 CHANGES
  On mobile, the brand reads Toastmasters, Timing Desk, then the version number.
  Full-screen timer mode hides the website header, setup panel and footer,
  including the Site by Thomas Bernard credit.
  The ready message changes to Timer running immediately after Start, before
  the green signal is reached. Pausing before green shows Timer paused.
  The screen-awake system now uses the native Wake Lock API first, re-acquires
  it when the app becomes visible, and uses a local compatibility fallback.
  Settings now includes an expandable What’s new changelog.

POWERPOINT REPORT
  The club name entered at the top is used on the title slide, every slide
  header and footer, the PowerPoint document details, and the download name.
  The deck includes Toastmasters branding on the title slide and professional
  click-to-advance slide transitions.
  Other agenda items use a duration chart with a shaded target window.
  Prepared Speeches have their own status pie chart and concise speaker report.
  Table Topics have their own status pie chart and outside-time report.
  Every over-time result shows the exact amount over the selected red time.
  In the detailed agenda, On time is green, Under time is orange, and Over time is red.
  In the detailed Result column, an under-time competition warning is yellow
  and an over-time competition warning is red.
  Each section appears once so charts are not doubled up.

TABLE TOPICS TIMING
  Green: 1:00
  Yellow: 1:30
  Red: 2:00
  This is the default range. You can select Custom timing and use any valid
  minute-and-second signals. The website and PowerPoint automatically show the
  custom range instead of the default 1–2 minute wording. If speakers use
  different ranges, the report says that individually selected ranges were used.

COMPETITION EDUCATION
  “Would be disqualified” is shown only when the matching standard preset is
  selected and these real contest qualification limits are exceeded:
    5–7 minute speech: below 4:30 or above 7:30
    Table Topics:      below 1:00 or above 2:30
    Evaluation:        below 1:30 or above 3:30
  No other meeting role receives a competition disqualification message.
  A custom Table Topics range only says Under time in yellow or Over time in
  red; it does not show a competition disqualification warning.
  A standard Table Topic between 2:00 and 2:30 is over the set time but still
  competition-qualified; the report now says this clearly in green.
  On the Table Topics summary slide, the sentence “Competition: would have
  been disqualified.” is yellow for under-time and red for over-time results.
  Zero-value speech and Table Topics chart categories are removed, preventing
  misleading 0% labels from appearing on PowerPoint doughnut charts.

NOTES
  Meeting data is saved only in this browser on this device.
  Saved meeting data automatically expires five days after the last save.
  Accessibility settings, custom timings, templates and recycle-bin items are
  stored for 30 days in the current browser. JSON backup provides a portable copy.
  Sound and spoken cues are off by default. Enable either from Settings.
  The overtime screen is static. It never flickers, flashes or pulses.
  Accessibility improvements include keyboard focus indicators, a skip link,
  screen-reader status announcements, settings for low vision and blind users,
  and a visible site credit.
  Site by Thomas Bernard.
  An internet connection is needed when exporting PowerPoint because the
  PowerPoint generator is loaded securely when requested.
