# Design system

## Direction

Reference-derived teaching workspace: a white-rimmed lavender frame, spacious content, restrained geometric typography, mint collection summary, and Import → Preview → Predict → Review as the signature functional element. No financial imagery.

## Tokens

Runtime owner: src/style.css :root. Canvas #ECEEF3; surface #F6F5FA; card #FFFFFF; ink #171719; secondary #6C6D78; border #E5E5ED; mint #CBE2D8; lavender #E3E6F2; lime #EBFF8A; danger #A52D35. Accent surfaces use dark ink.

## Appearance

The header's shared ThemeToggle switches the whole document between light and dark, including authentication, workspace routes, dialogs and the unlisted planner. The attached S2-W1-01 card detail reference supplies the dark palette: canvas #0C0D10, frame #15171C, frame edge #22252D, tiles #1C1F26, tracks #262A33, hatching #2C313B, ink #F1F2F6, secondary #9096A3, borders #2B303B, lavender #2A2F45, mint #223D31, lime #DCEE72, teal #4FA89F. Bright lime uses #1D2200 text; teal uses #07201D. Selected pills and primary actions invert to light ink with #111216 labels. Geometry and typography stay unchanged.

Runtime ownership remains in src/style.css: dark semantic palette → light-dark color adapters in the global and planner styles → shared components. Existing literal light colors remain the first branch of their adapters to preserve the established light design. ThemeToggle owns state, the student-performance-theme localStorage preference and cross-tab synchronization; index.html applies the same selection before paint. Without a saved choice, the theme follows the operating system. Print uses the light palette.

## Typography

The `/plan` page reuses Title, the app shell and shared downloads. Its scoped planning styles use the same fonts, pill buttons, fields, 25px cards and lavender/mint/lime surfaces. Member colors convey ownership. Desktop roadmap lanes and long reference tables scroll locally; phone task lanes stack. The supplied planning runtime is isolated in a React mount adapter, with listeners removed on cleanup and delayed restore work cancelled on unmount. The complete reduced-plan data and static reference HTML stay separate from the presentation.

Manrope Variable display; DM Sans Variable body; Consolas utility. Robust system fallbacks. Titles 40px desktop / 32px mobile. Variable fonts are bundled locally through Fontsource; no remote font dependency.

## Layout

Document scroll owns page height. Desktop overview uses varied three-column cards and full-width dataset table. Tablet collapses cards. Mobile uses stacked content and table-local horizontal overflow. 25px card radius; 12px fields; pill navigation.

## Shared components

Title owns headings/breadcrumbs; Steps owns workflow; Table owns semantic sortable tables, local private search and URL paging/sort; Dialog uses native showModal focus containment and restoration; App owns toast, shell, account and Demo Controls. Native selects intentionally retain platform popup behavior.

Plan task details use the shared Dialog's `plan` variant: a large white-rimmed lavender frame with a sticky close bar and a scrollable grid of white, mint and lavender tiles. Effort bars, prerequisite links, people, ordered steps, worked pattern, acceptance, resources and scope use the attached card-detail reference as their visual source. Phones stack all tiles. Compact roadmap cards never expand inline; modal navigation keeps the roadmap filters intact. The route remains absent from main navigation.

## States and accessibility

Semantic controls, text status, focus rings, reduced motion, global scrollbar baseline, accessible native dialogs, persistent inline form errors. Charts retain numeric labels and tables or textual equivalents.

## Completion ownership

`ui.tsx` owns navigation context, query state, persistent form feedback, read recovery, popovers and focus tooltips. `components.tsx` owns dialogs/drawers, tables and export scope selection. `features/insights.tsx` owns evaluation, quality, analytics and activity; `features/support.tsx` owns help content and persona-scoped feedback outbox. Download notices participate in document flow so they never cover mobile utilities. Native date controls intentionally own activity date entry.

Authentication additions retain the split teaching introduction and restrained white form. Google provider button, paired recovery/registration links and mint success/inbox panels reuse the existing palette. AuthOptions and DemoPassword reuse shared Dialog and FormMessage rather than adding another overlay system.

Registration and password recovery use inline views within the shared split sign-in canvas, not modal forms. The lavender narrative panel and mint workspace/recovery card anchor desktop; phone prioritizes the white form with document scrolling. Google retains its existing modal chooser. AuthSurface owns titles, return action and shared hierarchy; mode transitions focus the visible heading.
