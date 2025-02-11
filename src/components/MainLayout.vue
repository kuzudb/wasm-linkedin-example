<template>
  <div>
    <drop-zone @filesSelected="handleFilesSelected" />
  </div>
</template>

<script lang="js">
import Kuzu from '../utils/KuzuWasm'; 
import DropZone from './DropZone.vue';

export default {
  name: "MainLayout",
  components: {
    DropZone,

  },
  data: () => ({

  }),
  computed: {

  },
  mounted() {

  },
  beforeUnmount() {

  },
  async created() {

  },
  methods: {
    handleFilesSelected(files) {
      console.log(files);
    },
  }
};
</script>

<style scoped lang="scss">

</style>
