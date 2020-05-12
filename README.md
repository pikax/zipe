# ⚡ ZIPE ⚡

> Vite but prerender

⚠️ _EXPERIMENTAL_ - Currently only supporting render entry file, no special SSR handling, that will be in the works for the next versions

[vite](https://github.com/vuejs/vite) is "fast"⚡ but how fast can it render on the server?

`zipe` will compile the components on the fly and cache them, if the component change it will refresh the cache, making it super quick to render.

The HMR is the same as `vite` so no more page reloads, only the changed component updates.

## Working

- Proof of concept
- SSR with HMR
- importing js/ts files in SFC
- CSS scoped
- Async imports

## NOT working

- HMR on the first file change, only works when is more than 1 save
- No `build` support for now
- No `router`
- No source maps
- css modules
- css scope seems not to be working when doing SSR
- No JSX/TSX support
- Custom HTML index file or `vue-router`

# No support

- `web_modules` not supported on the server side, it will try to import by `name`. eg: `import('lodash')`

## TODO

- Custom HTML template
- `vue-router` support (some limitations, for example adding new routes on the fly and such)
- `source-maps` currently source maps don't exist, may need help here.
- `lifecycle hooks` with composition-api
- some composables to get request info, etc.
- Building `SPA` and `static`
- SSR serve
- Add option to disable `HMR` and some dev cache features to be able to run this in a server
- Tests

## Installing

```bash
# install with yarn
yarn add zipe

# install with npm
npm install zipe
```

## Usage

Create a plugin and provide the entry file for the SSR

```js
const { createViteSSR } = require("zipe");
const { createServer } = require("vite");

const SSR = createViteSSR(({ app, zipeSSR }) => {
  app.use(async (ctx, next) => {
    if (ctx.path === "/") {
      // return the HTML
      ctx.body = await zipeSSR("/App.vue"); // component path relative to root
      return;
    }
    if (ctx.path === "/output") {
      ctx.body = await zipeSSR("/views/Test.vue");
      return;
    }

    await next();
  });
});

createServer({
  plugins: [SSR],
}).listen(4242);
```

## Development

```bash

git clone https://github.com/pikax/zipe

cd zipe

yarn

yarn dev & yarn playground

# edit /App.vue
# or go to src/_playground.ts and change

```
