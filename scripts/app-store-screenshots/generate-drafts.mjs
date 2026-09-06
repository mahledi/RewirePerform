import { spawn } from "node:child_process";
import { readFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../..");
const workspaceRoot = resolve(repositoryRoot, "../..");
const outputRoot = join(
  workspaceRoot,
  "deliverables",
  "app-store-screenshots-v1-1-20260813",
);
const iphoneDirectory = join(outputRoot, "iphone-6.9-drafts");
const ipadDirectory = join(outputRoot, "ipad-13-drafts");
const chromeExecutable = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const viteExecutable = join(repositoryRoot, "node_modules", "vite", "bin", "vite.js");
const requestedFormat = process.argv
  .find((argument) => argument.startsWith("--format="))
  ?.split("=")[1];
const reuseSources = process.argv.includes("--reuse-sources");
const sourceDirectory = reuseSources
  ? join(
      workspaceRoot,
      "deliverables",
      "app-store-screenshots-v1-20260729",
      "sources",
    )
  : join(outputRoot, "sources");
if (requestedFormat && !["iphone", "ipad"].includes(requestedFormat)) {
  throw new Error(`Unsupported screenshot format: ${requestedFormat}`);
}
const coachConfig = join(
  repositoryRoot,
  "tools",
  "app-store-screenshots",
  "coach-harness",
  "vite.config.ts",
);

const colors = {
  midnight: "#0D0E12",
  green: "#2EAD89",
  offWhite: "#EEF0F2",
};

const slideDefinitions = [
  {
    id: "01-mentales-training-neu-gedacht",
    eyebrow: "DEIN SYSTEM FÜR HEUTE",
    headline: "Mentales Training,\nneu gedacht.",
    support:
      "Nach Prinzipien von Lernen und Neuroplastizität – strukturiert für deinen Sportalltag.",
    sources: ["today"],
    audience: "ATHLETEN-APP",
  },
  {
    id: "02-wissen-wird-zur-anwendung",
    eyebrow: "DEIN DAILY FLOW",
    headline: "Wissen wird\nzur Anwendung.",
    support: "Verstehen. Konkret üben. Wiederholen. Reflektieren.",
    sources: ["science", "tasks"],
    audience: "DAILY FLOW",
  },
  {
    id: "03-ein-klarer-rhythmus",
    eyebrow: "DEIN PLAN",
    headline: "56 Tage.\nEin klarer Rhythmus.",
    support:
      "Training, Wettkampf und Regeneration in einer gemeinsamen Linie.",
    sources: ["team"],
    audience: "SOLO & TEAM",
  },
  {
    id: "04-konsequent-dranbleiben",
    eyebrow: "DEINE ENTWICKLUNG",
    headline: "Sieh, wie konsequent\ndu dranbleibst.",
    support:
      "Programmtage, Serien und Anwendungen – ohne Bewertung deiner Person.",
    sources: ["development"],
    audience: "56-TAGE-WEG",
  },
  {
    id: "05-fokus-wenn-es-zaehlt",
    eyebrow: "VOR DEINER EINHEIT",
    headline: "Dein Fokus,\nwenn es zählt.",
    support: "Eine klare mentale Routine vor Training und Wettkampf.",
    sources: ["anchor"],
    audience: "PRE-TRAINING",
  },
  {
    id: "06-reflektieren-und-festigen",
    eyebrow: "DEIN JOURNAL",
    headline: "Reflektieren.\nBewusst festigen.",
    support:
      "Halte Erfahrungen fest und richte mit Dankbarkeit deine Aufmerksamkeit bewusst aus.",
    sources: ["journal"],
    audience: "REFLEXION & DANKBARKEIT",
  },
  {
    id: "07-nicht-ein-test-ein-verlauf",
    eyebrow: "DEIN VERLAUF",
    headline: "Nicht ein Test.\nEin Verlauf.",
    support:
      "Tägliche Praxis und drei Messfenster machen deinen 56-Tage-Weg sichtbar.",
    sources: ["measurement"],
    audience: "FREIWILLIG & GESCHÜTZT",
  },
  {
    id: "08-solo-oder-im-team",
    eyebrow: "DEIN START",
    headline: "Solo oder\nim Team.",
    support:
      "Starte selbstständig oder verbinde dich mit deinem Teamcode.",
    sources: ["start"],
    audience: "DEIN WEG",
  },
  {
    id: "09-ein-team-ein-rhythmus",
    eyebrow: "COACH CONSOLE",
    headline: "Ein Team.\nEin gemeinsamer Rhythmus.",
    support:
      "Aktivität und Umsetzung im Überblick – ohne private Antworten.",
    sources: ["coach-overview"],
    audience: "COACH DASHBOARD",
    coach: true,
  },
  {
    id: "10-teamzustand-heute",
    eyebrow: "HEUTIGES LAGEBILD",
    headline: "Den Teamzustand\ntäglich im Blick.",
    support:
      "Teamdurchschnitte zu Fokus, Schlaf, Energie, Stimmung und mehr – anonymisiert und ohne Einzelantworten.",
    sources: ["coach-daily-state"],
    audience: "TEAMZUSTAND",
    coach: true,
  },
];

const sceneCaptures = [
  { key: "today", labelledBy: "preview-today-title", step: 0 },
  { key: "science", labelledBy: "preview-science-title", step: 1 },
  { key: "tasks", labelledBy: "preview-tasks-title", step: 2 },
  { key: "anchor", labelledBy: "preview-anchor-title", step: 4 },
  { key: "journal", labelledBy: "preview-journal-title", step: 5 },
  { key: "development", labelledBy: "preview-development-title", step: 6 },
  { key: "measurement", labelledBy: "preview-measurement-title", step: 7 },
  { key: "team", labelledBy: "preview-team-title", step: 8 },
  { key: "start", labelledBy: "preview-start-title", step: 9 },
];

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const dataUrl = (mimeType, content) =>
  `data:${mimeType};base64,${Buffer.from(content).toString("base64")}`;

const startViteServer = ({ port, config }) => {
  const args = [viteExecutable, "--host", "127.0.0.1", "--port", String(port)];
  if (config) args.push("--config", config);

  const child = spawn(process.execPath, args, {
    cwd: repositoryRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let diagnostics = "";
  child.stdout.on("data", (chunk) => {
    diagnostics += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    diagnostics += chunk.toString();
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`Vite server on port ${port} exited with ${code}.\n${diagnostics}`);
    }
  });
  return child;
};

const waitForServer = async (url) => {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const assertImagesLoaded = async (page, label) => {
  const brokenSources = await page.locator("img").evaluateAll((images) =>
    images
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.getAttribute("src") || "(missing src)"),
  );
  if (brokenSources.length > 0) {
    throw new Error(`${label} contains unloaded images:\n${brokenSources.join("\n")}`);
  }
};

const captureAthleteSources = async (browser) => {
  const context = await browser.newContext({
    viewport: { width: 820, height: 1_000 },
    deviceScaleFactor: 3,
    reducedMotion: "reduce",
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("http://127.0.0.1:4181/internal/first-run-preview", {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
  await assertImagesLoaded(page, "Athlete capture");

  for (let step = 0; step < 10; step += 1) {
    const capture = sceneCaptures.find((item) => item.step === step);
    if (capture) {
      const screen = page.locator(
        `section[aria-labelledby="${capture.labelledBy}"]`,
      );
      await screen.waitFor({ state: "visible" });
      await page.waitForTimeout(120);
      await screen.screenshot({
        path: join(sourceDirectory, `${capture.key}.png`),
        omitBackground: true,
      });
    }
    if (step < 9) {
      await page.getByRole("button", { name: "Weiter", exact: true }).click();
      await page.waitForTimeout(120);
    }
  }

  if (consoleErrors.length > 0) {
    throw new Error(`Athlete capture console errors:\n${consoleErrors.join("\n")}`);
  }
  await context.close();
};

const captureCoachSources = async (browser) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    reducedMotion: "reduce",
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("http://127.0.0.1:4182", { waitUntil: "networkidle" });
  await page.getByText("Sportler im Team", { exact: true }).waitFor();
  await page.getByText("Teilnahme pro Sportler", { exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await assertImagesLoaded(page, "Coach capture");
  await page.waitForTimeout(250);

  await page.screenshot({
    path: join(sourceDirectory, "coach-overview.png"),
  });

  await page.setViewportSize({ width: 460, height: 1_100 });
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page.getByText("Teamzustand", { exact: true }).click();
  await page.getByRole("heading", { name: "Heutiges Lagebild" }).waitFor();
  await page.waitForTimeout(250);
  await assertImagesLoaded(page, "Coach daily state capture");
  await page.screenshot({
    path: join(sourceDirectory, "coach-daily-state.png"),
  });

  if (consoleErrors.length > 0) {
    throw new Error(`Coach capture console errors:\n${consoleErrors.join("\n")}`);
  }
  await context.close();
};

const buildSourceMap = async () => {
  const sourceNames = [
    ...sceneCaptures.map((item) => item.key),
    "coach-overview",
    "coach-daily-state",
  ];
  const entries = await Promise.all(
    sourceNames.map(async (name) => {
      const bytes = await readFile(join(sourceDirectory, `${name}.png`));
      return [name, dataUrl("image/png", bytes)];
    }),
  );
  return Object.fromEntries(entries);
};

const deviceMarkup = ({ slide, sourceMap, format }) => {
  const isDouble = slide.sources.length === 2;
  const coachClass = slide.coach ? " coach" : "";
  return `
    <div class="device-stage slide-${slide.id}${isDouble ? " double" : ""}${coachClass}">
      <div class="ambient"></div>
      ${slide.sources
        .map(
          (source, index) => `
            <div class="device device-${index + 1}">
              <div class="speaker"></div>
              <img src="${sourceMap[source]}" alt="" />
            </div>`,
        )
        .join("")}
      <div class="audience">${escapeHtml(slide.audience)}</div>
    </div>`;
};

const slideHtml = ({ slide, index, sourceMap, logoUrl, format }) => {
  const isIpad = format === "ipad";
  const width = isIpad ? 2_064 : 1_320;
  const height = isIpad ? 2_752 : 2_868;
  const headline = escapeHtml(slide.headline).replaceAll("\n", "<br />");
  const formatClass = isIpad ? "ipad" : "iphone";

  return `<!doctype html>
  <html lang="de">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");
        * { box-sizing: border-box; }
        html, body {
          width: ${width}px;
          height: ${height}px;
          margin: 0;
          overflow: hidden;
          background: ${colors.midnight};
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: ${colors.offWhite};
        }
        .canvas {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 72%, rgba(46,173,137,.14), transparent 31%),
            radial-gradient(circle at 8% 18%, rgba(46,173,137,.08), transparent 26%),
            linear-gradient(180deg, #101218 0%, ${colors.midnight} 48%, #090A0D 100%);
        }
        .canvas::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: linear-gradient(rgba(255,255,255,.012) 1px, transparent 1px);
          background-size: 100% 8px;
          opacity: .34;
        }
        .brand {
          position: absolute;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .brand img { width: 66px; height: 66px; }
        .brand span {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -.04em;
        }
        .counter {
          position: absolute;
          z-index: 5;
          color: rgba(238,240,242,.45);
          font-size: 26px;
          font-weight: 600;
          letter-spacing: .14em;
        }
        .copy { position: absolute; z-index: 4; }
        .eyebrow {
          color: ${colors.green};
          font-size: 27px;
          font-weight: 700;
          letter-spacing: .18em;
        }
        h1 {
          margin: 28px 0 0;
          font-size: 92px;
          line-height: .98;
          letter-spacing: -.062em;
          font-weight: 650;
        }
        .support {
          max-width: 1040px;
          margin: 38px 0 0;
          color: rgba(238,240,242,.62);
          font-size: 35px;
          line-height: 1.42;
          letter-spacing: -.018em;
        }
        .device-stage {
          position: absolute;
          z-index: 3;
        }
        .ambient {
          position: absolute;
          left: 50%;
          top: 48%;
          width: 920px;
          height: 920px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: rgba(46,173,137,.16);
          filter: blur(150px);
        }
        .device {
          position: absolute;
          overflow: hidden;
          border: 2px solid rgba(238,240,242,.14);
          background: #08090C;
          box-shadow:
            0 90px 180px -70px rgba(0,0,0,.96),
            0 0 0 13px rgba(255,255,255,.025),
            inset 0 1px 0 rgba(255,255,255,.08);
        }
        .device img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top;
        }
        .speaker {
          position: absolute;
          z-index: 3;
          left: 50%;
          top: 18px;
          width: 112px;
          height: 20px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: rgba(3,4,6,.86);
          box-shadow: 0 1px 0 rgba(255,255,255,.08);
        }
        .audience {
          position: absolute;
          z-index: 5;
          display: flex;
          align-items: center;
          min-height: 58px;
          padding: 0 25px;
          border: 1px solid rgba(46,173,137,.26);
          border-radius: 999px;
          background: rgba(13,14,18,.82);
          color: ${colors.green};
          font-size: 19px;
          font-weight: 700;
          letter-spacing: .15em;
          backdrop-filter: blur(18px);
        }
        .iphone .brand { left: 84px; top: 82px; }
        .iphone .counter { right: 84px; top: 102px; }
        .iphone .copy { left: 84px; right: 84px; top: 292px; text-align: center; }
        .iphone .eyebrow { font-size: 24px; }
        .iphone h1 { font-size: 92px; }
        .iphone .support { margin-left: auto; margin-right: auto; max-width: 1080px; }
        .iphone .device-stage {
          left: 50%;
          top: 800px;
          width: 1240px;
          height: 1980px;
          transform: translateX(-50%);
        }
        .iphone .device {
          left: 50%;
          top: 0;
          width: 1080px;
          height: 1915px;
          transform: translateX(-50%);
          border-radius: 76px;
          padding: 30px;
        }
        .iphone .device img { border-radius: 50px; }
        .iphone .device-stage.coach {
          top: 730px;
        }
        .iphone .device-stage.coach .device {
          width: 960px;
          height: 2077px;
          padding: 24px;
          border-radius: 72px;
        }
        .iphone .device-stage.coach .device img { border-radius: 48px; }
        .iphone .device-stage.double .device {
          top: 60px;
          width: 720px;
          height: 1276px;
          padding: 22px;
          border-radius: 62px;
        }
        .iphone .device-stage.double .device-1 {
          left: 20px;
          transform: rotate(-3deg);
        }
        .iphone .device-stage.double .device-2 {
          left: 500px;
          top: 320px;
          transform: rotate(3deg);
        }
        .iphone .device-stage.double .device img { border-radius: 40px; }
        .iphone .device-stage.slide-02-wissen-wird-zur-anwendung .ambient {
          background: rgba(46,173,137,.22);
        }
        .iphone .device-stage.slide-02-wissen-wird-zur-anwendung .device {
          border-color: rgba(46,173,137,.28);
        }
        .iphone .device-stage.slide-02-wissen-wird-zur-anwendung .device-1 {
          left: 20px;
          top: 60px;
          transform: none;
        }
        .iphone .device-stage.slide-02-wissen-wird-zur-anwendung .device-2 {
          left: 500px;
          top: 320px;
          transform: none;
        }
        .iphone .audience {
          left: 50%;
          top: -72px;
          transform: translateX(-50%);
        }
        .ipad .brand { left: 118px; top: 100px; }
        .ipad .counter { right: 118px; top: 124px; }
        .ipad .copy {
          left: 150px;
          right: 150px;
          top: 250px;
          width: auto;
          text-align: center;
        }
        .ipad .eyebrow { font-size: 25px; }
        .ipad h1 { font-size: 98px; }
        .ipad .support {
          max-width: 1500px;
          margin-left: auto;
          margin-right: auto;
          font-size: 36px;
        }
        .ipad .device-stage {
          left: 50%;
          top: 680px;
          width: 1800px;
          height: 2050px;
          transform: translateX(-50%);
        }
        .ipad .ambient {
          top: 48%;
          width: 1240px;
          height: 1240px;
        }
        .ipad .device {
          left: 50%;
          top: 90px;
          width: 1180px;
          height: 2093px;
          transform: translateX(-50%);
          border-radius: 74px;
          padding: 28px;
        }
        .ipad .device img { border-radius: 48px; }
        .ipad .device-stage.coach {
          top: 650px;
        }
        .ipad .device-stage.coach .device {
          width: 1040px;
          height: 2252px;
          padding: 24px;
        }
        .ipad .device-stage.double .device {
          width: 760px;
          height: 1347px;
          padding: 20px;
          border-radius: 58px;
        }
        .ipad .device-stage.double .device-1 {
          left: 70px;
          top: 90px;
          transform: none;
        }
        .ipad .device-stage.double .device-2 {
          left: 970px;
          top: 360px;
          transform: none;
        }
        .ipad .device-stage.double .device img { border-radius: 38px; }
        .ipad .device-stage.slide-02-wissen-wird-zur-anwendung .ambient {
          background: rgba(46,173,137,.22);
        }
        .ipad .device-stage.slide-02-wissen-wird-zur-anwendung .device {
          border-color: rgba(46,173,137,.28);
        }
        .ipad .device-stage.slide-02-wissen-wird-zur-anwendung .device-1 {
          left: 70px;
          top: 90px;
          transform: none;
        }
        .ipad .device-stage.slide-02-wissen-wird-zur-anwendung .device-2 {
          left: 970px;
          top: 360px;
          transform: none;
        }
        .ipad .audience {
          left: 50%;
          top: 0;
          transform: translateX(-50%);
        }
      </style>
    </head>
    <body class="${formatClass}">
      <main class="canvas">
        <div class="brand">
          <img src="${logoUrl}" alt="" />
          <span>RewirePerform</span>
        </div>
        <div class="counter">${String(index + 1).padStart(2, "0")} / 10</div>
        <section class="copy">
          <div class="eyebrow">${escapeHtml(slide.eyebrow)}</div>
          <h1>${headline}</h1>
          <p class="support">${escapeHtml(slide.support)}</p>
        </section>
        ${deviceMarkup({ slide, sourceMap, format })}
      </main>
    </body>
  </html>`;
};

const renderSlides = async ({ browser, sourceMap, logoUrl, format }) => {
  const isIpad = format === "ipad";
  const context = await browser.newContext({
    viewport: isIpad
      ? { width: 2_064, height: 2_752 }
      : { width: 1_320, height: 2_868 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const targetDirectory = isIpad ? ipadDirectory : iphoneDirectory;

  for (let index = 0; index < slideDefinitions.length; index += 1) {
    const slide = slideDefinitions[index];
    await page.setContent(
      slideHtml({ slide, index, sourceMap, logoUrl, format }),
      { waitUntil: "networkidle" },
    );
    await page.evaluate(() => document.fonts.ready);
    if (isIpad) {
      const layout = await page.evaluate(() => {
        const canvas = document.querySelector(".canvas").getBoundingClientRect();
        const copy = document.querySelector(".copy").getBoundingClientRect();
        const audience = document.querySelector(".audience").getBoundingClientRect();
        const devices = [...document.querySelectorAll(".device")].map((element) =>
          element.getBoundingClientRect());
        const deviceLeft = Math.min(...devices.map((rect) => rect.left));
        const deviceRight = Math.max(...devices.map((rect) => rect.right));
        return {
          canvasWidth: canvas.width,
          copyLeft: copy.left,
          copyRight: copy.right,
          copyCenter: copy.left + copy.width / 2,
          audienceCenter: audience.left + audience.width / 2,
          deviceLeft,
          deviceRight,
          deviceCenter: (deviceLeft + deviceRight) / 2,
        };
      });
      const expectedCenter = layout.canvasWidth / 2;
      const centered = [layout.copyCenter, layout.audienceCenter, layout.deviceCenter]
        .every((center) => Math.abs(center - expectedCenter) <= 1);
      const horizontallyContained =
        layout.copyLeft >= 0 &&
        layout.copyRight <= layout.canvasWidth &&
        layout.deviceLeft >= 0 &&
        layout.deviceRight <= layout.canvasWidth;
      if (!centered || !horizontallyContained) {
        throw new Error(
          `Invalid centered iPad layout for ${slide.id}: ${JSON.stringify(layout)}`,
        );
      }
    }
    await page.waitForTimeout(100);
    await page.screenshot({
      path: join(targetDirectory, `${slide.id}.png`),
    });
  }
  await context.close();
};

const renderContactSheet = async ({ browser, directory, format }) => {
  const files = slideDefinitions.map((slide) =>
    join(directory, `${slide.id}.png`));
  const images = await Promise.all(
    files.map(async (file) => dataUrl("image/png", await readFile(file))),
  );
  const thumbWidth = format === "ipad" ? 420 : 290;
  const thumbHeight = format === "ipad" ? 560 : 630;
  const sheetWidth = 1_320;
  const sheetHeight = 5 * (thumbHeight + 120) + 180;
  const context = await browser.newContext({
    viewport: { width: sheetWidth, height: sheetHeight },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  await page.setContent(`<!doctype html>
    <html lang="de">
      <style>
        * { box-sizing: border-box; }
        html,body { margin:0; width:${sheetWidth}px; height:${sheetHeight}px; overflow:hidden; background:#090A0D; color:#EEF0F2; font-family:Inter,-apple-system,sans-serif; }
        main { padding:70px; }
        h1 { margin:0 0 44px; font-size:42px; letter-spacing:-.04em; }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:70px 54px; }
        figure { margin:0; display:flex; gap:20px; align-items:flex-start; }
        img { width:${thumbWidth}px; height:${thumbHeight}px; object-fit:contain; object-position:top; border:1px solid rgba(255,255,255,.1); box-shadow:0 25px 70px -35px #000; }
        figcaption { padding-top:10px; font-size:20px; line-height:1.35; color:rgba(238,240,242,.58); }
        strong { display:block; margin-bottom:8px; color:#2EAD89; font-size:18px; letter-spacing:.08em; }
      </style>
      <body>
        <main>
          <h1>RewirePerform · App Store ${format === "ipad" ? "iPad" : "iPhone"} · Entwürfe 1–10</h1>
          <div class="grid">
            ${images.map((image, index) => `
              <figure>
                <img src="${image}" alt="" />
                <figcaption><strong>${String(index + 1).padStart(2, "0")}</strong>${escapeHtml(slideDefinitions[index].eyebrow)}</figcaption>
              </figure>`).join("")}
          </div>
        </main>
      </body>
    </html>`, { waitUntil: "load" });
  await page.screenshot({
    path: join(outputRoot, `contact-sheet-${format}.png`),
  });
  await context.close();
};

await Promise.all([
  mkdir(sourceDirectory, { recursive: true }),
  mkdir(iphoneDirectory, { recursive: true }),
  mkdir(ipadDirectory, { recursive: true }),
]);

let mainServer;
let coachServer;
const browser = await chromium.launch({
  headless: true,
  executablePath: chromeExecutable,
});

try {
  if (!reuseSources) {
    mainServer = startViteServer({ port: 4_181 });
    await waitForServer("http://127.0.0.1:4181");
    await captureAthleteSources(browser);

    // Start the isolated Coach harness only after the athlete capture. Launching
    // both Vite configurations together can invalidate an in-flight optimized
    // dependency and produce a transient "Outdated Optimize Dep" response.
    coachServer = startViteServer({ port: 4_182, config: coachConfig });
    await waitForServer("http://127.0.0.1:4182");
    await captureCoachSources(browser);
  }

  const sourceMap = await buildSourceMap();
  const logoSvg = await readFile(
    join(repositoryRoot, "public", "brand", "rewireperform-symbol-dark.svg"),
  );
  const logoUrl = dataUrl("image/svg+xml", logoSvg);

  if (!requestedFormat || requestedFormat === "iphone") {
    await renderSlides({
      browser,
      sourceMap,
      logoUrl,
      format: "iphone",
    });
    await renderContactSheet({
      browser,
      directory: iphoneDirectory,
      format: "iphone",
    });
  }
  if (!requestedFormat || requestedFormat === "ipad") {
    await renderSlides({
      browser,
      sourceMap,
      logoUrl,
      format: "ipad",
    });
    await renderContactSheet({
      browser,
      directory: ipadDirectory,
      format: "ipad",
    });
  }
} finally {
  await browser.close();
  mainServer?.kill("SIGTERM");
  coachServer?.kill("SIGTERM");
}

console.log(`App Store screenshot drafts written to ${outputRoot}`);
