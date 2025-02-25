<template>
  <div class="chat-view__wrapper">
    <div class="chat-view__inner-wrapper">
      <!-- Loading Message -->
      <div class="alert alert-primary" role="alert" v-if="loadingText">
        <i class="fa-solid fa-info-circle"></i>
        WebLLM: {{ loadingText }}
      </div>

      <!-- User Input -->
      <div class="mb-3">
        <label for="userQuestion" class="form-label">Enter your question:</label>
        <div class="input-group">
          <input type="text" id="userQuestion" class="form-control" v-model="userQuestion"
            placeholder="Ask a question..." @keyup.enter="handleQuery" />
          <button class="btn btn-primary" @click="handleQuery" :disabled="loading">
            <i class="fa-solid fa-paper-plane"></i> Ask
          </button>
        </div>
      </div>

      <!-- Error Message (Now Appears Below User Input) -->
      <div class="alert alert-danger mt-2" role="alert" v-if="errorMessage">
        <i class="fa-solid fa-triangle-exclamation"></i> {{ errorMessage }}
      </div>

      <!-- Generated Query -->
      <div class="mt-3" v-if="generatedQuery">
        <label class="form-label">Generated Cypher Query:</label>
        <pre class="query-box"><code>{{ generatedQuery }}</code></pre>
      </div>

      <!-- Raw JSON Result -->
      <div class="mt-3" v-if="rawResult">
        <label class="form-label">Raw JSON Result:</label>
        <pre class="json-box"><code>{{ rawResult }}</code></pre>
      </div>

      <!-- Natural Language Response -->
      <div class="mt-3" v-if="queryResponse">
        <label class="form-label">Explanation:</label>
        <div class="alert alert-success">
          <i class="fa-solid fa-comment"></i> {{ queryResponse }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import WebLlm from "../utils/WebLlm";

export default {
  name: "ChatView",

  data() {
    return {
      userQuestion: "",
      generatedQuery: "",
      queryResponse: "",
      rawResult: "",
      loading: false,
      errorMessage: "",
      loadingText: null,
      loadingTextInterval: null,
    };
  },

  mounted() {
    this.loadingTextInterval = setInterval(() => {
      this.loadingText = WebLlm.loadingText;
    }, 1000);

  },

  beforeUnmount() {
    clearInterval(this.loadingTextInterval);
  },

  methods: {
    async handleQuery() {
      if (!this.userQuestion.trim()) return;
      this.loading = true;
      this.generatedQuery = "";
      this.queryResponse = "";
      this.rawResult = "";
      this.errorMessage = ""; // Clear error before new request

      try {
        // Generate Cypher Query
        this.generatedQuery = await WebLlm.generateQuery(this.userQuestion);

        // Run Query and Get Explanation
        const { response, raw } = await WebLlm.runQueryAndExplain(this.userQuestion, this.generatedQuery);

        this.queryResponse = response;
        this.rawResult = raw;
      } catch (error) {
        console.error("Error:", error);
        this.errorMessage = "There was an error evaluating the generated query.";
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.chat-view__wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 500px;

  .chat-view__inner-wrapper {
    flex-grow: 1;
    overflow-y: auto;
    padding: 1em;
    background-color: #f2f6fc;
  }

  .query-box,
  .json-box {
    background: #333;
    color: #f8f8f2;
    padding: 10px;
    border-radius: 8px;
    font-size: 14px;
    overflow-x: auto;
    max-height: 200px; // Limits height for scrollability
    overflow-y: auto;
  }

  .alert {
    font-size: 14px;
    padding: 10px;
  }
}
</style>
