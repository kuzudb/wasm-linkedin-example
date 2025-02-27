<template>
  <div class="row justify-content-center">
    <div class="col-lg-6 col-md-8 col-sm-10 mt-5">
      <!-- Info Box -->
      <div class="alert alert-info d-flex align-items-start p-3">
        <i class="fa-solid fa-circle-info me-2 fs-5" />
        <div>
          You can request your LinkedIn data dump by following
          <a
            href="https://www.linkedin.com/help/linkedin/answer/a1339364/downloading-your-account-data"
            target="_blank"
          >
            this link</a>.
          After downloading the dump (<code>Basic_LinkedInDataExport_***.zip</code>), simply unzip it and drag all files
          into the drop zone to use.
        </div>
      </div>

      <!-- Dropzone Container -->
      <div class="bg-white p-4 rounded-3 shadow-sm border">
        <div class="dropzone text-center p-4">
          <label
            ref="dropzone"
            for="files"
            class="dropzone-container"
          >
            <div class="file-icon text-primary">
              <i class="fa-solid fa-file-circle-plus fs-1" />
            </div>
            <p class="mt-3 fw-bold text-dark">
              Drag CSV files from your LinkedIn dump here to get started.
            </p>
            <div class="position-relative my-3">
              <span class="hr-sect">or</span>
            </div>
            <button
              class="btn btn-primary"
              @click="selectFiles"
            >
              <i class="fa-solid fa-folder-open" /> &nbsp; Browse Files
            </button>
          </label>
          <input
            ref="fileInput"
            type="file"
            multiple
            class="file-input"
            @change.prevent="handleFilesSelected"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Dropzone from "dropzone";

export default {
  name: "DropZone",
  emits: ["filesSelected"],
  data() {
    return {
      dropzone: null,
    };
  },
  mounted() {
    this.dropzone = new Dropzone(this.$refs.dropzone, {
      url: "/",
      autoProcessQueue: false,
      uploadMultiple: true,
      disablePreviews: true,
    });
    this.dropzone.on("drop", (e) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      this.$emit("filesSelected", files);
    });
  },
  beforeUnmount() {
    this.dropzone.destroy();
  },
  methods: {
    selectFiles() {
      this.$refs.fileInput.click();
    },
    handleFilesSelected(e) {
      const files = e.target.files;
      this.$emit("filesSelected", files);
      e.target.value = "";
    },
  },
};
</script>

<style lang="scss" scoped>
.dropzone {
  border: 2px dashed #0d6efd;
  background-color: #f8f9fa;
  border-radius: 10px;
  transition: all 0.3s ease-in-out;

  &:hover {
    background-color: #e9ecef;
  }

  .dropzone-container {
    width: 100%;
    height: 100%;
    padding: 2rem 0;
    cursor: pointer;
  }

  .file-input {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    opacity: 0;
    visibility: hidden;
    cursor: pointer;
  }

  .file-icon {
    font-size: 50px;
  }

  .hr-sect {
    display: flex;
    align-items: center;
    text-transform: uppercase;
    font-weight: bold;
    font-size: 14px;
    color: #6c757d;
  }

  .hr-sect::before,
  .hr-sect::after {
    content: "";
    flex-grow: 1;
    background: #dee2e6;
    height: 1px;
    margin: 0 10px;
  }
}

.btn.btn-primary {
  width: 100%;
  max-width: 300px;
}
</style>
