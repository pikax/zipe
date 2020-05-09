<template>
  <h1>Hello Vite + Vude 3!</h1>
  <p>Edit ./App.vue to test hot module replacement (HMR).</p>
  <p>
    <span>Count is: {{ count }}</span>
    <button @click="count++">increment</button>
  </p>
</template> 

<script>
import App from './App2.vue'
import AppTest from './views/Test.vue'

export default {
  components: {
    App,
  },
  data: () => ({ count: 0 })
}
</script>

<style>
h1 {
  color: #4fc08d;
}

h1, p {
  font-family: Arial, Helvetica, sans-serif;
}
</style>
