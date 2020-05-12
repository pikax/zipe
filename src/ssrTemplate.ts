import {
  hmrClientPublicPath,
  hmrClientId,
} from "vite/dist/server/serverPluginHmr";
import { createApp } from "vue";
import { StyleHeader } from "./next/parse";

createApp;

export function renderToSSRApp(
  htmlHydrated: string,
  scriptSPA: string,
  containerId: string,
  styles: StyleHeader[]
) {
  // since some ESM builds expect these to be replaced by the bundler
  const devInjectionCode =
    `\n<script type="module">` +
    `import "${hmrClientPublicPath}"\n` +
    `window.__DEV__ = true\n` +
    `window.process = { env: { NODE_ENV: 'development' }}\n` +
    `</script>\n`;

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
    <div id="${containerId}">${htmlHydrated}</div>
    ${devInjectionCode}
    <script type="module">\n${scriptSPA}</script>
    </script>
  </body>
</html>
  `;

  return html;
}
