export const TABLE_TYPES = {
  NODE: "NODE",
  REL: "REL",
};

export const LINKEDIN_FILE_MAP = {
  "Ad_Targeting.csv": "AD_TARGETING",
  "Company Follows.csv": "COMPANY_FOLLOWS",
  "Connections.csv": "CONNECTIONS",
  "Education.csv": "EDUCATION",
  "Email Addresses.csv": "EMAIL_ADDRESSES",
  "Endorsement_Given_Info.csv": "ENDORSEMENT_GIVEN_INFO",
  "Endorsement_Received_Info.csv": "ENDORSEMENT_RECEIVED_INFO",
  "Events.csv": "EVENTS",
  "Invitations.csv": "INVITATIONS",
  "Job Applicant Saved Answers.csv": "JOB_APPLICANT_SAVED_ANSWERS",
  "Job Applicant Saved Screening Question Responses.csv": "JOB_APPLICANT_SAVED_SCREENING_QUESTION_RESPONSES",
  "Job Applications.csv": "JOB_APPLICATIONS",
  "Job Seeker Preferences.csv": "JOB_SEEKER_PREFERENCES",
  "Saved Jobs.csv": "SAVED_JOBS",
  "Languages.csv": "LANGUAGES",
  "Learning.csv": "LEARNING",
  "PhoneNumbers.csv": "PHONE_NUMBERS",
  "Positions.csv": "POSITIONS",
  "Profile Summary.csv": "PROFILE_SUMMARY",
  "Profile.csv": "PROFILE",
  "Registration.csv": "REGISTRATION",
  "Rich_Media.csv": "RICH_MEDIA",
  "Skills.csv": "SKILLS",
  "coach_messages.csv": "COACH_MESSAGES",
  "learning_coach_messages.csv": "LEARNING_COACH_MESSAGES",
  "learning_role_play_messages.csv": "LEARNING_ROLE_PLAY_MESSAGES",
  "messages.csv": "MESSAGES",
};

const LINKEDIN_FILE_TYPES = {}
for (const key of Object.values(LINKEDIN_FILE_MAP)) {
  LINKEDIN_FILE_TYPES[key] = key;
}
export { LINKEDIN_FILE_TYPES };
  
export const HARD_CODED_LINKEDIN_OWNER_URL = "https://www.linkedin.com/in/__ACCOUNT_OWNER__";
