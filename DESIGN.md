# Design system

## Direction

Reference-derived teaching workspace: a white-rimmed lavender frame, spacious content, restrained geometric typography, mint collection summary, and Import → Preview → Predict → Review as the signature functional element. No financial imagery.

## Tokens

Runtime owner: src/style.css :root. Canvas #ECEEF3; surface #F6F5FA; card #FFFFFF; ink #171719; secondary #6C6D78; border #E5E5ED; mint #CBE2D8; lavender #E3E6F2; lime #EBFF8A; danger #A52D35. Accent surfaces use dark ink.

## Typography

Manrope Variable display; DM Sans Variable body; Consolas utility. Robust system fallbacks. Titles 40px desktop / 32px mobile. Variable fonts are bundled locally through Fontsource; no remote font dependency.

## Layout

Document scroll owns page height. Desktop overview uses varied three-column cards and full-width dataset table. Tablet collapses cards. Mobile uses stacked content and table-local horizontal overflow. 25px card radius; 12px fields; pill navigation.

## Shared components

Title owns headings/breadcrumbs; Steps owns workflow; Table owns semantic sortable tables, local private search and URL paging/sort; Dialog uses native showModal focus containment and restoration; App owns toast, shell, account and Demo Controls. Native selects intentionally retain platform popup behavior.

## States and accessibility

Semantic controls, text status, focus rings, reduced motion, global scrollbar baseline, accessible native dialogs, persistent inline form errors. Charts retain numeric labels and tables or textual equivalents.
