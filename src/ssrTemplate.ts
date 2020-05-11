import {
  hmrClientPublicPath,
  hmrClientId,
} from "vite/dist/server/serverPluginHmr";
import { StyleHeader } from "./resolver/processSFC";
import { createApp, createSSRApp, hydrate } from "vue";

createApp;

export function renderToSSRApp(
  htmlHydrated: string,
  appName: string,
  runtimeName: string, //aka vue module name
  scriptSPA: string,
  styles: StyleHeader[]
) {
  // since some ESM builds expect these to be replaced by the bundler
  const devInjectionCode =
    `\n<script type="module">` +
    `import "${hmrClientPublicPath}"\n` +
    `window.__DEV__ = true\n` +
    `window.process = { env: { NODE_ENV: 'development' }}\n` +
    `</script>\n`;

  const devStyleUpdateInjection = `\nimport { updateStyle } from "/${hmrClientId}"`;

  const styleHeader = styles
    .map(
      (x) =>
        `<link id="vite-css-${x.id}" rel="stylesheet" type="text/css" href="${x.href}">`
    )
    .join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Vite App</title>
    ${styleHeader}
  </head>
  <body>
    <div id="app">${htmlHydrated}</div>
    ${devInjectionCode}
    <script type="module">
      ${devStyleUpdateInjection}

      ${scriptSPA}

      ${runtimeName}.createSSRApp(${appName}).mount("#app");
    </script>
  </body>
</html>
  `;

  return html;
}
