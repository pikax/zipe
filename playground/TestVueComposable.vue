<template>
  <h2>Vue Composable</h2>
  <div>now :{{ now }}</div>
</template>

<script>
import { useNow } from "vue-composable";

export default {
  setup() {
    return useNow({
      refreshMs: 200, 
      sync: true,
    });
  },
};
</script>
