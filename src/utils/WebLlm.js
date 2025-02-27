import * as webllm from "@mlc-ai/web-llm";
import { CYPHER_QA_PROMPT, QUERY_GENERATION_PROMPT } from "./Prompts";
const MODEL_NAME = "Llama-3.1-8B-Instruct-q4f32_1-MLC";
import Kuzu from './KuzuWasm';

class WebLlm {
  constructor() {
    window.webLlm = this;
    this.initializationPromise = null;
    this.engine = null;
    this.loadingText = null;
  }

  async init() {
    if (this.engine) {
      return;
    }
    if (this.initializationPromise) {
      await this.initializationPromise;
      delete this.initializationPromise;
      return;
    }
    console.time("MLC init");
    const appConfig = webllm.prebuiltAppConfig;
    appConfig.useIndexedDBCache = true;
    this.engine = await webllm.CreateMLCEngine(MODEL_NAME, {
      appConfig,
      initProgressCallback: (progress) => {
        this.loadingText = progress.text;
      }
    });
    console.timeEnd("MLC init");
  }

  async getEngine() {
    await this.init();
    return this.engine;
  }

  async generateQuery(question) {
    const engine = await this.getEngine();
    const schema = await Kuzu.getSchema();
    const prompt = QUERY_GENERATION_PROMPT(question, schema);
    console.log("Query generation prompt:", prompt);
    const messages = [{ role: "user", content: prompt }];
    const reply = await engine.chat.completions.create({
      messages,
    });
    const response = reply.choices[0].message.content;
    console.log(reply);
    console.log("Generated query:", response);
    return response;
  }

  async runQueryAndExplain(question, query) {
    const engine = await this.getEngine();
    const queryResult = await Kuzu.query(query);
    const { prompt, formattedJson } = CYPHER_QA_PROMPT(question, queryResult.rows);
    console.log("Cypher QA prompt:", prompt);
    const messages = [{ role: "user", content: prompt }];
    const reply = await engine.chat.completions.create({
      messages,
    });
    console.log(reply);
    let response = reply.choices[0].message.content;
    console.log("Generated response:", response);
    return { response, raw: formattedJson };
  }
}

// Singleton instance
const instance = new WebLlm();
export default instance;
