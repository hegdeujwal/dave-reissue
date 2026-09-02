/**
 * Builds the mini project report for Dave: Reissue as a Word document.
 *
 *   node report/generate-report.js  ->  report/UID-Mini-Project-Report.docx
 *
 * Everything is black on white so the document prints cleanly in monochrome.
 */

const fs = require("fs");
const path = require("path");
const {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} = require("docx");

/* ------------------------------------------------------------------ */
/* Page geometry. A4 with one inch margins, everything in twips.       */
/* ------------------------------------------------------------------ */

const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;
const MARGIN = 1440;
const CONTENT_WIDTH = A4_WIDTH - 2 * MARGIN; // 9026

const BODY_SIZE = 24; // 12pt, in half points
const TABLE_SIZE = 22; // 11pt, in half points
const LINE_1_5 = 360; // 1.5 line spacing, 240 = single
const BLACK = "000000";
const WHITE = "FFFFFF";

const BULLETS = "report-bullets";

/** Where capture-screenshots.js leaves its output. */
const SHOTS = path.join(__dirname, "screenshots");

/** References are left aligned so a long URL does not stretch the line. */
const REF = { alignment: AlignmentType.LEFT };

/* ------------------------------------------------------------------ */
/* Small builders                                                      */
/* ------------------------------------------------------------------ */

/** A justified body paragraph at 12pt with 1.5 spacing. */
function body(text, options = {}) {
  return new Paragraph({
    alignment: options.alignment || AlignmentType.JUSTIFIED,
    spacing: { line: LINE_1_5, after: 120, ...options.spacing },
    children: [new TextRun({ text, size: BODY_SIZE })],
  });
}

/** A numbered section heading, bold 14pt. */
function heading(number, text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.LEFT,
    spacing: { before: 280, after: 160, line: LINE_1_5 },
    children: [new TextRun({ text: `${number}. ${text}`, bold: true, size: 28 })],
  });
}

/** A numbered sub-heading, bold 12pt. */
function subHeading(number, text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.LEFT,
    spacing: { before: 200, after: 120, line: LINE_1_5 },
    children: [new TextRun({ text: `${number} ${text}`, bold: true, size: BODY_SIZE })],
  });
}

/** A bullet driven by the numbering configuration, not a literal glyph. */
function bullet(text) {
  return new Paragraph({
    numbering: { reference: BULLETS, level: 0 },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: LINE_1_5, after: 60 },
    children: [new TextRun({ text, size: BODY_SIZE })],
  });
}

/** An empty 12pt line, used to leave room for a pasted screenshot. */
function blankLine() {
  return new Paragraph({
    spacing: { line: LINE_1_5 },
    children: [new TextRun({ text: "", size: BODY_SIZE })],
  });
}

function blankLines(count) {
  return Array.from({ length: count }, blankLine);
}

/** Width and height of a PNG, read straight out of its IHDR chunk. */
function pngSize(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** Widest and tallest an inserted screenshot may be, in pixels on the page. */
const IMAGE_MAX_W = 580;
const IMAGE_MAX_H = 380;

/**
 * A screenshot scaled to fit the text column, or, if the file has not been
 * captured yet, blank space of about the same height to paste one into.
 */
function screenshot(file) {
  const full = path.join(SHOTS, file);
  if (!fs.existsSync(full)) return blankLines(7);

  const data = fs.readFileSync(full);
  const { width, height } = pngSize(data);
  const scale = Math.min(IMAGE_MAX_W / width, IMAGE_MAX_H / height);

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 80, line: 240 },
      children: [
        new ImageRun({
          type: "png",
          data,
          transformation: {
            width: Math.round(width * scale),
            height: Math.round(height * scale),
          },
        }),
      ],
    }),
  ];
}

/** Every border on a table or cell: thin, solid, black. */
function blackBorders() {
  const edge = { style: BorderStyle.SINGLE, size: 4, color: BLACK };
  return {
    top: edge,
    bottom: edge,
    left: edge,
    right: edge,
    insideHorizontal: edge,
    insideVertical: edge,
  };
}

/** White, non-solid shading, so nothing can render as a black box. */
const CLEAR_WHITE = {
  type: ShadingType.CLEAR,
  color: "auto",
  fill: WHITE,
};

function cell(text, width, options = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: CLEAR_WHITE,
    borders: blackBorders(),
    verticalAlign: VerticalAlign.TOP,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: options.alignment || AlignmentType.LEFT,
        spacing: { line: 240, before: 20, after: 20 },
        children: [
          new TextRun({
            text,
            bold: Boolean(options.bold),
            size: options.size || TABLE_SIZE,
          }),
        ],
      }),
    ],
  });
}

/**
 * A table whose column widths sum to the declared table width, with a
 * repeating header row so it stays readable across a page break.
 */
function table(columnWidths, header, rows, options = {}) {
  const total = columnWidths.reduce((sum, value) => sum + value, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: header.map((text, index) =>
      cell(text, columnWidths[index], { bold: true, alignment: AlignmentType.CENTER }),
    ),
  });
  const bodyRows = rows.map(
    (row) =>
      new TableRow({
        cantSplit: true,
        children: row.map((text, index) =>
          cell(text, columnWidths[index], {
            alignment: index === 0 && options.centreFirst ? AlignmentType.CENTER : AlignmentType.LEFT,
          }),
        ),
      }),
  );
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths,
    alignment: options.alignment || AlignmentType.CENTER,
    borders: blackBorders(),
    rows: [headerRow, ...bodyRows],
  });
}

/* ------------------------------------------------------------------ */
/* Cover page                                                          */
/* ------------------------------------------------------------------ */

function centred(text, size, bold, spacing) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: LINE_1_5, ...spacing },
    children: [new TextRun({ text, size, bold: Boolean(bold) })],
  });
}

const TEAM_WIDTHS = [3400, 2600];

const cover = [
  ...blankLines(4),
  centred("MINI PROJECT REPORT", 26, true, { after: 400 }),
  centred("Dave: Reissue — A Modern Remake of Dangerous Dave", 36, true, {
    after: 400,
  }),
  centred("Subject: User Interface Design", 28, false, { after: 1600 }),
  centred("Submitted by", 28, true, { after: 240 }),
  table(
    TEAM_WIDTHS,
    ["Name", "USN"],
    [
      ["Ujwal Hegde", "NNM23IS201"],
      ["K Aravind Kamath", "NNM23IS082"],
    ],
    { centreFirst: false },
  ),
  new Paragraph({
    children: [new PageBreak()],
  }),
];

/* ------------------------------------------------------------------ */
/* Report body                                                         */
/* ------------------------------------------------------------------ */

const TOOLS = [
  ["Next.js (App Router)", "Application shell, routing and the production build."],
  ["TypeScript", "Static typing across the game engine, level data and interface components."],
  ["HTML5 Canvas", "Immediate-mode drawing surface on which the whole game world is rendered."],
  ["Tailwind CSS", "Utility-first styling of the menus, heads-up display and overlays."],
  ["localStorage", "Client-side persistence of progress, chosen character, gems and checkpoints."],
  ["Git and GitHub", "Version control and hosting of the source repository."],
  ["Vercel", "Deployment of the production build as a static, client-side application."],
];

const PITFALLS = [
  [
    "Camera",
    "The original scrolled in whole screen widths, so the view snapped forward and the player briefly lost sight of the surroundings.",
    "The camera follows the player through an exponential interpolation with a look-ahead offset and is clamped to the level bounds, giving continuous motion.",
  ],
  [
    "Checkpoints",
    "Death returned the player to the start of the level, discarding all progress made within it.",
    "Checkpoint tiles record the player position and confirm it with an on-screen message; a death restores the player at the last checkpoint.",
  ],
  [
    "Key bindings",
    "Only one small set of keys was accepted, and the layout could not be changed to suit the player.",
    "Movement, jump, fire and jetpack accept WASD, the arrow keys, Space, J or Ctrl and Shift or K at the same time, matched on physical key codes.",
  ],
  [
    "Visual clarity",
    "Coarse low-resolution pixel art made hazards and platform edges difficult to read on modern displays.",
    "The world is drawn as vector shapes at the device pixel ratio, with shaded panels and a palette in which pink always harms and mint always helps.",
  ],
  [
    "Movement physics",
    "Jumps followed a fixed arc and the simulation was tied to machine speed, which made control imprecise.",
    "A fixed timestep of one hundred and twentieth of a second with interpolated rendering, variable jump height, coyote time and a jump buffer.",
  ],
  [
    "Learning curve",
    "The game offered no instruction, so the controls and the objective had to be discovered by repeated failure.",
    "The first level is flat and safe and carries hints that appear as the player walks into them; later levels introduce the gun and the jetpack in the same way.",
  ],
  [
    "Instant death",
    "A single contact with any hazard ended the life immediately, with no margin for error.",
    "The player has three hearts, with knockback and a short period of flickering invulnerability after each hit; only an empty heart bar causes a respawn.",
  ],
  [
    "Saved progress",
    "Progress existed only within a session and was lost as soon as the game was closed.",
    "Unlocked levels, the chosen character, banked gems and the last checkpoint are written to localStorage and validated field by field when read back.",
  ],
  [
    "Player choice",
    "A single fixed character offered no variation in movement or difficulty.",
    "Three characters are selectable and interchangeable mid-run, each trading speed, jump height and hearts against one another.",
  ],
];

const MODULES = [
  ["theme.ts", "Single source of every colour, tile dimension and tuning constant used by the game."],
  ["levels.ts", "The ten hand-authored levels, stored as character grids, together with the tutorial hint zones."],
  ["input.ts", "Keyboard layer that maps physical key codes to game actions and tracks held keys and one-shot presses."],
  ["physics.ts", "Player and enemy motion, gravity, jump behaviour and axis-by-axis collision against the tile grid."],
  ["render.ts", "All canvas drawing routines for the world, characters, pickups, hazards and effects."],
  ["engine.ts", "The game loop and state machine: level loading, pickups, combat, camera, checkpoints and snapshots for the interface."],
  ["save.ts", "Reading, validating and writing the localStorage save, exposed as a small subscribable store."],
];

const SCREENSHOTS = [
  ["01-main-menu.png", "Fig. 1: Main Menu"],
  ["02-character-select.png", "Fig. 2: Character Selection"],
  ["03-gameplay-hud.png", "Fig. 3: Gameplay with Heads-Up Display"],
  ["04-level-complete.png", "Fig. 4: Level Complete Screen"],
];

const report = [
  /* 1. Abstract ---------------------------------------------------- */
  heading(1, "Abstract"),
  body(
    "Dave: Reissue is a browser-based remake of the 1988 disk operating system game Dangerous Dave, developed as a mini project for the subject User Interface Design. The remake preserves the objective of the original, in which the player collects a key and reaches the exit door of each level, while rebuilding the interface and the controls around present-day expectations. Ten levels, three playable characters, a heads-up display, a pause screen and a persistent save are implemented entirely on the client using Next.js, TypeScript and the HTML5 canvas element. The work is organised around nine documented usability limitations of the original game, each of which is addressed by a specific feature of the remake.",
  ),

  /* 2. Introduction ------------------------------------------------ */
  heading(2, "Introduction"),
  body(
    "Dangerous Dave, released in 1988, is a side-scrolling platform game in which the player guides the title character through a series of single-screen levels, collecting a trophy and a key before reaching the door that leads to the next level. The game was written for early personal computers and reflects the constraints of that hardware. The display scrolled a full screen at a time, the artwork was rendered as coarse pixel tiles, contact with any hazard was immediately fatal, the controls were fixed, and no progress was retained once the program was closed. These characteristics are now understood as usability defects rather than stylistic choices.",
  ),
  body(
    "This project is a modern remake of that game, built to run in a web browser. Its purpose is not to reproduce the original faithfully but to modernise its interface and to correct the usability flaws that the original exhibits, while retaining the structure and the pace that made it recognisable. The application is client-side only: there is no server component, no backend and no external game engine, and the entire world is drawn procedurally into a single canvas element. Every interaction, from the main menu to the level complete screen, has been designed as part of the same visual system.",
  ),

  /* 3. Objectives -------------------------------------------------- */
  heading(3, "Objectives"),
  bullet("To study the interface and interaction design of the original Dangerous Dave and to identify its principal usability limitations."),
  bullet("To design and implement a browser-based remake of the game using Next.js, TypeScript and the HTML5 canvas element."),
  bullet("To resolve each identified limitation through a specific and demonstrable feature of the remake."),
  bullet("To provide a consistent visual language in which colour, motion and feedback communicate the state of the game unambiguously."),
  bullet("To implement frame-rate independent physics so that the behaviour of the game does not depend on the speed of the machine."),
  bullet("To retain player progress across sessions through client-side storage, without requiring an account or a server."),

  /* 4. Tools and Technologies -------------------------------------- */
  heading(4, "Tools and Technologies Used"),
  body("The technologies used in the development of the project are listed below."),
  table([2800, 6226], ["Technology", "Purpose"], TOOLS),
  blankLine(),

  /* 5. Key Features ------------------------------------------------ */
  heading(5, "Key Features"),
  bullet("Ten hand-authored levels, each defined as a grid of tile characters sixteen rows in height."),
  bullet("The complete game world is drawn procedurally into one canvas element, with no sprite or image assets."),
  bullet("A fixed simulation timestep with interpolated rendering, giving identical behaviour at any refresh rate."),
  bullet("Three playable characters, each with its own speed, jump height and number of hearts, selectable at any time."),
  bullet("A three-heart health system with knockback and a brief period of invulnerability after each hit."),
  bullet("Checkpoint tiles that record the player position and restore it after a death."),
  bullet("A gun, introduced in the sixth level, with capped ammunition that regenerates over time so a level cannot become unwinnable."),
  bullet("A jetpack, introduced in the seventh level, whose fuel recharges on the ground and from canisters placed in the level."),
  bullet("Patrolling enemies, spikes, wall-mounted turrets and breakable timber crates as hazards and obstacles."),
  bullet("Tutorial hints that appear as the player walks into the region of the level to which they apply."),
  bullet("A heads-up display showing hearts, gems, ammunition, jetpack fuel and elapsed time, with pause and level complete overlays."),
  bullet("Persistent progress, character selection and checkpoint data stored in the browser and validated when read."),

  /* 6. Pitfalls ---------------------------------------------------- */
  heading(6, "Pitfalls in the Original Game and Their Resolution"),
  body(
    "The design of the remake was driven by nine limitations observed in the original game. Each limitation and the corresponding solution implemented in this project are given in the table below.",
  ),
  table(
    [700, 3800, 4526],
    ["Sl. No.", "Limitation in the Original Game", "Solution Implemented"],
    PITFALLS.map((row, index) => [String(index + 1), `${row[0]}. ${row[1]}`, row[2]]),
    { centreFirst: true },
  ),
  blankLine(),

  /* 7. System Design ----------------------------------------------- */
  heading(7, "System Design"),
  body(
    "The application follows a client-side-only architecture. A single Next.js route renders the React interface, which owns one canvas element and one instance of the game engine. The engine runs the simulation and all drawing, and publishes a snapshot of its state on every frame; the React components that make up the menus and the heads-up display consume that snapshot and never modify the simulation directly. Persistence is handled by a small store backed by the browser's local storage, to which the menu subscribes. There is no server logic, no database and no network request at runtime, so the built application can be served as static files.",
  ),
  body("The modules that make up the game layer, located under the src/game directory, are described below."),
  table([1900, 7126], ["Module", "Responsibility"], MODULES),
  blankLine(),

  /* 8. Implementation Highlights ----------------------------------- */
  heading(8, "Implementation Highlights"),
  subHeading("8.1", "Fixed-Timestep Physics Loop"),
  body(
    "The simulation advances in fixed steps of one hundred and twentieth of a second. Each animation frame adds the elapsed wall-clock time to an accumulator, which is then drained one fixed step at a time, and the fraction left over is passed to the drawing routine so that positions are interpolated between the previous and the current step. The elapsed time consumed in a single frame is capped, which prevents a long pause, such as a switch to another browser tab, from producing a burst of catch-up steps. The result is that movement, gravity and collision behave identically on a sixty hertz display and on a high refresh rate one. Within this loop the player receives variable jump height, a coyote time that still permits a jump shortly after leaving a ledge, and a jump buffer that remembers a jump pressed shortly before landing.",
  ),
  subHeading("8.2", "Smooth Camera"),
  body(
    "The camera holds a horizontal position that is advanced towards a target on every step by an exponential interpolation, expressed so that the rate of approach does not depend on the length of the step. The target is the player position offset by a look-ahead distance in the direction of travel, which reveals more of the level ahead of the player than behind. The resulting position is clamped to the bounds of the level so that the view never scrolls past the first or the last column, and it is interpolated once more at draw time using the leftover accumulator fraction. On a respawn the camera is snapped directly to its target so that the player is never shown a sweep across the level.",
  ),
  subHeading("8.3", "Checkpoint and Save System"),
  body(
    "Checkpoint tiles placed within the levels are collected in the same pass as gems and keys. Activating one records the player position, displays a confirmation message and writes the checkpoint, together with the current level, into the save. When the heart bar empties, the player is restored at that position with a full heart bar rather than at the start of the level. The save itself holds the number of unlocked levels, the chosen character, the banked gems and the last checkpoint under a single versioned key in local storage. Every field is rebuilt individually when the save is read, and any value that is missing, of the wrong type or out of range falls back to its default, so a corrupted or hand-edited entry cannot prevent the game from starting.",
  ),

  /* 9. Results ----------------------------------------------------- */
  heading(9, "Results"),
  body(
    "The remake was completed and tested in current desktop browsers. All ten levels are playable from the main menu, either from the beginning of a new run or from the last checkpoint of a previous one. The simulation holds a steady frame rate, the camera follows the player without visible snapping, and the heads-up display reflects hearts, gems, ammunition and fuel accurately throughout play. Progress survives a reload of the page, and each of the nine limitations identified in the original game is addressed by a working feature of the remake. Selected screens of the completed application are shown below.",
  ),
  // The screenshots start on a fresh page, so none of them is split.
  new Paragraph({ children: [new PageBreak()] }),
  subHeading("9.1", "Screenshots"),
  ...SCREENSHOTS.flatMap(([file, caption]) => [
    ...screenshot(file),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: LINE_1_5, after: 260 },
      children: [new TextRun({ text: caption, size: BODY_SIZE })],
    }),
  ]),

  /* 10. Conclusion -------------------------------------------------- */
  heading(10, "Conclusion"),
  body(
    "The project demonstrates that the appeal of an early platform game can be retained while its interface is rebuilt to modern standards. By treating the limitations of the original as design problems rather than as period detail, the remake replaces snapping scroll, instant death, fixed controls and lost progress with a smooth camera, a heart-based health system, simultaneous key bindings and a validated persistent save. The client-side architecture keeps the application small and deployable as static files, and the separation between the simulation and the interface components keeps each of them straightforward to modify.",
  ),

  /* 11. Future Scope ----------------------------------------------- */
  heading(11, "Future Scope"),
  bullet("Touch and gamepad input, so that the game can be played on tablets and with a controller."),
  bullet("A level editor that writes the same tile-character format used by the existing levels."),
  bullet("Sound effects and background music, with an accessible control for muting them."),
  bullet("An optional online leaderboard recording completion times for each level."),

  /* 12. References ------------------------------------------------- */
  heading(12, "References"),
  body("[1] J. Romero and J. Hall, Dangerous Dave, Softdisk Publishing, 1988.", REF),
  body("[2] Next.js Documentation, Vercel Inc. Available: https://nextjs.org/docs", REF),
  body(
    "[3] Canvas API, MDN Web Docs, Mozilla. Available: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API",
    REF,
  ),
  body("[4] Project repository, Dave: Reissue. Available: https://github.com/hegdeujwal/dave-reissue", REF),
];

/* ------------------------------------------------------------------ */
/* Document                                                            */
/* ------------------------------------------------------------------ */

const page = {
  size: { width: A4_WIDTH, height: A4_HEIGHT },
  margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
};

const footer = new Footer({
  children: [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240 },
      children: [new TextRun({ children: [PageNumber.CURRENT], size: BODY_SIZE })],
    }),
  ],
});

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Times New Roman", size: BODY_SIZE, color: BLACK },
        paragraph: { spacing: { line: LINE_1_5 } },
      },
      // The built-in heading styles are blue and sans-serif, so both are
      // redefined here as black Times New Roman.
      heading1: {
        run: { font: "Times New Roman", size: 28, bold: true, color: BLACK },
        paragraph: { spacing: { before: 280, after: 160, line: LINE_1_5 } },
      },
      heading2: {
        run: { font: "Times New Roman", size: BODY_SIZE, bold: true, color: BLACK },
        paragraph: { spacing: { before: 200, after: 120, line: LINE_1_5 } },
      },
    },
  },
  numbering: {
    config: [
      {
        reference: BULLETS,
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    // The cover page carries no page number.
    { properties: { page }, children: cover },
    // Numbering starts at one on the first page after the cover.
    {
      properties: { page: { ...page, pageNumbers: { start: 1 } } },
      footers: { default: footer },
      children: report,
    },
  ],
});

const output = path.join(__dirname, "UID-Mini-Project-Report.docx");

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(output, buffer);
  console.log(`Wrote ${output} (${(buffer.length / 1024).toFixed(1)} KB)`);
});
