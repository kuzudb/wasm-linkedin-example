import { LINKEDIN_FILE_MAP, LINKEDIN_FILE_TYPES } from "./Constants";
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
    console.log("Messages:", this.messages);
  }

  async createTables() {
    // Create schema
    this.logs.push("Creating schema...");
    const createOwnerQuery = `CREATE NODE TABLE Owner (firstName STRING, lastName STRING, headline STRING, geoLocation STRING, industry STRING, summary STRING, PRIMARY KEY(firstName));`;
    await this.kuzu.query(createOwnerQuery);


    const createCompanyQuery = `CREATE NODE TABLE Company (name STRING, PRIMARY KEY(name));`;
    await this.kuzu.query(createCompanyQuery);

    const createContactQuery = `CREATE NODE TABLE Contact (firstName STRING, lastName STRING, url STRING, email STRING, PRIMARY KEY(url));`;
    await this.kuzu.query(createContactQuery);

    const createConnectsQuery = `CREATE REL TABLE Connects (FROM Owner TO Contact, connectedOn DATE);`;
    await this.kuzu.query(createConnectsQuery);

    const createSkillQuery = `CREATE NODE TABLE Skill (name STRING, PRIMARY KEY(name));`;
    await this.kuzu.query(createSkillQuery);

    const createHasSkillQuery = `CREATE REL TABLE HasSkill (FROM Owner TO Skill);`;
    await this.kuzu.query(createHasSkillQuery);

    const createWorksAtQuery = `CREATE REL TABLE WorksAt (FROM Owner TO Company, FROM Contact TO Company, position STRING);`;
    await this.kuzu.query(createWorksAtQuery);

    const createEndorsesQuery = `CREATE REL TABLE Endorses (FROM Contact TO Skill, endorsedOn TIMESTAMP);`;
    await this.kuzu.query(createEndorsesQuery);

    const createFollowsQuery = `CREATE REL TABLE Follows (FROM Owner TO Company, since TIMESTAMP);`;
    await this.kuzu.query(createFollowsQuery);

    const createMessagesQuery = `CREATE REL TABLE Messages (FROM Owner TO Contact, FROM Contact TO Owner, subject STRING, content STRING, receivedOn TIMESTAMP);`;
    await this.kuzu.query(createMessagesQuery);
    this.logs.push("Schema created.");

    // Create Owner
    this.logs.push("Creating owner...");
    const insertOwnerQuery = `CREATE (o:Owner {firstName: $firstName, lastName: $lastName, headline: $headline, geoLocation: $geoLocation, industry: $industry, summary: $summary})`;
    await this.kuzu.query(insertOwnerQuery, JSON.parse(JSON.stringify(this.owner)));
    this.logs.push("Owner created.");

    let counter;

    counter = 0;
    this.logs.push("Creating companies...");
    // Create Company
    for (const company of this.companies) {
      const insertCompanyQuery = `CREATE (c:Company {name: $name})`;
      await this.kuzu.query(insertCompanyQuery, { name: company });
      counter++;
    }
    this.logs.push(`Created ${counter} companies.`);

    const connectionUrls = new Set(this.connections.map(connection => connection.url));

    counter = 0;
    this.logs.push("Creating connections...");
    // Create Connection
    for (const connection of this.connections) {
      const insertConnectionQuery = `CREATE (c:Contact {firstName: $firstName, lastName: $lastName, url: $url, email: $email})`;
      const clonedConnection = JSON.parse(JSON.stringify(connection));
      delete clonedConnection.connectedOn;
      delete clonedConnection.company;
      delete clonedConnection.position;
      await this.kuzu.query(insertConnectionQuery, clonedConnection);
      const insertConnectsQuery = `MATCH (o:Owner), (c:Contact) WHERE o.firstName = $ownerFirstName AND c.url = $url CREATE (o)-[r:Connects {connectedOn: DATE($connectedOn)}]->(c)`;
      await this.kuzu.query(insertConnectsQuery, { ownerFirstName: this.owner.firstName, url: connection.url, connectedOn: connection.connectedOn });
      if (!connection.company || !connection.position) {
        continue;
      }
      const insertCompanyQuery = `MATCH (c:Contact), (co:Company) WHERE c.url = $url AND co.name = $company CREATE (c)-[r:WorksAt {position: $position}]->(co)`;
      await this.kuzu.query(insertCompanyQuery, {
        url: connection.url,
        company: connection.company,
        position: connection.position
      });
      counter++;
    }
    this.logs.push(`Created ${counter} connections.`);

    // Create Skill
    counter = 0;
    this.logs.push("Creating skills...");
    for (const skill of this.skills) {
      const insertSkillQuery = `CREATE (s:Skill {name: $name})`;
      await this.kuzu.query(insertSkillQuery, { name: skill });

      const insertHasSkillQuery = `MATCH (o:Owner), (s:Skill) WHERE o.firstName = $ownerFirstName AND s.name = $name CREATE (o)-[r:HasSkill]->(s)`;
      await this.kuzu.query(insertHasSkillQuery, { ownerFirstName: this.owner.firstName, name: skill });
      counter++;
    }
    this.logs.push(`Created ${counter} skills.`);

    // Create Endorsement
    counter = 0;
    this.logs.push("Creating endorsements...");
    for (const endorsement of this.endorsements) {
      // LinkedIn does not export the URL of the endorser in the same format as the connections
      // So we try to fix it here
      const fixedUrl = `https://${endorsement.endorser}`;
      if (!connectionUrls.has(fixedUrl)) {
        continue;
      }
      const insertEndorsementQuery = `MATCH (c:Contact), (s:Skill) WHERE c.url = $url AND s.name = $skill CREATE (c)-[r:Endorses {endorsedOn: $endorsedOn}]->(s)`;
      await this.kuzu.query(insertEndorsementQuery, {
        url: fixedUrl,
        skill: endorsement.skill,
        endorsedOn: endorsement.endorsedOn,
      });
      counter++;
    }
    this.logs.push(`Created ${counter} endorsements.`);

    // Create Position
    counter = 0;
    this.logs.push("Creating positions...");
    for (const position of this.positions) {
      const insertPositionQuery = `MATCH (o:Owner), (co:Company) WHERE o.firstName = $ownerFirstName AND co.name = $company CREATE (o)-[r:WorksAt {position: $position}]->(co)`;
      await this.kuzu.query(insertPositionQuery, { ownerFirstName: this.owner.firstName, company: position.company, position: position.position });
      counter++;
    }
    this.logs.push(`Created ${counter} positions.`);

    // Create Company Follows
    counter = 0;
    this.logs.push("Creating company follows...");
    for (const companyFollow of this.companyFollows) {
      const insertCompanyFollowQuery = `MATCH (o:Owner), (co:Company) WHERE o.firstName = $ownerFirstName AND co.name = $company CREATE (o)-[r:Follows {since: $since}]->(co)`;
      await this.kuzu.query(insertCompanyFollowQuery, { ownerFirstName: this.owner.firstName, company: companyFollow.company, since: companyFollow.since });
      counter++;
    }
    this.logs.push(`Created ${counter} company follows.`);

    // Create Messages
    counter = 0;
    this.logs.push("Creating messages...");
    for (const message of this.messages) {
      const isIncoming = connectionUrls.has(message.from);
      const isOutgoing = connectionUrls.has(message.to);
      if (isIncoming) {
        const insertMessageQuery = `MATCH (o:Owner), (c:Contact) WHERE o.firstName = $ownerFirstName AND c.url = $url CREATE (c)-[r:Messages {subject: $subject, content: $content, receivedOn: $receivedOn}]->(o)`;
        await this.kuzu.query(insertMessageQuery, { ownerFirstName: this.owner.firstName, url: message.from, subject: message.subject, content: message.content, receivedOn: message.receivedOn });
      }
      if (isOutgoing) {
        const insertMessageQuery = `MATCH (o:Owner), (c:Contact) WHERE o.firstName = $ownerFirstName AND c.url = $url CREATE (o)-[r:Messages {subject: $subject, content: $content, receivedOn: $receivedOn}]->(c)`;
        await this.kuzu.query(insertMessageQuery, { ownerFirstName: this.owner.firstName, url: message.to, subject: message.subject, content: message.content, receivedOn: message.receivedOn });
      }
    }
    this.logs.push(`Created ${counter} messages.`);
    this.logs.push("Done.");
  }
}

export default LinkedInDataConverter;
