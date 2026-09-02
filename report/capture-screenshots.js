/**
 * Captures the four report screenshots from the running application.
 *
 *   npm run build && npx next start -p 3210
 *   node report/capture-screenshots.js
 *
 * Chrome is driven headlessly: the menu and the pilot cards are photographed
 * directly, and the two in-game shots are taken while the game is actually
 * being played through the keyboard.
 */

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const URL = process.env.REPORT_URL || "http://localhost:3210";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const OUT = path.join(__dirname, "screenshots");

/** A save that unlocks every level, so the menu and level six are reachable. */
const SAVE_KEY = "dave-reissue.save.v1";
const SAVE = {
  version: 1,
  unlockedLevels: 10,
  character: "dave",
  gems: 42,
  checkpoint: null,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The game samples held keys once per frame, and jump height depends on how
 * long jump stays down, so every key has to be held rather than tapped.
 */
async function hold(page, key, ms) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
}

/** Click the first button whose label matches. */
function clickButton(page, match) {
  return page.evaluate((text) => {
    const button = [...document.querySelectorAll("button")].find((el) =>
      el.textContent.trim().startsWith(text),
    );
    if (!button) throw new Error(`No button starting with "${text}"`);
    button.click();
  }, match);
}

/** The rounded frame that holds the canvas and every overlay drawn on it. */
async function stage(page) {
  await page.waitForSelector("canvas");
  const handle = await page.evaluateHandle(
    () => document.querySelector("canvas").parentElement,
  );
  return handle.asElement();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();
  await page.evaluateOnNewDocument(
    (key, save) => window.localStorage.setItem(key, JSON.stringify(save)),
    SAVE_KEY,
    SAVE,
  );

  /* 1. Main menu ---------------------------------------------------- */
  await page.goto(URL, { waitUntil: "networkidle0" });
  await page.waitForSelector("h1");
  // The parallax backdrop animates, so give it a moment to settle.
  await sleep(1500);
  await page.screenshot({ path: path.join(OUT, "01-main-menu.png") });

  /* 2. Character selection ------------------------------------------ */
  const pilot = (
    await page.evaluateHandle(() => {
      const label = [...document.querySelectorAll("h2")].find(
        (el) => el.textContent.trim() === "Pilot",
      );
      return label.closest("section");
    })
  ).asElement();
  await page.evaluate((section) => {
    const card = [...section.querySelectorAll("button")].find((el) =>
      el.textContent.includes("Nyx"),
    );
    card.click();
  }, pilot);
  await sleep(600);
  const box = await pilot.boundingBox();
  const pad = 26;
  await page.screenshot({
    path: path.join(OUT, "02-character-select.png"),
    clip: {
      x: box.x - pad,
      y: box.y - pad,
      width: box.width + pad * 2,
      height: box.height + pad * 2,
    },
  });

  /* 3. Gameplay with the heads-up display --------------------------- */
  // Level six introduces the gun, so the shot shows ammunition as well as
  // hearts, gems and a tutorial hint.
  // Dave is the title character, so the gameplay shots use him.
  await page.evaluate(() => {
    const card = [...document.querySelectorAll("button")].find((el) =>
      el.textContent.includes("Dave") && el.textContent.includes("baseline"),
    );
    card.click();
  });
  await sleep(300);
  await clickButton(page, "06");
  let frame = await stage(page);
  await sleep(700);
  await page.keyboard.down("KeyD");
  await sleep(2500);
  await page.keyboard.up("KeyD");
  // Two rounds open a hole in the crates; the third is still in the air.
  for (let shot = 0; shot < 3; shot += 1) {
    await hold(page, "KeyJ", 160);
    await sleep(180);
  }
  await sleep(60);
  await frame.screenshot({ path: path.join(OUT, "03-gameplay-hud.png") });

  /* 4. Level complete ----------------------------------------------- */
  // Level one is played through for real: hold right and keep jumping.
  await page.goto(URL, { waitUntil: "networkidle0" });
  await page.waitForSelector("h1");
  await clickButton(page, "01");
  frame = await stage(page);
  await sleep(700);
  const text = () => page.evaluate(() => document.body.innerText);
  await page.keyboard.down("KeyD");

  // Jump the platform and the spikes, but only until the key is in hand: a
  // jump taken at the door carries the player straight over the top of it.
  let carryingKey = false;
  for (let tick = 0; tick < 40 && !carryingKey; tick += 1) {
    await hold(page, "Space", 260);
    await sleep(200);
    carryingKey = (await text()).includes("Pick up the key");
  }

  // From the key the ground is flat, so walking is enough to reach the door.
  let finished = false;
  for (let tick = 0; tick < 40 && !finished; tick += 1) {
    await sleep(300);
    finished = (await text()).includes("Level complete");
  }
  await page.keyboard.up("KeyD");
  if (!finished) throw new Error("Level one did not finish in time");
  await sleep(400);
  await frame.screenshot({ path: path.join(OUT, "04-level-complete.png") });

  await browser.close();
  for (const file of fs.readdirSync(OUT).sort()) {
    const { size } = fs.statSync(path.join(OUT, file));
    console.log(`${file}  ${(size / 1024).toFixed(0)} KB`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
