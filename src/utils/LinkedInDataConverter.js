import { LINKEDIN_FILE_MAP, LINKEDIN_FILE_TYPES } from "./Constants";

class LinkedInDataConverter {
  constructor(kuzu) {
    this.kuzu = kuzu;
    this.reset();
  }

  reset() {
    this.companies = new Set();
    this.companyFollows = [];
    this.connections = [];
    this.skills = new Set();
    this.educations = new Set();
    this.messages = new Set();
  }

  async handleFile(file) {
    const FS = this.kuzu.getFS();
    const fileName = file.name;
    // Skip non-CSV files
    if (!fileName.endsWith(".csv")) {
      return;
    }
    if (!LINKEDIN_FILE_MAP[fileName]) {
      console.warn("Skipping unknown file:", fileName);
      return;
    }
    const fileData = await file.arrayBuffer();
    await FS.writeFile(fileName, new Uint8Array(fileData));
    try {
      console.log(LINKEDIN_FILE_TYPES);
      let query = `LOAD FROM '${fileName}' (header=true, ignore_errors=true) RETURN *`;
      const result = await this.kuzu.query(query);
      console.log("Found file:", fileName, "with type:", LINKEDIN_FILE_MAP[fileName]);
      console.log(result);
      switch (LINKEDIN_FILE_MAP[fileName]) {
        case LINKEDIN_FILE_TYPES.CONNECTIONS:
          this.handleConnections(result.rows);
          break;
        case LINKEDIN_FILE_TYPES.SKILLS:
          this.handleSkills(result.rows);
          break;
        case LINKEDIN_FILE_TYPES.COMPANY_FOLLOWS:
          this.handleCompanyFollows(result.rows);
          break;
        default:
        // Do nothing
      }
    } catch (error) {
      console.error("Error processing file:", fileName, error);
    }
    finally {
      await FS.unlink(fileName);
    }
  }

  handleConnections(result) {
    for (let i = 1; i < result.length; ++i) {
      const connection = {
        firstName: result[i]["Notes:"],
        lastName: result[i]["column1"],
        url: result[i]["column2"],
        email: result[i]["column3"],
        company: result[i]["column4"],
        position: result[i]["column5"],
        connectedOn: result[i]["column6"],
      }
      if ((!connection.firstName && !connection.lastName) || !connection.url) {
        continue;
      }
      this.connections.push(connection);
      if (!connection.company) {
        continue;
      }
      this.companies.add(connection.company);
    }
    console.log("Connections:", this.connections);
  }

  handleSkills(result) {
    for (let i = 0; i < result.length; ++i) {
      const skill = result[i]["Name"];
      if (!skill) {
        continue;
      }
      this.skills.add(skill);
    }
    console.log("Skills:", this.skills);
  }

  handleCompanyFollows(result) {
    for (let i = 0; i < result.length; ++i) {
      const company = result[i]["Organization"];
      if (!company) {
        continue;
      }
      this.companies.add(company);
      this.companyFollows.push({
        company,
        since: result[i]["Followed On"],
      });
    }
    console.log("Companies:", this.companies);
    console.log("Company Follows:", this.companyFollows);
  }

  async createTables() {
    // Create Company
    const createCompanyQuery = `CREATE NODE TABLE Company (name STRING, PRIMARY KEY(name));`;
    await this.kuzu.query(createCompanyQuery);
    for (const company of this.companies) {
      const insertCompanyQuery = `CREATE (c:Company {name: $name})`;
      await this.kuzu.query(insertCompanyQuery, { name: company });
    }

    // Create Connection
    const createConnectionQuery = `CREATE NODE TABLE Connection (firstName STRING, lastName STRING, url STRING, email STRING, position STRING, connectedOn STRING, company STRING, PRIMARY KEY(url));`;
    await this.kuzu.query(createConnectionQuery);
    for (const connection of this.connections) {
      const insertConnectionQuery = `CREATE (c:Connection {firstName: $firstName, lastName: $lastName, url: $url, email: $email, position: $position, connectedOn: $connectedOn, company: $company})`;
      await this.kuzu.query(insertConnectionQuery, JSON.parse(JSON.stringify(connection)));
    }

    // Create Skill
    const createSkillQuery = `CREATE NODE TABLE Skill (name STRING, PRIMARY KEY(name));`;
    await this.kuzu.query(createSkillQuery);
    for (const skill of this.skills) {
      const insertSkillQuery = `CREATE (s:Skill {name: $name})`;
      await this.kuzu.query(insertSkillQuery, { name: skill });
    }
  }
}

export default LinkedInDataConverter;
