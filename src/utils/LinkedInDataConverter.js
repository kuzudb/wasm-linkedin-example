import { LINKEDIN_FILE_MAP, LINKEDIN_FILE_TYPES, HARD_CODED_LINKEDIN_OWNER_URL } from "./Constants";
import moment from 'moment';
class LinkedInDataConverter {
  constructor(kuzu) {
    this.kuzu = kuzu;
    this.reset();
  }

  reset() {
    this.logs = [];
    this.companies = new Set();
    this.companyFollows = [];
    this.connections = [];
    this.endorsements = [];
    this.positions = [];
    this.owner = {};
    this.skills = new Set();
    this.educations = new Set();
    this.messages = [];
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
      let query = `LOAD FROM '${fileName}' (header=true, ignore_errors=true) RETURN *`;
      const result = await this.kuzu.query(query);
      this.logs.push(`Found file: ${fileName} with type: ${LINKEDIN_FILE_MAP[fileName]}`);
      switch (LINKEDIN_FILE_MAP[fileName]) {
        case LINKEDIN_FILE_TYPES.PROFILE:
          this.handleProfile(result.rows);
          break;
        case LINKEDIN_FILE_TYPES.CONNECTIONS:
          this.handleConnections(result.rows);
          break;
        case LINKEDIN_FILE_TYPES.SKILLS:
          this.handleSkills(result.rows);
          break;
        case LINKEDIN_FILE_TYPES.COMPANY_FOLLOWS:
          this.handleCompanyFollows(result.rows);
          break;
        case LINKEDIN_FILE_TYPES.ENDORSEMENT_RECEIVED_INFO:
          this.handleEndorsementReceivedInfo(result.rows);
          break;
        case LINKEDIN_FILE_TYPES.POSITIONS:
          this.handlePositions(result.rows);
          break;
        case LINKEDIN_FILE_TYPES.MESSAGES:
          this.handleMessages(result.rows);
          break;
        default:
        // Do nothing
      }
    } catch (error) {
      console.error("Error processing file:", fileName, error);
      this.logs.push(`Error processing file: ${fileName}`);
    }
    finally {
      await FS.unlink(fileName);
    }
  }

  handleProfile(result) {
    if (result.length === 0) {
      return;
    }
    const owner = {
      firstName: result[0]["First Name"],
      lastName: result[0]["Last Name"],
      headline: result[0]["Headline"],
      geoLocation: result[0]["Geo Location"],
      industry: result[0]["Industry"],
      summary: result[0]["Summary"],
    };
    this.owner = owner;
  }


  handleConnections(result) {
    for (let i = 1; i < result.length; ++i) {
      let connectedOn = result[i]["column6"];
      const format = "DD MMM YYYY";
      connectedOn = moment(connectedOn, format).format("YYYY-MM-DD");
      // connectedOn = new Date(connectedOn);
      const connection = {
        firstName: result[i]["Notes:"],
        lastName: result[i]["column1"],
        url: result[i]["column2"],
        email: result[i]["column3"],
        company: result[i]["column4"],
        position: result[i]["column5"],
        connectedOn,
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
  }

  handleSkills(result) {
    for (let i = 0; i < result.length; ++i) {
      const skill = result[i]["Name"];
      if (!skill) {
        continue;
      }
      this.skills.add(skill);
    }
  }

  handleCompanyFollows(result) {
    for (let i = 0; i < result.length; ++i) {
      const company = result[i]["Organization"];
      let followedOn = result[i]["Followed On"];
      const format = "ddd MMM DD HH:mm:ss [UTC] YYYY";
      followedOn = moment(followedOn, format).toDate();
      if (!company) {
        continue;
      }
      this.companies.add(company);
      this.companyFollows.push({
        company,
        since: followedOn,
      });
    }
  }

  handleEndorsementReceivedInfo(result) {
    for (let i = 0; i < result.length; ++i) {
      const skill = result[i]["Skill Name"];
      this.skills.add(skill);
      const endorser = result[i]["Endorser Public Url"];
      let endorsedOn = result[i]["Endorsement Date"];
      const format = "YYYY/MM/DD HH:mm:ss UTC";
      endorsedOn = moment(endorsedOn, format).toDate();
      this.endorsements.push({
        skill,
        endorser,
        endorsedOn,
      });
    }
  }

  handlePositions(result) {
    for (let i = 0; i < result.length; ++i) {
      const position = result[i]["Title"];
      const company = result[i]["Company Name"];
      this.companies.add(company);
      this.positions.push({
        position,
        company,
      });
    }
  }

  handleMessages(result) {
    for (let i = 0; i < result.length; ++i) {
      const from = result[i]["SENDER PROFILE URL"];
      const to = result[i]["RECIPIENT PROFILE URLS"];
      let timestamp = result[i]["DATE"];
      const format = "YYYY-MM-DD HH:mm:ss [UTC]";
      timestamp = moment(timestamp, format).toDate();
      const subject = result[i]["SUBJECT"];
      const content = result[i]["CONTENT"];
      const id = result[i]["CONVERSATION ID"];
      if (!from || !to) {
        continue;
      }
      this.messages.push({
        id,
        from,
        to,
        subject,
        content,
        receivedOn: timestamp,
      });
    }
  }

  async createTables() {
    const db = await this.kuzu.getDb();
    const conn = new this.kuzu.kuzu.Connection(db);
    let res;
    // Create schema
    this.logs.push("Creating schema...");

    const createCompanyQuery = `CREATE NODE TABLE Company (name STRING, PRIMARY KEY(name));`;
    res = await conn.query(createCompanyQuery);
    await res.close();

    const createPersonQuery = `CREATE NODE TABLE Person (firstName STRING, lastName STRING, url STRING, email STRING, PRIMARY KEY(url));`;
    res = await conn.query(createPersonQuery);
    await res.close();

    const createConnectsQuery = `CREATE REL TABLE Connects (FROM Person TO Person, connectedOn DATE);`;
    res = await conn.query(createConnectsQuery);
    await res.close();

    const createSkillQuery = `CREATE NODE TABLE Skill (name STRING, PRIMARY KEY(name));`;
    res = await conn.query(createSkillQuery);
    await res.close();

    const createHasSkillQuery = `CREATE REL TABLE HasSkill (FROM Person TO Skill);`;
    res = await conn.query(createHasSkillQuery);
    await res.close();

    const createWorksAtQuery = `CREATE REL TABLE WorksAt (FROM Person TO Company, position STRING);`;
    res = await conn.query(createWorksAtQuery);
    await res.close();

    const createEndorsesQuery = `CREATE REL TABLE Endorses (FROM Person TO Skill, endorsedOn TIMESTAMP);`;
    res = await conn.query(createEndorsesQuery);
    await res.close();

    const createFollowsQuery = `CREATE REL TABLE GetNotification (FROM Person TO Company, since TIMESTAMP);`;
    res = await conn.query(createFollowsQuery);
    await res.close();

    const createMessagesQuery = `CREATE REL TABLE Messages (FROM Person TO Person, subject STRING, content STRING, receivedOn TIMESTAMP);`;
    res = await conn.query(createMessagesQuery);
    await res.close();
    this.logs.push("Schema created.");

    let counter;

    counter = 0;
    this.logs.push("Creating companies...");
    // Create Company
    const insertCompanyQuery = await conn.prepare(`CREATE (c:Company {name: $name})`);
    for (const company of this.companies) {
      await conn.execute(insertCompanyQuery, { name: company });
      counter++;
    }
    await insertCompanyQuery.close();
    this.logs.push(`Created ${counter} companies.`);

    const connectionUrls = new Set(this.connections.map(connection => connection.url));

    counter = 0;
    this.logs.push("Creating connections...");
    // Create Connection
    const insertConnectionQuery =
      await conn.prepare(
        `CREATE (c:Person {firstName: $firstName, lastName: $lastName, url: $url, email: $email})`
      );
    const insertConnectsQuery =
      await conn.prepare(
        `MATCH (o:Person), (c:Person) WHERE o.url="${HARD_CODED_LINKEDIN_OWNER_URL}" AND c.url = $url CREATE (o)-[r:Connects {connectedOn: DATE($connectedOn)}]->(c)`
      );
    const insertConnectionWorksAtQuery =
      await conn.prepare(
        `MATCH (c:Person), (co:Company) WHERE c.url = $url AND co.name = $company CREATE (c)-[r:WorksAt {position: $position}]->(co)`
      );
    
    // Create Owner first
    await conn.execute(insertConnectionQuery, {
      firstName: this.owner.firstName,
      lastName: this.owner.lastName,
      url: HARD_CODED_LINKEDIN_OWNER_URL,
      email: "",
    });

    for (const connection of this.connections) {
      const clonedConnection = JSON.parse(JSON.stringify(connection));
      delete clonedConnection.connectedOn;
      delete clonedConnection.company;
      delete clonedConnection.position;
      await conn.execute(insertConnectionQuery, clonedConnection);
      await conn.execute(insertConnectsQuery, { url: connection.url, connectedOn: connection.connectedOn });
      if (!connection.company || !connection.position) {
        continue;
      }
      await conn.execute(insertConnectionWorksAtQuery, {
        url: connection.url,
        company: connection.company,
        position: connection.position
      });
      counter++;
    }
    await insertConnectionQuery.close();
    await insertConnectsQuery.close();
    await insertConnectionWorksAtQuery.close();
    this.logs.push(`Created ${counter} connections.`);

    // Create Skill
    counter = 0;
    this.logs.push("Creating skills...");
    const insertSkillQuery =
      await conn.prepare(
        `CREATE (s:Skill {name: $name})`
      );
    const insertHasSkillQuery =
      await conn.prepare(
        `MATCH (o:Person), (s:Skill) WHERE o.url="${HARD_CODED_LINKEDIN_OWNER_URL}" AND s.name = $name CREATE (o)-[r:HasSkill]->(s)`
      );
    for (const skill of this.skills) {
      await conn.execute(insertSkillQuery, { name: skill });
      await conn.execute(insertHasSkillQuery, { name: skill });
      counter++;
    }
    await insertSkillQuery.close();
    await insertHasSkillQuery.close();
    this.logs.push(`Created ${counter} skills.`);

    // Create Endorsement
    counter = 0;
    this.logs.push("Creating endorsements...");
    const insertEndorsementQuery =
      await conn.prepare(
        `MATCH (c:Person), (s:Skill) WHERE c.url = $url AND s.name = $skill CREATE (c)-[r:Endorses {endorsedOn: $endorsedOn}]->(s)`
      );
    for (const endorsement of this.endorsements) {
      // LinkedIn does not export the URL of the endorser in the same format as the connections
      // So we try to fix it here
      const fixedUrl = `https://${endorsement.endorser}`;
      if (!connectionUrls.has(fixedUrl)) {
        continue;
      }
      await conn.execute(insertEndorsementQuery, {
        url: fixedUrl,
        skill: endorsement.skill,
        endorsedOn: endorsement.endorsedOn,
      });
      counter++;
    }
    await insertEndorsementQuery.close();
    this.logs.push(`Created ${counter} endorsements.`);

    // Create Position
    const insertPositionQuery =
      await conn.prepare(
        `MATCH (o:Person), (co:Company) WHERE o.url="${HARD_CODED_LINKEDIN_OWNER_URL}" AND co.name = $company CREATE (o)-[r:WorksAt {position: $position}]->(co)`
      );
    counter = 0;
    this.logs.push("Creating positions...");
    for (const position of this.positions) {
      await conn.execute(insertPositionQuery, { company: position.company, position: position.position });
      counter++;
    }
    await insertPositionQuery.close();
    this.logs.push(`Created ${counter} positions.`);

    // Create Company Follows
    counter = 0;
    const insertCompanyFollowQuery =
      await conn.prepare(
        `MATCH (o:Person), (co:Company) WHERE o.url="${HARD_CODED_LINKEDIN_OWNER_URL}" AND co.name = $company CREATE (o)-[r:GetNotification {since: $since}]->(co)`
      );
    this.logs.push("Creating company follows...");
    for (const companyFollow of this.companyFollows) {
      await conn.execute(insertCompanyFollowQuery, { company: companyFollow.company, since: companyFollow.since });
      counter++;
    }
    await insertCompanyFollowQuery.close();
    this.logs.push(`Created ${counter} company follows.`);

    // Create Messages
    counter = 0;
    this.logs.push("Creating messages...");
    const insertIncomingMessageQuery =
      await conn.prepare(
        `MATCH (o:Person), (c:Person) WHERE o.url="${HARD_CODED_LINKEDIN_OWNER_URL}" AND c.url = $url CREATE (c)-[r:Messages {subject: $subject, content: $content, receivedOn: $receivedOn}]->(o)`
      );
    const insertOutgoingMessageQuery =
      await conn.prepare(
        `MATCH (o:Person), (c:Person) WHERE o.url="${HARD_CODED_LINKEDIN_OWNER_URL}" AND c.url = $url CREATE (o)-[r:Messages {subject: $subject, content: $content, receivedOn: $receivedOn}]->(c)`
      );

    for (const message of this.messages) {
      const isIncoming = connectionUrls.has(message.from);
      const isOutgoing = connectionUrls.has(message.to);
      if (isIncoming) {
        await conn.execute(
          insertIncomingMessageQuery,
          { url: message.from, subject: message.subject, content: message.content, receivedOn: message.receivedOn });
      }
      if (isOutgoing) {
        await conn.execute(insertOutgoingMessageQuery, { url: message.to, subject: message.subject, content: message.content, receivedOn: message.receivedOn });
      }
    }
    await insertIncomingMessageQuery.close();
    await insertOutgoingMessageQuery.close();
    this.logs.push(`Created ${counter} messages.`);
    await conn.close();
    this.logs.push("Done.");
  }
}

export default LinkedInDataConverter;
