<template>
  <div>
    <drop-zone
      v-if="!isFileLoaded && !isFileLoading"
      @files-selected="handleFilesSelected"
    />
    <div
      v-else-if="isFileLoading"
      class="file-loading__container"
    >
      <code ref="codeBox">
        <pre
          ref="preBox"
          v-text="loadingMessage"
        />
      </code>
    </div>
    <div
      v-else
      class="main-layout__container"
    >
      <visualization-view />

      <chat-view />
    </div>
  </div>
</template>

<script lang="js">
import Kuzu from '../utils/KuzuWasm';
import WebLlm from '../utils/WebLlm';
import LinkedInDataConverter from '../utils/LinkedInDataConverter';
import VisualizationView from './VisualizationView.vue';
import DropZone from './DropZone.vue';
import ChatView from './ChatView.vue';

export default {
  name: "MainLayout",
  components: {
    DropZone,
    VisualizationView,
    ChatView,
  },
  data: () => ({
    converter: null,
    isFileLoaded: false,
    isFileLoading: false,
  }),
  computed: {
    loadingMessage() {
      if (!this.converter || !this.isFileLoading) {
        return "Initializing Kùzu WebAssembly module...";
      }
      return this.converter.logs.join("\n");
    },
  },
  watch: {
    loadingMessage() {
      this.$nextTick(() => {
        if (!this.$refs.preBox || !this.$refs.codeBox) {
          return;
        }
        const isCodeBoxOverflowed = this.$refs.preBox.scrollHeight > this.$refs.codeBox.clientHeight;
        if (isCodeBoxOverflowed) {
          this.$refs.preBox.scrollTop = this.$refs.preBox.scrollHeight;
        }
      });
    },
  },
  mounted() {

  },
  beforeUnmount() {

  },
  async created() {
    await Kuzu.init();
    this.converter = new LinkedInDataConverter(Kuzu);
    await WebLlm.init();
  },
  methods: {
    async handleFilesSelected(files) {
      this.isFileLoading = true;
      await Kuzu.init();
      for (let i = 0; i < files.length; ++i) {
        await this.converter.handleFile(files[i]);
      }
      await this.converter.createTables();
      this.isFileLoading = false;
      this.isFileLoaded = true;
    },
  }
};
</script>

<style scoped lang="scss">
.main-layout__container {
  display: flex;
  height: 100vh;
  width: 100vw;
}

.file-loading__container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh; // Full height for vertical centering
  background-color: #f9f9f9;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);

  code {
    width: 75%;
    height: 75%;
    background: #333;
    color: #f8f8f2;
    padding: 15px;
    border-radius: 8px;
    font-size: 14px;
    max-width: 80%;
    white-space: pre-wrap;
    line-height: 1.5;
    font-family: "Courier New", monospace;
    display: flex;
    overflow-y: auto;
  }

  pre {
    margin: 0; // Remove default margins
  }
}
</style>
