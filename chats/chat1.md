# Sprout mobile app design

_Started 2026-09-24 13:56 UTC_

---

## User

Design a mobile app for Sprout mobile app.. follow the details in attached text file and designs in the images

## User

Design a mobile app for Sprout mobile app.. follow the details in attached text file and designs in the images

## User

please create the design for my app

## Assistant

_[tool: update_todos]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: dc_write]_

Quick check of Pip and the card before building screens.

_[tool: dc_write]_

_[tool: show_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: sleep]_

_[tool: save_screenshot]_

_[tool: dc_js_str_replace]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: show_html]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: delete_file]_

_[tool: update_todos]_

_[tool: ready_for_verification]_

The shared building blocks and the **Today** file (`Sprout Today.dc.html`) are done. The rest of the design isn't built yet: I've hit the usage limit for now, so I stopped here.

**Built so far:**
- **Pip:** a vector mascot in separate parts, one per body part for Rive. It has 8 moods (the 6 you asked for plus Relieved and Waving) and all the props: book, dumbbells, meditating, sneakers, trophy and bell.
- **Shared parts:** the habit card (due, in progress with ring, done, rest day, pressed), icons, status bar, bottom nav with the + button, and the home screen.
- **Today screens:**
  - 05 Home mid-day. This one works: tap the cards to log water or check off habits. You'll see confetti, the streak number flip up, the badge update and Pip's mood change.
  - 06 Evening, 07 Empty state, and the dark-mode Home.
  - 08 Completion storyboard in 4 frames, with timings.
  - 09 Perfect day.
  - 10 Add habit sheet. This one also works: switch between the three options, pick a color and change the reminder interval.

**Choices where the brief left room:**
- The badge shows 1/4, because only Read is done and Walk is on a rest day.
- Gym and Walk streaks carry a small "wk" label, since they count weeks.
- Streak numbers use a slightly darker version of each habit color so they're readable. Sunflower in particular is too pale on white.
- Walk's streak (3 weeks) isn't in your sample data, so I made it up.

**Still to build:** onboarding (1–4), habit detail, streak slipped and shield, Progress, You (11–16), the weekly recap stories plus the dark recap card, the lock screen and widgets (17–23), and the design system page, component library and Pip sheet. Tell me to continue and I'll pick up with those. The page header already has links to those files, but they won't open until the files exist.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

## Assistant

_[tool: dc_write]_

## Assistant

_[tool: update_todos]_

_[tool: dc_write]_

## Assistant

_[tool: update_todos]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: update_todos]_

_[tool: ready_for_verification]_

All screens are now built, and I fixed the text-wrapping and sheet-overflow problems the check found in the Today file. A check of the design system page is running now. I haven't looked at the onboarding, habits and recap files on screen yet, so they may need small fixes too.

The design is split into five linked pages:
- **Design system:** colors, type, spacing, corner radii, the hard-edge depth rules, icons, the component library, the Pip sheet (moods, props, and each part shown on its own for Rive) and motion notes.
- **Onboarding (01–04):** you can tap habit tiles and use the steppers and day toggles.
- **Today (05–10 + dark Home):** Home mid-day and the Add habit sheet respond to taps.
- **Habits & progress (11–16):** the Week/Month toggle on Progress works.
- **Recap & system (17–23 + dark recap card):** the first frame is a story player you can tap through.

Things to know:
- **Data I made up:** Read's month stats, the You profile ("Alex", 38 perfect days), and when the next shield arrives.
- **Sunflower screens:** the Read header uses dark text instead of white, because white on that yellow is too hard to read.
- **Evening widget:** it shows 1/4, which matches the evening Home screen.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

I fixed the header on the design system page: the subtitle no longer runs into the intro paragraph below it.

One layout warning came back after the fix, and it's expected. The tiny Pip in the notification icon is meant to be cropped by its rounded square, so nothing needs changing there.

