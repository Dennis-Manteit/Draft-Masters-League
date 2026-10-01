# DML team logo builder — design specification

## Purpose

At Build Identity, each coach creates **one primary team logo** by selecting one of six styles. The builder uses the coach's area name, mascot name, and chosen team colours. The DML shield stays the league brand and is never edited or used as a team template.

## Mobile flow

1. Show the approved area and mascot name from Team Builder. Let the coach correct either before proceeding.
2. Choose three team colours: Primary, Secondary, and Accent. Preview the combination on light and dark surfaces.
3. Choose one of six styles from a two-column grid. Each card shows a live preview using that coach's name and colours, plus a short label.
4. Edit the limited style options described below. Show a large preview, a 48 px app-size preview, and a one-colour jersey preview.
5. Save the chosen style and its input values. The coach can return to edit until the identity is confirmed under Operations rules.

Controls need a 44 × 44 px minimum touch target, visible focus, text labels, and a preview announced as “{area} {mascot}, {style} logo.” Never rely on colour alone to distinguish a selected style or an invalid choice.

## Shared visual rules

- Use original DML team artwork, not traced or copied Australian club marks. Keep the official `DML_Shield_Green_Colourway_Transparent.png` separate from coach-created logos.
- Render a 512 × 512 SVG viewBox with a protected 32 px outer margin and a central 384 px safe zone. The same master drives square avatar, jersey patch, and small app preview; do not store duplicate raster versions for each use.
- Use all three chosen team colours with clear roles: Primary is the dominant fill or lettering, Secondary supports the main mark or badge, and Accent highlights a small feature such as a border, stripe, or eye. Accent should occupy no more than roughly 15% of the logo. White or near-black may be used for readable lettering and separation; these neutral inks do not count as a team colour.
- Require at least 4.5:1 for text and 3:1 for important boundaries against their immediate background. Check the actual pairings in every style, including Accent. Offer a suggested darker/lighter colour or different placement when a pairing fails; never silently replace a team's chosen colours.
- Prefer strong shapes, consistent stroke widths, and no gradients or fine texture. At 48 px the logo must remain identifiable. A compact variant may omit the area name but must retain the identifying mark.
- Fit names using a fixed type system. Allow two lines and reduce font size within a documented range; never stretch lettering. If a name still does not fit, ask the coach to choose a shorter display name while preserving the full team name as text outside the logo.
- Use a local, curated set of original mascot silhouettes or approved symbols. No live AI image generation or third-party logo retrieval during signup. If a mascot has no approved symbol, offer a neutral geometric emblem and label it clearly; do not invent a depiction of a cultural or protected animal motif.

## Six selectable styles

| Style | Composition | Editable choices | Compact variant |
| --- | --- | --- | --- |
| Crest or shield | Team name in a strong top band, mascot symbol centred inside an original shield shape. | Shield outline from a small fixed set; symbol from curated catalog. | Shield and symbol, with initials only if legible. |
| Mascot emblem | Large original mascot silhouette or head, with a short team-name banner below. | Approved mascot illustration and facing direction where an original alternate exists. | Mascot silhouette alone. |
| Standalone symbol | One bold approved symbol derived from the chosen mascot or team concept, without a surrounding badge. | Approved symbol and one of two balanced arrangements using Primary, Secondary, and a restrained Accent. | Same symbol. |
| Monogram or lettermark | Area and mascot initials interlock in a geometric frame. Show the full name underneath in the large version. | Two or three derived initials when needed; one of two fixed monogram layouts. | Initials only. |
| Wordmark | Full area and mascot name in distinctive, original lettering with a small supporting line or slash. | Stacked or horizontal arrangement. | Short display name or initials when space is constrained. |
| Heritage or commemorative mark | Roundel or pennant with team name, an approved symbol, and a meaningful date or milestone. | Date/milestone only when supplied and verified by the coach or league; otherwise use “INAUGURAL” with the current season. | Approved symbol and short initials, no tiny date. |

The selected style is the team's primary logo. The compact and one-colour renders are responsive presentations of the **same** identity, not extra style selections.

## Generation contract for Programming

Store structured choices rather than arbitrary SVG or uploaded HTML:

```json
{
  "version": 1,
  "areaName": "Harbour",
  "mascotName": "Hawks",
  "style": "crest",
  "primary": "#163827",
  "secondary": "#B5F320",
  "accent": "#F2C94C",
  "symbolId": "hawk-01",
  "layoutId": "shield-01",
  "displayName": "Harbour Hawks",
  "milestone": null
}
```

Allowed `style` values: `crest`, `mascot`, `symbol`, `monogram`, `wordmark`, `heritage`. The `symbolId` and `layoutId` must resolve against an approved local catalog. Derive initials and rendered text from the validated team name. Validate colour format, length limits, and catalog IDs at the data layer; reject altered requests that reference unapproved artwork or another coach's team. Escape text before SVG rendering, and never accept user-supplied SVG markup. Keep a version number so designs can be rendered consistently after template updates.

The render function takes validated data plus output mode (`full`, `compact`, or `oneColour`) and returns SVG. Cache by identity version where useful. The client may preview locally, while the server remains authoritative for saved choices and ownership. Programming owns the UI and generator; Security reviews save permissions and SVG handling; Operations defines when a confirmed identity may change.

## Acceptance check

- All six choices can be previewed with the coach's actual area, mascot, and three chosen colours on 320 px and 390 px wide phones.
- The full logo reads at 160 px; the compact mark remains identifiable at 48 px; the one-colour version works on a jersey patch.
- Long names wrap without clipping, text and important shape boundaries meet the contrast targets, and screen readers announce the selected style.
- A coach can save only their own team's approved values. The DML league shield remains untouched.
