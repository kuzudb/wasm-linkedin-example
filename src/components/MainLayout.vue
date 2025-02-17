<template>
  <div>
    <drop-zone @files-selected="handleFilesSelected" />
  </div>
</template>

<script lang="js">
import Kuzu from '../utils/KuzuWasm'; 
import WebLlm from '../utils/WebLlm';
import LinkedInDataConverter from '../utils/LinkedInDataConverter';
import DropZone from './DropZone.vue';

export default {
  name: "MainLayout",
  components: {
    DropZone,
  },
  data: () => ({
    converter: null,
  }),
  computed: {

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
      for (let i = 0; i < files.length; ++i) {
        await this.converter.handleFile(files[i]);
      }
      await this.converter.createTables();
    },
  }
};
</script>

<style scoped lang="scss">

</style>
