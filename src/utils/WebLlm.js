import * as webllm from "@mlc-ai/web-llm";
import { CYPHER_QA_PROMPT, QUERY_GENERATION_PROMPT } from "./Prompts";
const MODEL_NAME = "Llama-3.1-8B-Instruct-q4f32_1-MLC";
import Kuzu from './KuzuWasm';

class WebLlm {
  constructor() {
    window.webLlm = this;
    this.initializationPromise = null;
    this.engine = null;
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
        console.log("MLC init progress:", progress);
      }
    });
    console.timeEnd("MLC init");
  }

  async getEngine() {
    await this.init();
    return this.engine;
  }

  async kuzuQaChian(question) {
    const engine = await this.getEngine();
    const schema = await Kuzu.getSchema();
    let prompt = QUERY_GENERATION_PROMPT(question, schema);
    console.log("Query generation prompt:", prompt);
    let messages = [{ role: "user", content: prompt }];
    let reply = await engine.chat.completions.create({
      messages,
    });
    let response = reply.choices[0].message.content;
    console.log("Generated query:", response);
    const queryResult = await Kuzu.query(response);
    prompt = CYPHER_QA_PROMPT(question, queryResult.rows);
    console.log("Cypher QA prompt:", prompt);
    messages = [{ role: "user", content: prompt }];
    reply = await engine.chat.completions.create({
      messages,
    });
    response = reply.choices[0].message.content;
    console.log("Generated response:", response);
    return response;
  }
}

// Singleton instance
const instance = new WebLlm();
export default instance;
