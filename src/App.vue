<template>
  <MainLayout />
</template>

<script>
import MainLayout from "./components/MainLayout.vue";
import { Tooltip } from "bootstrap";

export default {
  name: "App",
  components: {
    MainLayout,
  },
  mounted() {
    this.tooltip = new Tooltip(document.body, {
      selector: "[data-bs-toggle='tooltip']",
      trigger: "hover",
    });
  },
  beforeUnmount() {
    this.tooltip.dispose();
  },
};
</script>

<style lang="scss">
html {
  height: 100%;
}

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100%;
}
</style>
