<template>
  <h1>Hello Vite + Vue 3 + Zipe!</h1>
  <p>Edit ./App.vue to test hot module replacement (HMR) S.</p>
  <router-view />
  <p>
    <span>Count is: {{ count }}</span>
    <button @click="count++">increment</button>
  </p>
  <app-test />
</template>

<script>
import { defineAsyncComponent } from "vue";
// import AppTest from "./views/Test.vue";
// import utils from "./src/utils.ts"; 

export default {
  components: {
    // AppTest
    AppTest: defineAsyncComponent(() => import("./views/Test.vue")),
  },
  data: () => ({ count: 0 }), 
};
</script>

<style scoped>
h1 {
  color: #4fc08d;
}

h1,
p {
  font-family: Arial, Helvetica, sans-serif;
}
</style>
