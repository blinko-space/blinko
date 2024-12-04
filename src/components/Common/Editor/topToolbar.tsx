import { EditorSelection } from '@codemirror/state';
import { Icon } from '@iconify/react';
import { Tooltip } from '@nextui-org/react';
import { ICommand } from '@uiw/react-markdown-editor';

export const bold: ICommand = {
  name: 'bold',
  keyCommand: 'bold',
  button: { 'aria-label': 'Add bold text' },
  icon: <Icon icon="majesticons:bold" width="24" height="24" />,
  execute: ({ state, view }) => {
    console.log(state, view)
    if (!state || !view) return;
    view.dispatch(
      view.state.changeByRange((range) => ({
        changes: [
          { from: range.from, insert: '**' },
          { from: range.to, insert: '**' },
        ],
        range: EditorSelection.range(range.from + 2, range.to + 2),
      })),
    );

  },
};

export const code: ICommand = {
  name: 'code',
  keyCommand: 'code',
  button: { 'aria-label': 'Insert code' },
  icon: <Icon icon="ic:round-code" width="24" height="24" />,
  execute: ({ state, view }) => {
    if (!state || !view) return;
    view.dispatch(
      view.state.changeByRange((range) => ({
        changes: [
          { from: range.from, insert: '`' },
          { from: range.to, insert: '`' },
        ],
        range: EditorSelection.range(range.from + 1, range.to + 1),
      })),
    );
  },
};

export const codeBlock: ICommand = {
  name: 'codeBlock',
  keyCommand: 'codeBlock',
  button: { 'aria-label': 'Insert Code Block' },
  icon: <Icon icon="solar:code-outline" width="24" height="24" />,
  execute: ({ state, view }) => {
    if (!state || !view) return;
    const main = view.state.selection.main;
    const txt = view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
    view.dispatch({
      changes: {
        from: main.from,
        to: main.to,
        insert: `\`\`\`js\n${txt}\n\`\`\``,
      },
      selection: EditorSelection.range(main.from + 3, main.from + 5),
    });
  },
};


export const image: ICommand = {
  name: 'image',
  keyCommand: 'image',
  button: { 'aria-label': 'Add image text' },
  icon: <Icon icon="mage:image-plus" width="24" height="24" />,
  execute: ({ state, view }) => {
    if (!state || !view) return;
    const main = view.state.selection.main;
    const txt = view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
    view.dispatch({
      changes: {
        from: main.from,
        to: main.to,
        insert: `![](${txt})`,
      },
      selection: EditorSelection.range(main.from + 4, main.to + 4),
      // selection: { anchor: main.from + 4 },
    });
  },
};

export const italic: ICommand = {
  name: 'italic',
  keyCommand: 'italic',
  button: { 'aria-label': 'Add italic text' },
  icon: <Icon icon="uil:italic" width="24" height="24" />,
  execute: ({ state, view }) => {
    if (!state || !view) return;
    view.dispatch(
      view.state.changeByRange((range) => ({
        changes: [
          { from: range.from, insert: '*' },
          { from: range.to, insert: '*' },
        ],
        range: EditorSelection.range(range.from + 1, range.to + 1),
      })),
    );
  },
};

export const link: ICommand = {
  name: 'link',
  keyCommand: 'link',
  button: { 'aria-label': 'Add link text' },
  icon: <Icon icon="tabler:link" width="24" height="24" />,
  execute: ({ state, view }) => {
    if (!state || !view) return;
    if (!state || !view) return;
    const main = view.state.selection.main;
    const txt = view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
    view.dispatch({
      changes: {
        from: main.from,
        to: main.to,
        insert: `[${txt}]()`,
      },
      selection: EditorSelection.range(main.from + 3 + txt.length, main.to + 3),
      // selection: { anchor: main.from + 4 },
    });
  },
};

export const olist: ICommand = {
  name: 'olist',
  keyCommand: 'olist',
  button: { 'aria-label': 'Add olist text' },
  icon: (
    <svg viewBox="0 0 576 512" height="14" width="14">
      <path
        fill="currentColor"
        d="M55.1 56.04c0-13.26 11.64-24 24-24h32c14.2 0 24 10.74 24 24V176h16c14.2 0 24 10.8 24 24 0 13.3-9.8 24-24 24h-80c-12.36 0-24-10.7-24-24 0-13.2 11.64-24 24-24h16V80.04h-8c-12.36 0-24-10.75-24-24zm63.6 285.16c-6.6-7.4-18.3-6.9-24.05 1.2l-11.12 15.5c-7.7 10.8-22.69 13.3-33.48 5.6-10.79-7.7-13.28-22.7-5.58-33.4l11.12-15.6c23.74-33.3 72.31-35.7 99.21-4.9 21.3 23.5 20.8 60.9-1.1 84.7L118.8 432H152c13.3 0 24 10.7 24 24s-10.7 24-24 24H64c-9.53 0-18.16-5.6-21.98-14.4-3.83-8.7-2.12-18.9 4.34-25.9l72.04-78c5.3-5.8 5.4-14.6.3-20.5zM512 64c17.7 0 32 14.33 32 32 0 17.7-14.3 32-32 32H256c-17.7 0-32-14.3-32-32 0-17.67 14.3-32 32-32h256zm0 160c17.7 0 32 14.3 32 32s-14.3 32-32 32H256c-17.7 0-32-14.3-32-32s14.3-32 32-32h256zm0 160c17.7 0 32 14.3 32 32s-14.3 32-32 32H256c-17.7 0-32-14.3-32-32s14.3-32 32-32h256z"
      />
    </svg>
  ),
  execute: ({ state, view }) => {
    if (!state || !view) return;
    const lineInfo = view.state.doc.lineAt(view.state.selection.main.from);
    let mark = '1. ';
    const matchMark = lineInfo.text.match(/^1\./);
    if (matchMark && matchMark[0]) {
      mark = '';
    }
    view.dispatch({
      changes: {
        from: lineInfo.from,
        to: lineInfo.to,
        insert: `${mark}${lineInfo.text}`,
      },
      // selection: EditorSelection.range(lineInfo.from + mark.length, lineInfo.to),
      selection: { anchor: view.state.selection.main.from + mark.length },
    });
  },
};

export const quote: ICommand = {
  name: 'quote',
  keyCommand: 'quote',
  button: { 'aria-label': 'Add quote text' },
  icon: (
    <svg fill="currentColor" viewBox="0 0 448 512" height="15" width="15">
      <path d="M96 96c-53.02 0-96 42.1-96 96s42.98 96 96 96c11.28 0 21.95-2.305 32-5.879V288c0 35.3-28.7 64-64 64-17.67 0-32 14.33-32 32s14.33 32 32 32c70.58 0 128-57.42 128-128v-96c0-53.9-43-96-96-96zm352 96c0-53.02-42.98-96-96-96s-96 42.98-96 96 42.98 96 96 96c11.28 0 21.95-2.305 32-5.879V288c0 35.3-28.7 64-64 64-17.67 0-32 14.33-32 32s14.33 32 32 32c70.58 0 128-57.42 128-128v-96z" />
    </svg>
  ),
  execute: ({ state, view }) => {
    if (!state || !view) return;
    const lineInfo = view.state.doc.lineAt(view.state.selection.main.from);
    let mark = '> ';
    const matchMark = lineInfo.text.match(/^>\s/);
    if (matchMark && matchMark[0]) {
      mark = '';
    }
    view.dispatch({
      changes: {
        from: lineInfo.from,
        to: lineInfo.to,
        insert: `${mark}${lineInfo.text}`,
      },
      // selection: EditorSelection.range(lineInfo.from + mark.length, lineInfo.to),
      selection: { anchor: view.state.selection.main.from + mark.length },
    });
  },
};

export const strike: ICommand = {
  name: 'strike',
  keyCommand: 'strike',
  button: { 'aria-label': 'Add strike text' },
  icon: (
    <svg fill="currentColor" viewBox="0 0 512 512" height="14" width="14">
      <path d="M332.2 319.9c17.22 12.17 22.33 26.51 18.61 48.21-3.031 17.59-10.88 29.34-24.72 36.99-35.44 19.75-108.5 11.96-186-19.68-16.34-6.686-35.03 1.156-41.72 17.53s1.188 35.05 17.53 41.71c31.75 12.93 95.69 35.37 157.6 35.37 29.62 0 58.81-5.156 83.72-18.96 30.81-17.09 50.44-45.46 56.72-82.11 3.998-23.27 2.168-42.58-3.488-59.05H332.2zm155.8-80-176.5-.03c-15.85-5.614-31.83-10.34-46.7-14.62-85.47-24.62-110.9-39.05-103.7-81.33 2.5-14.53 10.16-25.96 22.72-34.03 20.47-13.15 64.06-23.84 155.4.343 17.09 4.53 34.59-5.654 39.13-22.74 4.531-17.09-5.656-34.59-22.75-39.12-91.31-24.18-160.7-21.62-206.3 7.654C121.8 73.72 103.6 101.1 98.09 133.1c-8.83 51.4 9.81 84.2 39.11 106.8H24c-13.25 0-24 10.75-24 23.1 0 13.25 10.75 23.1 24 23.1h464c13.25 0 24-10.75 24-23.1 0-12.3-10.7-23.1-24-23.1z" />
    </svg>
  ),
  execute: ({ state, view }) => {
    if (!state || !view) return;
    view.dispatch(
      view.state.changeByRange((range) => ({
        changes: [
          { from: range.from, insert: '~~' },
          { from: range.to, insert: '~~' },
        ],
        range: EditorSelection.range(range.from + 2, range.to + 2),
      })),
    );
  },
};

export const todo: ICommand = {
  name: 'todo',
  keyCommand: 'todo',
  button: { 'aria-label': 'Add todo List' },
  icon: (
    <svg viewBox="0 0 48 48" fill="none" height="15" width="15">
      <path
        d="m5 10 3 3 6-6M5 24l3 3 6-6M5 38l3 3 6-6m7-11h22M21 38h22M21 10h22"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  execute: ({ state, view }) => {
    if (!state || !view) return;
    const lineInfo = view.state.doc.lineAt(view.state.selection.main.from);
    let mark = '- [ ]  ';
    const matchMark = lineInfo.text.match(/^-\s\[\s\]\s/);
    if (matchMark && matchMark[0]) {
      mark = '';
    }
    view.dispatch({
      changes: {
        from: lineInfo.from,
        to: lineInfo.to,
        insert: `${mark}${lineInfo.text}`,
      },
      // selection: EditorSelection.range(lineInfo.from + mark.length, lineInfo.to),
      selection: { anchor: view.state.selection.main.from + mark.length },
    });
  },
};

export const ulist: ICommand = {
  name: 'ulist',
  keyCommand: 'ulist',
  button: { 'aria-label': 'Add ulist text' },
  icon: (
    <svg viewBox="0 0 512 512" height="14" width="14">
      <path
        fill="currentColor"
        d="M88 48c13.3 0 24 10.75 24 24v48c0 13.3-10.7 24-24 24H40c-13.25 0-24-10.7-24-24V72c0-13.25 10.75-24 24-24h48zm392 16c17.7 0 32 14.33 32 32 0 17.7-14.3 32-32 32H192c-17.7 0-32-14.3-32-32 0-17.67 14.3-32 32-32h288zm0 160c17.7 0 32 14.3 32 32s-14.3 32-32 32H192c-17.7 0-32-14.3-32-32s14.3-32 32-32h288zm0 160c17.7 0 32 14.3 32 32s-14.3 32-32 32H192c-17.7 0-32-14.3-32-32s14.3-32 32-32h288zM16 232c0-13.3 10.75-24 24-24h48c13.3 0 24 10.7 24 24v48c0 13.3-10.7 24-24 24H40c-13.25 0-24-10.7-24-24v-48zm72 136c13.3 0 24 10.7 24 24v48c0 13.3-10.7 24-24 24H40c-13.25 0-24-10.7-24-24v-48c0-13.3 10.75-24 24-24h48z"
      />
    </svg>
  ),
  execute: ({ state, view }) => {
    if (!state || !view) return;
    const lineInfo = view.state.doc.lineAt(view.state.selection.main.from);
    let mark = '- ';
    const matchMark = lineInfo.text.match(/^-/);
    if (matchMark && matchMark[0]) {
      mark = '';
    }
    view.dispatch({
      changes: {
        from: lineInfo.from,
        to: lineInfo.to,
        insert: `${mark}${lineInfo.text}`,
      },
      // selection: EditorSelection.range(lineInfo.from + mark.length, lineInfo.to),
      selection: { anchor: view.state.selection.main.from + mark.length },
    });
  },
};

export const underline: ICommand = {
  name: 'underline',
  keyCommand: 'underline',
  button: { 'aria-label': 'Add underline text' },
  icon: (
    <svg fill="currentColor" viewBox="0 0 448 512" height="13" width="13">
      <path d="M416 448H32c-17.69 0-32 14.31-32 32s14.31 32 32 32h384c17.69 0 32-14.31 32-32s-14.3-32-32-32zM48 64.01h16v160c0 88.22 71.78 159.1 160 159.1s160-71.78 160-159.1v-160h16c17.69 0 32-14.32 32-32S417.69.91 400 .91l-96-.005c-17.69 0-32 14.32-32 32s14.31 32 32 32h16v160c0 52.94-43.06 95.1-96 95.1S128 276.1 128 224V64h16c17.69 0 32-14.31 32-32S161.69 0 144 0L48 .005c-17.69 0-32 14.31-32 31.1S30.31 64.01 48 64.01z" />
    </svg>
  ),
  execute: ({ state, view }) => {
    if (!state || !view) return;
    view.dispatch(
      view.state.changeByRange((range) => ({
        changes: [
          { from: range.from, insert: '<u>' },
          { from: range.to, insert: '</u>' },
        ],
        range: EditorSelection.range(range.from + 3, range.to + 3),
      })),
    );
  },
};