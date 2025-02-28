import yaml from 'js-yaml';

const int128Replacer = (_, value) => {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
};

const schemaToYaml = (schema) => {
  const formattedSchema = {
    nodeTables: schema.nodeTables.map(node => ({
      name: node.name,
      properties: node.properties.map(prop => {
        // const processedProp = {
        //   name: prop.name,
        //   type: prop.type,
        // };
        // if (prop.isPrimaryKey) {
        //   processedProp.isPrimaryKey = true;
        // }
        // return processedProp;
        return prop.name;
      }
      )
    })),
    relTables: schema.relTables.map(rel => ({
      name: rel.name,
      properties: rel.properties.map(prop => {
        // return {
        //   name: prop.name,
        //   type: prop.type
        // }
        return prop.name;
      }
      ),
      connection: rel.connectivity.map(conn => ({
        from: conn.src,
        to: conn.dst
      }))
    }))
  };
  return yaml.dump(formattedSchema, { noRefs: true });
};

const QUERY_GENERATION_PROMPT = (question, schema) => {
  let formattedSchema;
  try {
    formattedSchema = schemaToYaml(schema);
  }
  catch (e) {
    formattedSchema = JSON.stringify(schema, int128Replacer, 2);
  }
  const prompt = ` You are an expert in translating natural language questions into Cypher statements.
You will be provided with a question and a graph schema.
Use only the provided relationship types and properties in the schema to generate a Cypher statement.
The Cypher statement could retrieve nodes, relationships, or both.
Do not include any explanations or apologies in your responses.
Do not respond to any questions that might ask anything else than for you to construct a Cypher statement.

Task: Generate a Cypher statement to query a graph database.
Instructions:
Schema:
${formattedSchema}

The question is:
${question}

Instructions:
Generate the Kùzu dialect of Cypher with the following rules in mind:
1. Do not include triple backticks ${"```"} in your response.Return only Cypher.
2. Only use the nodes and relationships provided in the schema.
3. Use only the provided node and relationship types and properties in the schema.
4. The dataset is from a user's LinkedIn data dump.
5. There is only one "Owner" node. There is no need to filter by the "Owner" node. When referring to "I" or "me" in the question, use the "Owner" node.
6. If the question is about a contact, DO NOT use the "Owner" node.
7. "Follows" in the schema refers to getting notifications about a company. Do not use it to imply working at a company or being connected to a user.
8. "WorksAt" in the schema refers to a user working at a company.
9. "Connects" in the schema refers to a user being connected to another user.
10. Always respect the direction of relationships defined in the schema.
`;
  return prompt;
};


const CYPHER_QA_PROMPT = (question, context) => {
  const formatted = JSON.stringify(context, int128Replacer, 2);
  const prompt = `You are an AI assistant using Retrieval-Augmented Generation (RAG).
RAG enhances your responses by retrieving relevant information from a knowledge base.
You will be provided with a question and relevant context. Use only this context to answer the question.
Do not make up an answer. If you don't know the answer, say so clearly.
Always strive to provide concise, helpful, and context-aware answers.
Given the following question and relevant context, please provide a comprehensive and
accurate response:
Question: ${question}
Context: ${formatted}
`;
  return {
    prompt,
    formattedJson: formatted
  }
};

export {
  QUERY_GENERATION_PROMPT,
  CYPHER_QA_PROMPT
};