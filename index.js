const { default: puppeteer } = require("puppeteer");

class RingMonitor {
   constructor() {
      this.pollingIntervalMs = 5000;
      this.debuggingPort = 9222;
   }

   getBrowwserConfig = async () => {
      let browserWSEndpoint = "";
      try {
         const response = await fetch("http://127.0.0.1:9222/json/version");
         const json = await response.json();
         browserWSEndpoint = json.webSocketDebuggerUrl;
      } catch (error) {
         console.log(error);
         // https://stackoverflow.com/questions/51563287/how-to-make-chrome-always-launch-with-remote-debugging-port-flag
         console.error(
            `Error fetching browser config -- ensure browser is open with debugging port ${this.debuggingPort}`
         );
      }

      console.log("Got browserWSEndpoint: ", browserWSEndpoint);

      return {
         defaultViewport: null,
         headless: false,
         browserWSEndpoint,
         // targetFilter: (target) => !!target.url() || target.type() === "tab",
         args: [],
      };
   };

   start = async () => {
      console.log("starting");
      const browserConfig = await this.getBrowwserConfig();
      this.browser = await puppeteer.connect(browserConfig);
      this.page = await this.browser.newPage();

      await this.page.goto("https://account.ring.com/account/activity-history");

      this.pollingInterval = setInterval(() => {
         this.update();
      }, this.pollingIntervalMs);
   };

   update = async () => {
      console.log("updating");
      const isFirstEventFocused = await this.page.evaluate(() => {
         return document
            .querySelector("article[data-testid='event-item']")
            ?.getAttribute("aria-pressed");
      });

      console.log("isFirstEventFocused", isFirstEventFocused);

      if (isFirstEventFocused === "true") {
         return;
      }

      this.page.click("article[data-testid='event-item']");
   };
}

let ringMonitor = new RingMonitor();
ringMonitor.start();

process.on("SIGINT", async () => {
   console.log("Caught interrupt signal (Ctrl+C)");

   try {
      await ringMonitor.page.close();
   } catch (e) {
      console.log(e);
   }

   try {
      await ringMonitor.browser.disconnect();
   } catch (e) {
      console.log(e);
   }

   console.log("Exiting");
   process.exit();
});
