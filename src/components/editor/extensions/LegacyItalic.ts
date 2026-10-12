import { Mark } from "@tiptap/core";

/**
 * The site never uses italics, so the editor offers no way to add them: no toolbar button,
 * no Ctrl/Cmd+I, no *text* input or paste rules. This bare mark only keeps older content
 * that already contains italic marks loadable (an unknown mark type would throw), and the
 * public CSS renders any <em> as normal text.
 */
export const LegacyItalic = Mark.create({
  name: "italic",
  parseHTML() {
    return [{ tag: "em" }, { tag: "i" }, { style: "font-style=italic" }];
  },
  renderHTML() {
    return ["em", 0];
  },
});
