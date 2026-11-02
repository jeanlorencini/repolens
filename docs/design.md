# RepoLens visual direction

RepoLens makes GitHub documentation understandable for readers without programming experience. The name pairs repositories with a lens: focus on meaning, keep the original within reach.

The supplied reference is https://refero.design/apps/search?app_id[id][]=309. The Refero MCP was available on 2026-11-02 but returned `NO_SUBSCRIPTION`. No screenshots or style data from that reference were retrieved. This design does not claim to reproduce it.

The direct build follows the user's modern, minimalist brief and the installed Refero Design craft guides for color and icons. The existing form and README toolbar are the product structure.

| Decision | Reference | Role |
| --- | --- | --- |
| Quiet neutral surfaces, thin borders, one column | User brief; Refero color guide | Keep attention on documentation and settings |
| Graphite lens with two text lines | RepoLens name; Refero icons guide | Original vector mark, legible at small sizes |
| System sans-serif, no remote fonts | User brief; extension platform | Local rendering, no font requests |
| Teal only for links and focus | Refero color guide | Interactive affordance |
| Dark mode with separate neutrals | Refero color guide | Respect system appearance |
| README becomes a readable summary | Existing extension behavior | Illustrated animation, not recorded evidence |

Preserve graphite logo, generous space, restrained borders, readable copy and immediate original README recovery. Avoid gradients, glossy effects and animated runtime icons. Documentation animation is independent from the extension runtime.
