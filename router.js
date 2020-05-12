import {
  createRouter,
  createWebHistory,
  createMemoryHistory,
} from "vue-router";
import TestRouter from "./views/TestRouter.vue"

export default createRouter({
  history:
    typeof window !== "undefined" ? createWebHistory() : createMemoryHistory(),
  routes: [
    {
      name: "index",
      path: "/router",
      // component: () => import("./views/TestRouter.vue"),
      component: TestRouter
    },
  ],
});
