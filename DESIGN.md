---
version: alpha
colors:
  canvas: "#ECEEF3"
  frame: "#F6F5FA"
  card: "#FFFFFF"
  primary: "#171719"
  secondary: "#6C6D78"
  border: "#E2E3EB"
  mint: "#CBE2D8"
  lavender: "#E3E6F2"
  lime: "#EBFF8A"
  danger: "#A52D35"
  focus: "#315EEC"
typography:
  display:
    fontFamily: '"Manrope Variable", "Segoe UI", sans-serif'
  body:
    fontFamily: '"DM Sans Variable", "Segoe UI", sans-serif'
  utility:
    fontFamily: 'Consolas, "Courier New", monospace'
rounded:
  card: "25px"
  field: "12px"
  pill: "999px"
omitted:
  - section: spacing
    reason: "Runtime layout uses named component rules rather than a formal spacing token scale."
---

# Design system

## Overview

Student Performance is a calm educational workspace for a small university team. Its single job is to make the path from a checked synthetic CSV to a saved, explainable output easy to follow. It should feel like a careful laboratory notebook translated into a friendly dashboard—not a school administration platform, corporate analytics suite or AI control centre.

The memorable signature is the three-bar project mark paired with restrained mint, lavender and lime evidence surfaces. Restraint wins everywhere else: plain tables, short copy, honest states and very little animation.

## Colors

Runtime ownership remains in `src/style.css`; this document mirrors the accepted semantic values.

| Role              | Value     | Use                                |
| ----------------- | --------- | ---------------------------------- |
| Canvas            | `#ECEEF3` | Browser background                 |
| Application frame | `#F6F5FA` | Main shell                         |
| Card              | `#FFFFFF` | Forms, tables and content panels   |
| Ink               | `#171719` | Primary text and actions           |
| Secondary         | `#6C6D78` | Explanations and metadata          |
| Border            | `#E2E3EB` | Structure without heavy outlines   |
| Mint              | `#CBE2D8` | Valid inputs and measured evidence |
| Lavender          | `#E3E6F2` | Secondary grouped information      |
| Lime              | `#EBFF8A` | Small signature highlights only    |
| Danger            | `#A52D35` | Errors and destructive demo reset  |

## Typography

Manrope Variable owns page and section headings. DM Sans Variable owns body copy, forms and tables. Consolas is limited to IDs, versions and compact numeric contracts. The fonts are bundled locally.

## Layout

The document owns vertical scrolling. The white-rimmed application frame sits on the gray canvas. Desktop content is capped at 1180px; paired content uses asymmetric two-column layouts. Tables own horizontal overflow locally. At 900px the navigation becomes a four-item mobile bar and paired layouts stack. At 600px the frame becomes edge-to-edge.

## Elevation & Depth

Cards use a single subtle shadow and one-pixel border. Navigation and dialogs may use stronger elevation because they cross surfaces. Do not add decorative glass panels or multiple shadow systems.

## Shapes

Cards use a 25px radius, fields 12px, compact panels 14–20px and actions use pills. The contrast between large calm cards and compact pill actions is intentional.

## Components

- `Brand`, `Title`, `Notice`, `PasswordField`, `DataTable`, `Pager`, `EmptyState`, `Dialog` and `ErrorPanel` in `src/components.tsx` are the shared owners.
- Product forms use labelled native controls with `noValidate`, inline text errors and first-error focus.
- Tables use semantic markup and a fixed 25-row page size.
- The global stylesheet owns visible scrollbars, focus, responsive behavior and reduced-motion behavior.
- Native select owns its platform popup behavior in the developer-only test panel.
- The hidden `/plan` route may use its own scoped planning styles but reuses the shared Title and Dialog.

## Do's and Don'ts

Do label every score and evaluation fixture honestly. Do use observed statistics, prediction and evaluation as three distinct concepts. Do keep the primary journey visible and short.

Do not add charts, role dashboards, student profiles, administrative controls, audit history, export menus or empty decorative controls. Do not imply that synthetic scores are trained-model probabilities or that uploaded records measure accuracy.
