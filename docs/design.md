# RepoLens visual direction

RepoLens makes GitHub documentation understandable for readers without programming experience. The lens and text lines remain its original mark.

## Headspace reference, inspected through OpenCLI

The visual refresh uses the exact [Headspace iOS version supplied by the user](https://mobbin.com/apps/headspace-ios-28986bf8-81b2-4af0-84df-b5654a8c98f9/f2c7edab-00b5-460c-9663-1cf64517f7db/screens). Screens were opened in Mobbin's large detail viewer and captured with OpenCLI at a 1600 × 1200 viewport. Local research screenshots are kept under ignored `artifacts/headspace-reference/`; third-party artwork is not distributed with this repository.

| Screen | Observed pattern | RepoLens adaptation |
| --- | --- | --- |
| [Today: Start your day](https://mobbin.com/screens/1cba404f-413c-4a8b-be36-d791e9ca4fed) | White reading canvas, warm neutral rounded cards, strong short headings, small status markers and a dotted activity path | Main foundation: readable settings and a numbered setup guide, soft warm panels, restrained depth |
| [Exploring Stillness: course details](https://mobbin.com/screens/08064d8c-1dde-4370-9bc6-ab1f6f5ca786) | Warm yellow/orange illustration above a quiet content area, dark titles, clear blue capsule action | Cream welcome panel with original lens illustration; blue save action; warm brand mark |

The course player was also opened, but its animated content did not reliably load during capture. No additional design claims are based on it.

## Reference lock

Primary foundation: **Today's calm reading layout**. Preserve generous spacing, warm near-white surfaces, compact metadata, rounded cards and a subtle lower edge. Borrow only the warm introductory art and blue primary action from the course screen. Adapt the iOS vertical rhythm to a desktop two-column setup that stacks on mobile.

| Token or component | Value / role |
| --- | --- |
| Canvas | `#fffdfa`, quiet reading background |
| Text | `#39342f`, dark warm ink; secondary text remains readable |
| Card | `#f8f5f1` for supporting content, white for form fields' containing card |
| Welcome | `#fff1d6`, introductory surface only |
| Orange | `#ffb64a`, brand and step markers; not success/error status |
| Blue | `#075de3`, primary action, links and focus; white action label |
| Shape | 20–28px card corners, capsule action buttons, small numbered circles |
| Typography | Local system sans-serif; stronger headings and comfortable body leading |
| Artwork | Original static SVG document and lens, no Headspace characters or wordmarks |
| Dark mode | Separate warm dark neutrals with light ink and blue actions |

The options page, injected README toolbar, static icon and Hyperframes README animation share this direction. The extension runtime loads no animation library or remote font.

## Earlier reference

The earlier Refero URL could not be inspected because its MCP returned `NO_SUBSCRIPTION`. This refresh is grounded in the Mobbin screens above, not in that unavailable reference.
