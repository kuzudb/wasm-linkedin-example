const int128Replacer = (_, value) => {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
};

const QUERY_GENERATION_PROMPT = (question, schema) => {
  const prompt = `Task:Generate Kùzu Cypher statement to query a graph database.
Instructions:
Generate the Kùzu dialect of Cypher with the following rules in mind:
1. Do not omit the relationship pattern. Always use ${"`()-[]->()`"} instead of ${"`()->()`"}.
2. Do not include triple backticks ${"```"} in your response. Return only Cypher.
3. Do not return any notes or comments in your response.

Use only the provided relationship types and properties in the schema.
Do not use any other relationship types or properties that are not provided.

In the current schema, there is no relationship at all. Please generate a Cypher statement only using the node table.

Schema:
${JSON.stringify(schema)}
Note: Do not include any explanations or apologies in your responses.
Do not respond to any questions that might ask anything else than for you to construct a Cypher statement.
Do not include any text except the generated Cypher statement.

The question is:
${question}
`;
  return prompt;
};


const CYPHER_QA_PROMPT = (question, context) => {
  const formatted = JSON.stringify(context, int128Replacer, 2);
  const prompt = `You are an assistant that helps to form nice and human understandable answers.
The information part contains the provided information that you must use to construct an answer.
The provided information is authoritative, you must never doubt it or try to use your internal knowledge to correct it.
Make the answer sound as a response to the question.Do not mention that you based the result on the given information.
Here is an example:

Question: Which managers own Neo4j stocks ?
    Context : [manager: CTL LLC, manager: JANE STREET GROUP LLC]
Helpful Answer: CTL LLC, JANE STREET GROUP LLC owns Neo4j stocks.

Follow this example when generating answers.
If the provided information is empty, say that you don't know the answer.
If there is an error in the provided information, say that you can't provide an answer due to query error.
Information:
${formatted}

Question: ${question}
Helpful Answer:`;
  return {
    prompt,
    formattedJson: formatted
  }
};

export {
  QUERY_GENERATION_PROMPT,
  CYPHER_QA_PROMPT
};