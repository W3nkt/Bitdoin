export type CareerRegion = 'Laos' | 'Asia' | 'Global'
export type CareerDemand = 'High' | 'Growing' | 'Steady'

export type CareerPath = {
  id: string
  title: string
  field: string
  summary: string
  regions: CareerRegion[]
  demand: CareerDemand
  openingsSignal: number
  majors: string[]
  skills: string[]
  work: string[]
  pathway: string[]
  relatedRoles: string[]
}

export type SalaryBand = {
  laos: string
  asia: string
  global: string
}

export type HiringOrganization = {
  name: string
  type: string
  url: string
}

export type CertificateRecommendation = {
  name: string
  provider: string
  url: string
}

export const careerPaths: CareerPath[] = [
  {
    id: 'software-engineer',
    title: 'Software Engineer',
    field: 'Technology',
    summary: 'Design and build websites, mobile apps, business systems, and digital services.',
    regions: ['Laos', 'Asia', 'Global'],
    demand: 'High',
    openingsSignal: 1280,
    majors: ['Computer Science', 'Software Engineering', 'Information Technology'],
    skills: ['Programming', 'Problem solving', 'English', 'Teamwork'],
    work: ['Build and test software', 'Turn user needs into technical solutions', 'Maintain and improve digital products'],
    pathway: ['Strengthen mathematics and English', 'Study computing or a related major', 'Build 3–5 portfolio projects', 'Complete an internship', 'Apply for junior developer roles'],
    relatedRoles: ['Web Developer', 'Mobile Developer', 'QA Engineer', 'Cloud Engineer'],
  },
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    field: 'Technology',
    summary: 'Use data to explain performance, identify trends, and support better decisions.',
    regions: ['Laos', 'Asia', 'Global'],
    demand: 'High',
    openingsSignal: 840,
    majors: ['Data Science', 'Statistics', 'Economics', 'Business Analytics'],
    skills: ['Excel', 'SQL', 'Statistics', 'Data storytelling'],
    work: ['Clean and analyze data', 'Create dashboards and reports', 'Present insights to decision makers'],
    pathway: ['Build a foundation in statistics', 'Study analytics, economics, or computing', 'Learn Excel, SQL, and visualization', 'Publish a small data portfolio', 'Apply for analyst internships'],
    relatedRoles: ['Business Analyst', 'BI Analyst', 'Research Analyst', 'Data Scientist'],
  },
  {
    id: 'civil-engineer',
    title: 'Civil Engineer',
    field: 'Engineering',
    summary: 'Plan and supervise roads, buildings, water systems, and public infrastructure.',
    regions: ['Laos', 'Asia'],
    demand: 'Growing',
    openingsSignal: 365,
    majors: ['Civil Engineering', 'Construction Engineering', 'Infrastructure Engineering'],
    skills: ['Mathematics', 'CAD', 'Project planning', 'Safety'],
    work: ['Prepare technical designs', 'Inspect construction sites', 'Coordinate contractors, budgets, and safety'],
    pathway: ['Focus on mathematics and physics', 'Earn an accredited engineering degree', 'Learn CAD and project tools', 'Complete supervised site experience', 'Pursue professional certification'],
    relatedRoles: ['Structural Engineer', 'Site Engineer', 'Quantity Surveyor', 'Urban Planner'],
  },
  {
    id: 'registered-nurse',
    title: 'Registered Nurse',
    field: 'Healthcare',
    summary: 'Provide patient care, health education, treatment support, and clinical coordination.',
    regions: ['Laos', 'Asia', 'Global'],
    demand: 'High',
    openingsSignal: 960,
    majors: ['Nursing', 'Public Health', 'Community Health'],
    skills: ['Patient care', 'Communication', 'Biology', 'Clinical judgment'],
    work: ['Monitor and care for patients', 'Support treatment plans', 'Educate families and communities'],
    pathway: ['Study biology and chemistry', 'Complete an accredited nursing program', 'Finish clinical placements', 'Pass required licensing', 'Choose a hospital or community specialty'],
    relatedRoles: ['Community Health Worker', 'Midwife', 'Clinical Coordinator', 'Public Health Officer'],
  },
  {
    id: 'digital-marketer',
    title: 'Digital Marketing Specialist',
    field: 'Business',
    summary: 'Help organizations reach customers through content, campaigns, search, and social media.',
    regions: ['Laos', 'Asia', 'Global'],
    demand: 'Growing',
    openingsSignal: 710,
    majors: ['Marketing', 'Business Administration', 'Communications', 'Media Studies'],
    skills: ['Writing', 'Social media', 'Analytics', 'Creativity'],
    work: ['Plan and publish campaigns', 'Measure audience and sales performance', 'Coordinate content and brand messaging'],
    pathway: ['Practice business writing and design', 'Study marketing or communications', 'Learn ad and analytics tools', 'Run a real or student campaign', 'Build a results-based portfolio'],
    relatedRoles: ['Content Strategist', 'SEO Specialist', 'Brand Coordinator', 'E-commerce Specialist'],
  },
  {
    id: 'environmental-specialist',
    title: 'Environmental Specialist',
    field: 'Sustainability',
    summary: 'Assess environmental impact and help projects protect natural resources and communities.',
    regions: ['Laos', 'Asia', 'Global'],
    demand: 'Growing',
    openingsSignal: 295,
    majors: ['Environmental Science', 'Forestry', 'Natural Resource Management', 'Geography'],
    skills: ['Field research', 'GIS', 'Report writing', 'Environmental policy'],
    work: ['Collect field data', 'Prepare impact assessments', 'Recommend environmental safeguards'],
    pathway: ['Study biology, geography, and chemistry', 'Choose an environmental major', 'Learn GIS and field methods', 'Volunteer on a conservation project', 'Apply to consulting, government, or NGO roles'],
    relatedRoles: ['GIS Analyst', 'Conservation Officer', 'ESG Analyst', 'Climate Project Officer'],
  },
  {
    id: 'accountant',
    title: 'Accountant',
    field: 'Finance',
    summary: 'Record, review, and explain financial activity so organizations can operate responsibly.',
    regions: ['Laos', 'Asia', 'Global'],
    demand: 'Steady',
    openingsSignal: 620,
    majors: ['Accounting', 'Finance', 'Business Administration'],
    skills: ['Numeracy', 'Excel', 'Attention to detail', 'Financial reporting'],
    work: ['Prepare financial records', 'Check compliance and controls', 'Support budgets, tax, and audits'],
    pathway: ['Build strong mathematics habits', 'Study accounting or finance', 'Learn bookkeeping and spreadsheet tools', 'Complete an accounting internship', 'Work toward a recognized qualification'],
    relatedRoles: ['Auditor', 'Finance Officer', 'Tax Associate', 'Management Accountant'],
  },
  {
    id: 'ux-designer',
    title: 'UX/UI Designer',
    field: 'Design',
    summary: 'Research user needs and design digital products that are clear, useful, and accessible.',
    regions: ['Asia', 'Global'],
    demand: 'Growing',
    openingsSignal: 430,
    majors: ['Interaction Design', 'Graphic Design', 'Computer Science', 'Psychology'],
    skills: ['User research', 'Prototyping', 'Visual design', 'Communication'],
    work: ['Interview and observe users', 'Create user flows and prototypes', 'Test and improve product experiences'],
    pathway: ['Learn visual and interaction foundations', 'Study design, computing, or psychology', 'Master a prototyping tool', 'Create 3 detailed case studies', 'Apply for product design internships'],
    relatedRoles: ['Product Designer', 'UX Researcher', 'UI Designer', 'Service Designer'],
  },
  {
    id: 'ai-engineer',
    title: 'AI / Machine Learning Engineer',
    field: 'Artificial Intelligence',
    summary: 'Build, evaluate, and deploy machine-learning and generative-AI systems inside real products.',
    regions: ['Asia', 'Global'],
    demand: 'High',
    openingsSignal: 1540,
    majors: ['Computer Science', 'Artificial Intelligence', 'Data Science', 'Software Engineering'],
    skills: ['Python', 'Machine learning', 'LLM evaluation', 'Cloud platforms'],
    work: ['Train and integrate AI models', 'Build reliable data and evaluation pipelines', 'Monitor model quality, cost, and safety'],
    pathway: ['Master programming and statistics', 'Study computing, AI, or data science', 'Build ML and LLM projects', 'Learn deployment and model evaluation', 'Apply for ML, applied AI, or research internships'],
    relatedRoles: ['Applied AI Engineer', 'Machine Learning Engineer', 'LLM Engineer', 'AI Research Engineer'],
  },
  {
    id: 'ai-product-manager',
    title: 'AI Product Manager',
    field: 'Artificial Intelligence',
    summary: 'Decide where AI creates genuine user value and guide teams from an idea to a responsible product.',
    regions: ['Asia', 'Global'],
    demand: 'Growing',
    openingsSignal: 510,
    majors: ['Business', 'Computer Science', 'Information Systems', 'Design'],
    skills: ['Product strategy', 'AI literacy', 'User research', 'Experiment design'],
    work: ['Define AI product outcomes', 'Coordinate design, engineering, and policy teams', 'Measure quality, risk, and user value'],
    pathway: ['Learn product and user-research basics', 'Build practical AI literacy', 'Lead a small AI product project', 'Practice evaluation and responsible-AI decisions', 'Enter through product, analyst, or technical roles'],
    relatedRoles: ['Technical Product Manager', 'AI Program Manager', 'Product Operations Manager', 'AI Solutions Consultant'],
  },
  {
    id: 'ai-governance-specialist',
    title: 'AI Governance Specialist',
    field: 'Artificial Intelligence',
    summary: 'Help organizations use AI legally, safely, transparently, and with clear human accountability.',
    regions: ['Asia', 'Global'],
    demand: 'Growing',
    openingsSignal: 340,
    majors: ['Law', 'Public Policy', 'Information Systems', 'Cybersecurity', 'Data Science'],
    skills: ['Risk assessment', 'AI policy', 'Data privacy', 'Audit and documentation'],
    work: ['Assess AI risks and controls', 'Translate regulation into operating policy', 'Document and monitor responsible AI use'],
    pathway: ['Study law, policy, risk, or technology', 'Learn AI systems and data protection', 'Practice impact and risk assessments', 'Earn privacy, audit, or AI governance credentials', 'Apply to compliance, policy, or responsible-AI teams'],
    relatedRoles: ['Responsible AI Analyst', 'AI Policy Specialist', 'Model Risk Analyst', 'Technology Compliance Officer'],
  },
  {
    id: 'conversation-designer',
    title: 'Conversation & Prompt Designer',
    field: 'Artificial Intelligence',
    summary: 'Design how people interact with AI assistants, including prompts, dialogue, tone, guardrails, and tests.',
    regions: ['Asia', 'Global'],
    demand: 'Growing',
    openingsSignal: 215,
    majors: ['Linguistics', 'UX Design', 'Communications', 'Computer Science', 'Psychology'],
    skills: ['Prompt design', 'Conversation writing', 'User testing', 'AI evaluation'],
    work: ['Create dialogue flows and system instructions', 'Test AI responses for quality and safety', 'Improve tone, clarity, and task completion'],
    pathway: ['Build strong writing and research skills', 'Study language, design, psychology, or computing', 'Learn LLM behavior and evaluation', 'Publish conversation-design case studies', 'Apply through UX writing, content design, or AI operations'],
    relatedRoles: ['Content Designer', 'UX Writer', 'Prompt Engineer', 'AI Trainer'],
  },
  {
    id: 'ai-automation-specialist',
    title: 'AI Automation Specialist',
    field: 'Artificial Intelligence',
    summary: 'Redesign repetitive business work using AI agents, workflow tools, APIs, and human approval steps.',
    regions: ['Laos', 'Asia', 'Global'],
    demand: 'High',
    openingsSignal: 680,
    majors: ['Information Systems', 'Business Analytics', 'Computer Science', 'Operations Management'],
    skills: ['Workflow design', 'APIs', 'No-code automation', 'Process analysis'],
    work: ['Map and improve business processes', 'Connect AI tools with company systems', 'Measure time saved, quality, and operational risk'],
    pathway: ['Learn how business processes work', 'Study information systems or operations', 'Build automations with APIs and workflow tools', 'Document measurable project results', 'Apply to operations, consulting, or transformation teams'],
    relatedRoles: ['Intelligent Automation Analyst', 'AI Operations Specialist', 'Solutions Engineer', 'Digital Transformation Analyst'],
  },
  {
    id: 'ai-data-curator',
    title: 'AI Data & Evaluation Specialist',
    field: 'Artificial Intelligence',
    summary: 'Create high-quality training and test data, evaluate AI responses, and find patterns in model failures.',
    regions: ['Asia', 'Global'],
    demand: 'Growing',
    openingsSignal: 455,
    majors: ['Data Science', 'Linguistics', 'Statistics', 'Domain-specific majors'],
    skills: ['Data quality', 'Evaluation design', 'Critical thinking', 'Domain expertise'],
    work: ['Build and review AI datasets', 'Score model outputs against clear rubrics', 'Analyze errors, bias, and reliability'],
    pathway: ['Develop strong language and analytical skills', 'Study data, language, or a specialist domain', 'Learn annotation and evaluation methods', 'Create an AI evaluation portfolio', 'Apply to model quality, data operations, or AI safety teams'],
    relatedRoles: ['AI Trainer', 'Model Evaluator', 'Data Annotation Lead', 'AI Quality Analyst'],
  },
]

export const salaryByCareer: Record<string, SalaryBand> = {
  'software-engineer': { laos: '₭6M–18M / month', asia: 'US$1.2K–5K / month', global: 'US$45K–130K / year' },
  'data-analyst': { laos: '₭5M–14M / month', asia: 'US$1K–4K / month', global: 'US$40K–100K / year' },
  'civil-engineer': { laos: '₭5M–16M / month', asia: 'US$900–3.5K / month', global: 'US$40K–105K / year' },
  'registered-nurse': { laos: '₭3M–9M / month', asia: 'US$700–3K / month', global: 'US$35K–95K / year' },
  'digital-marketer': { laos: '₭4M–13M / month', asia: 'US$800–3.5K / month', global: 'US$38K–95K / year' },
  'environmental-specialist': { laos: '₭5M–15M / month', asia: 'US$900–3.5K / month', global: 'US$40K–100K / year' },
  accountant: { laos: '₭4M–12M / month', asia: 'US$800–3K / month', global: 'US$38K–90K / year' },
  'ux-designer': { laos: '₭5M–16M / month', asia: 'US$1.2K–4.5K / month', global: 'US$45K–120K / year' },
  'ai-engineer': { laos: '₭8M–25M / month', asia: 'US$2K–8K / month', global: 'US$70K–180K / year' },
  'ai-product-manager': { laos: '₭8M–22M / month', asia: 'US$2.5K–9K / month', global: 'US$80K–190K / year' },
  'ai-governance-specialist': { laos: '₭7M–20M / month', asia: 'US$2K–7K / month', global: 'US$65K–160K / year' },
  'conversation-designer': { laos: '₭6M–18M / month', asia: 'US$1.5K–5.5K / month', global: 'US$55K–135K / year' },
  'ai-automation-specialist': { laos: '₭7M–22M / month', asia: 'US$1.8K–6.5K / month', global: 'US$60K–150K / year' },
  'ai-data-curator': { laos: '₭5M–15M / month', asia: 'US$1K–4.5K / month', global: 'US$40K–110K / year' },
}

const technologyEmployers: HiringOrganization[] = [
  { name: 'Lao Telecom', type: 'Laos employer', url: 'https://www.laotel.com/' },
  { name: 'Unitel', type: 'Laos employer', url: 'https://unitel.com.la/' },
  { name: 'Microsoft Careers', type: 'Global employer', url: 'https://jobs.careers.microsoft.com/' },
  { name: 'Google Careers', type: 'Global employer', url: 'https://www.google.com/about/careers/applications/jobs/results/' },
]

export const organizationsByCareer: Record<string, HiringOrganization[]> = {
  'software-engineer': technologyEmployers,
  'data-analyst': [...technologyEmployers.slice(0, 2), { name: 'World Bank Careers', type: 'Development organization', url: 'https://www.worldbank.org/en/about/careers' }],
  'civil-engineer': [{ name: 'Ministry of Public Works and Transport', type: 'Laos public sector', url: 'https://mpwt.gov.la/' }, { name: 'Asian Development Bank', type: 'Regional development', url: 'https://www.adb.org/work-with-us/careers' }, { name: 'UNOPS Jobs', type: 'International development', url: 'https://jobs.unops.org/' }],
  'registered-nurse': [{ name: 'WHO Careers', type: 'Global health', url: 'https://www.who.int/careers' }, { name: 'UNICEF Careers', type: 'International development', url: 'https://www.unicef.org/careers/' }, { name: 'Ministry of Health Laos', type: 'Laos public sector', url: 'https://moh.gov.la/' }],
  'digital-marketer': [{ name: 'BCEL', type: 'Laos employer', url: 'https://www.bcel.com.la/' }, { name: 'Shopee Careers', type: 'Asia employer', url: 'https://careers.shopee.com/' }, { name: 'Grab Careers', type: 'Asia employer', url: 'https://www.grab.careers/' }],
  'environmental-specialist': [{ name: 'UNDP Jobs', type: 'International development', url: 'https://www.undp.org/careers' }, { name: 'WWF Jobs', type: 'Conservation', url: 'https://wwf.panda.org/jobs_wwf/' }, { name: 'Asian Development Bank', type: 'Regional development', url: 'https://www.adb.org/work-with-us/careers' }],
  accountant: [{ name: 'BCEL', type: 'Laos employer', url: 'https://www.bcel.com.la/' }, { name: 'KPMG Careers', type: 'Global professional services', url: 'https://kpmg.com/xx/en/careers.html' }, { name: 'PwC Careers', type: 'Global professional services', url: 'https://www.pwc.com/gx/en/careers.html' }],
  'ux-designer': [{ name: 'Grab Careers', type: 'Asia employer', url: 'https://www.grab.careers/' }, { name: 'Canva Careers', type: 'Global employer', url: 'https://www.canva.com/careers/' }, { name: 'TikTok Careers', type: 'Global employer', url: 'https://careers.tiktok.com/' }],
  'ai-engineer': [...technologyEmployers.slice(2), { name: 'OpenAI Careers', type: 'AI employer', url: 'https://openai.com/careers/' }, { name: 'Grab Careers', type: 'Asia employer', url: 'https://www.grab.careers/' }],
  'ai-product-manager': [{ name: 'Microsoft Careers', type: 'Global employer', url: 'https://jobs.careers.microsoft.com/' }, { name: 'Grab Careers', type: 'Asia employer', url: 'https://www.grab.careers/' }, { name: 'Shopee Careers', type: 'Asia employer', url: 'https://careers.shopee.com/' }],
  'ai-governance-specialist': [{ name: 'Microsoft Careers', type: 'Global employer', url: 'https://jobs.careers.microsoft.com/' }, { name: 'IAPP Job Board', type: 'Privacy and AI governance', url: 'https://jobs.iapp.org/' }, { name: 'OECD Careers', type: 'International policy', url: 'https://www.oecd.org/careers/' }],
  'conversation-designer': [{ name: 'Google Careers', type: 'Global employer', url: 'https://www.google.com/about/careers/applications/jobs/results/' }, { name: 'Microsoft Careers', type: 'Global employer', url: 'https://jobs.careers.microsoft.com/' }, { name: 'Canva Careers', type: 'Global employer', url: 'https://www.canva.com/careers/' }],
  'ai-automation-specialist': [...technologyEmployers, { name: 'Accenture Careers', type: 'Global consulting', url: 'https://www.accenture.com/us-en/careers' }],
  'ai-data-curator': [{ name: 'OpenAI Careers', type: 'AI employer', url: 'https://openai.com/careers/' }, { name: 'Google Careers', type: 'Global employer', url: 'https://www.google.com/about/careers/applications/jobs/results/' }, { name: 'Appen Careers', type: 'AI data services', url: 'https://www.appen.com/careers' }],
}

export const jobSearchPlatforms: HiringOrganization[] = [
  { name: '108.jobs', type: 'Laos job platform', url: 'https://108.jobs/' },
  { name: 'LinkedIn Jobs Laos', type: 'Laos and global jobs', url: 'https://la.linkedin.com/jobs' },
  { name: 'JobStreet', type: 'Asia-Pacific jobs', url: 'https://www.jobstreet.com/' },
  { name: 'JobsDB', type: 'Asia-Pacific jobs', url: 'https://www.jobsdb.com/' },
  { name: 'UNjobs', type: 'UN and development jobs', url: 'https://unjobs.org/' },
]

export function certificatesForSkill(skill: string): CertificateRecommendation[] {
  const normalized = skill.toLowerCase()
  if (/english|communication|writing|data storytelling|conversation writing/.test(normalized)) {
    return [
      { name: 'EF SET English Certificate', provider: 'EF SET', url: 'https://www.efset.org/english-certificate/' },
      { name: 'Communication courses', provider: 'Coursera', url: `https://www.coursera.org/search?query=${encodeURIComponent(skill)}` },
    ]
  }
  if (/ai policy|risk assessment|data privacy|audit|governance|environmental policy/.test(normalized)) {
    return [
      { name: 'AI Governance Professional (AIGP)', provider: 'IAPP', url: 'https://iapp.org/certify/aigp' },
      { name: `${skill} courses`, provider: 'edX', url: `https://www.edx.org/search?q=${encodeURIComponent(skill)}` },
    ]
  }
  if (/machine learning|llm|model|python|cloud|programming|api|sql/.test(normalized)) {
    return [
      { name: 'Machine Learning Engineer – Associate', provider: 'AWS', url: 'https://aws.amazon.com/certification/certified-machine-learning-engineer-associate/' },
      { name: `${skill} credentials`, provider: 'Microsoft Learn', url: `https://learn.microsoft.com/en-us/training/browse/?terms=${encodeURIComponent(skill)}` },
    ]
  }
  if (/excel|analytics|statistics|data|financial reporting|numeracy/.test(normalized)) {
    return [
      { name: 'Google Data Analytics Professional Certificate', provider: 'Coursera', url: 'https://www.coursera.org/professional-certificates/google-data-analytics' },
      { name: 'Power BI Data Analyst', provider: 'Microsoft', url: 'https://learn.microsoft.com/en-us/credentials/certifications/power-bi-data-analyst-associate/' },
    ]
  }
  if (/user research|prototyping|visual design|creativity|interaction/.test(normalized)) {
    return [
      { name: 'Google UX Design Professional Certificate', provider: 'Coursera', url: 'https://www.coursera.org/professional-certificates/google-ux-design' },
      { name: `${skill} courses`, provider: 'Interaction Design Foundation', url: 'https://www.interaction-design.org/courses' },
    ]
  }
  if (/social media|marketing|content|search|campaign/.test(normalized)) {
    return [
      { name: 'Google Ads certifications', provider: 'Google Skillshop', url: 'https://skillshop.withgoogle.com/' },
      { name: 'Digital Marketing certification', provider: 'HubSpot Academy', url: 'https://academy.hubspot.com/courses/digital-marketing' },
    ]
  }
  if (/cad|project planning|safety|field research|gis/.test(normalized)) {
    return [
      { name: `${skill} learning and credentials`, provider: 'Autodesk / Esri / Coursera', url: `https://www.coursera.org/search?query=${encodeURIComponent(skill)}` },
    ]
  }
  if (/patient|clinical|biology/.test(normalized)) {
    return [
      { name: `${skill} courses and certificates`, provider: 'Coursera', url: `https://www.coursera.org/search?query=${encodeURIComponent(skill)}` },
    ]
  }
  return [
    { name: `${skill} courses and certificates`, provider: 'Coursera', url: `https://www.coursera.org/search?query=${encodeURIComponent(skill)}` },
    { name: `${skill} courses`, provider: 'edX', url: `https://www.edx.org/search?q=${encodeURIComponent(skill)}` },
  ]
}
