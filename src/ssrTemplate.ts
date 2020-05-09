import { hmrClientPublicPath } from "vite/dist/server/serverPluginHmr";

export function renderToSSRApp(htmlHydrated: string, scriptSPA: string) {
  // since some ESM builds expect these to be replaced by the bundler
  const devInjectionCode =
    `\n<script type="module">` +
    `import "${hmrClientPublicPath}"\n` +
    `window.__DEV__ = true\n` +
    `window.process = { env: { NODE_ENV: 'development' }}\n` +
    `</script>\n`;

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Vite App</title>
  </head>
  <body>
    <div id="app">${htmlHydrated}</div>
    ${devInjectionCode}
    <script type="module">
      // import { createSSRApp } from "vue";
      
      ${scriptSPA}

      _____modules_vue_.createSSRApp(_ZIPE_APP___).mount("#app");
    </script>
  </body>
</html>
  `;

  return html;
}
