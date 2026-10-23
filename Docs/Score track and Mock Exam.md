# MASTER PROMPT: DEVELOP A COMPLETE PRODUCT REQUIREMENTS DOCUMENT (PRD) FOR BITDOIN

## ROLE AND RESPONSIBILITIES

Act as a multidisciplinary senior product development team consisting of:

- Principal Product Manager
- EdTech Product Strategist
- Senior Business Analyst
- Education Specialist familiar with Lao PDR
- UX/UI Product Designer
- Software Solutions Architect
- AI/ML and OCR Engineer
- Database Architect
- Data Privacy and Security Specialist
- QA and Test Automation Lead
- Commercial and Monetization Strategist

Your assignment is to produce a **comprehensive, professional, detailed, implementation-ready Product Requirements Document (PRD)** for a new educational feature to be integrated into my existing platform:

**Platform:** Bitdoin  
**Website:** https://bitdoin.store  
**New feature:** Monthly Academic Score Tracking, AI Learning Analysis & Career Guidance  
**Initial market:** Lao People's Democratic Republic  
**Primary language:** Lao, with English support  
**Primary devices:** Android smartphones and responsive web browsers

The PRD must be detailed enough that a product manager, UI/UX designer, full-stack development team, database developer, and AI engineer can use it to plan, estimate, design, build, and test the feature.

Do not produce a high-level overview. Deliver a complete product specification that clearly describes what must be built, why it matters, how users will interact with it, how it integrates with Bitdoin, and how success will be measured.

Use tables, diagrams, process flows, examples, data schemas, and acceptance criteria.

Clearly distinguish:

1. Confirmed requirements from the source concept and existing platform.
2. Proposed product enhancements.
3. Assumptions requiring confirmation.
4. External facts requiring research or verification.

Do not invent details about the existing platform's backend, APIs, authentication implementation, or database.

---

# 1. BUSINESS CONTEXT AND EXISTING PLATFORM

Bitdoin is an existing platform with two publicly presented areas:

**Bitdoin Bookstore**
- Book discovery
- Book price comparison
- Online ordering
- Book delivery

**Bitdoin Academy**
- Practical lessons
- Learning challenges
- Personal learning coach
- Learning progress and habit tracking

Bitdoin presents a shared-account experience across these areas.

The new feature should become part of the Bitdoin educational ecosystem, ideally within Bitdoin Academy, while allowing future integrations with books, learning materials, mock examinations, and other student services.

## Required initial research

Visit and inspect:

- https://bitdoin.store
- Publicly accessible Bitdoin Bookstore pages
- Publicly accessible Bitdoin Academy pages
- Login and account-related pages, where publicly inspectable
- Publicly available navigation, language selection, and user journeys

Document what can actually be verified.

If the platform's source code, architecture, API documentation, or database are unavailable, explicitly identify what must be confirmed with the platform owner.

**Do not assume Bitdoin uses Laravel, React, Next.js, WordPress, or any specific technical stack.**

Develop technology-neutral product requirements first. If appropriate, recommend an architecture conditionally, based on the existing platform's technical environment.

## Integration principles

The new module should:

1. Reuse existing user accounts and authentication where possible.
2. Avoid requiring duplicate registration.
3. Reuse existing design systems, navigation patterns, and language settings.
4. Integrate with existing Academy lessons, challenges, and learning progress.
5. Integrate with relevant books or learning materials in Bitdoin Bookstore.
6. Support future examination preparation services.
7. Avoid duplicating existing capabilities unnecessarily.
8. Work as a cohesive part of Bitdoin rather than an unrelated application.

Explain exactly how this should work from a user's perspective and from an architectural perspective.

---

# 2. PRODUCT VISION

The product vision is:

**Help Lao students understand their academic performance, identify strengths and weaknesses, improve through personalized learning, and explore suitable educational and career opportunities based on evidence, interests, and aspirations.**

Many students already receive monthly academic scores through school score books or similar reporting systems.

However, those records may not provide meaningful longitudinal analysis or personalized guidance.

The proposed feature will transform monthly scores into useful information for students and parents.

The product should answer five fundamental questions:

1. How am I performing academically?
2. Am I improving or declining over time?
3. Which subjects and specific topics should I focus on?
4. What practical steps can help me improve?
5. What university majors or career paths might suit my interests, strengths, and future goals?

The product must not treat examination scores as the sole measure of intelligence, talent, potential, or future success.

---

# 3. TARGET USERS AND PERSONAS

Identify and fully define the target user segments.

At minimum, include:

### 3.1 Secondary school students

Primary users, particularly Grades 10–12 in Lao PDR.

They should be able to:
- Create a personal academic profile.
- Enter monthly academic scores.
- Upload or photograph score-book pages.
- Review academic performance over time.
- Receive helpful analysis.
- Complete recommended learning exercises.
- Explore possible majors and careers.

Consider supporting earlier secondary grades where appropriate.

### 3.2 Parents or guardians

Parents should be able to:
- Link to a child's account securely.
- View authorized academic progress information.
- Understand academic changes.
- View actionable recommendations.
- Receive periodic progress summaries.
- Manage appropriate learning-related purchases.

### 3.3 Teachers and tutors

A potential future user group.

They may:
- Support students academically.
- Review progress with appropriate authorization.
- Recommend exercises.
- Create or curate educational content.

Teacher access must not automatically grant visibility into every student's private information.

### 3.4 Platform administrators

Administrators need tools to manage:
- Academic subjects and curricula
- School years and grading configurations
- Users and permissions
- OCR processing
- Learning materials
- AI-generated recommendations
- Career and university information
- Subscription entitlements
- Reporting and system monitoring

### 3.5 Optional future stakeholders

Evaluate whether schools, university advisors, or education partners should have restricted access in later phases.

For every persona provide:

- Background
- Needs
- Primary goals
- Motivations
- Challenges
- Digital literacy
- Device and connectivity constraints
- Typical user journey
- Permissions
- Free versus premium feature access

---

# 4. PRODUCT MODULES

Develop detailed specifications for the following modules.

## MODULE A — STUDENT ONBOARDING AND ACADEMIC PROFILE

Students should be able to create an academic profile linked to their existing Bitdoin account.

Proposed information:

- Preferred name or display name
- Grade level
- Academic year
- School
- Province
- District (optional)
- Current subjects
- Academic goals
- Preferred language
- Subjects of interest
- Future university or career interests, if known

Define which fields are mandatory, optional, or unnecessary.

Avoid excessive collection of children's personal information.

Specify how student profiles change when students advance to the next grade or change schools.

Consider historical records, grade promotion, school transfers, and subject changes.

Include detailed UI fields, validation rules, business rules, and acceptance criteria.

## MODULE B — MONTHLY ACADEMIC SCORE ENTRY

This is the foundational feature.

Students need to record academic scores for every school month.

### Manual entry

Develop a fast, mobile-friendly score-entry interface.

Requirements:

- Select academic year.
- Select school term or semester.
- Select month or reporting period.
- Select subjects.
- Enter scores.
- Save progress as a draft.
- Edit previously entered scores.
- Confirm and submit.
- Review historical entries.

Support scores entered in a school-specific grading scale.

For example, some schools may use scores out of 10; others may use different assessment formats.

Do not assume all Lao schools use identical grading standards.

Design a configurable grading system.

### Example interface

Academic year: 2026–2027  
Grade: 11  
Reporting period: October 2026

| Subject | Example score |
|---|---|
| Mathematics | 7 |
| Physics | 6 |
| Chemistry | 8 |
| Biology | 9 |
| Lao Language | 8 |
| English | 7 |

These scores are illustrative, not official records.

### Required business logic

Specify:

- Valid score ranges
- Decimal handling
- Missing scores
- Not-applicable subjects
- Duplicate entries
- Corrections
- Audit history
- Unsubmitted drafts
- Different scoring scales
- Term and annual summaries
- Transferring academic records between school years
- Score verification status
- Data source identification

Distinguish scores self-reported by students from scores verified by an authorized school.

Define the complete manual-entry user flow.

## MODULE C — PHOTO UPLOAD AND AI OCR

Students should be able to take a photograph of their school score book and have the system extract the relevant results.

This must remain optional. Manual entry must be an equally supported experience.

### Functional requirements

1. Open the phone camera or file picker.
2. Photograph or select score-book images.
3. Show a preview.
4. Allow crop, rotate, and retake.
5. Check image quality.
6. Extract subject names, scores, academic periods, and relevant metadata.
7. Match extracted subjects to the platform's subject catalog.
8. Display extracted values for review.
9. Highlight uncertain fields.
10. Allow corrections.
11. Require explicit confirmation.
12. Save confirmed results only after validation.

### OCR challenges

Account for:

- Lao handwriting
- Lao numerals and Arabic numerals
- Mixed Lao and English
- Different score-book designs
- Handwritten tables
- Crossed-out scores
- Blurry photographs
- Poor lighting
- Multiple months in one image
- Multiple students in one document
- Duplicate uploads
- Incorrect subject recognition

### AI architecture

Compare:

- Traditional OCR
- Vision-language models
- Hybrid extraction pipelines
- Template-based extraction

Recommend an appropriate staged solution, considering Lao-language performance, cost, latency, privacy, and maintenance.

Define structured output schemas for extracted data.

Specify confidence scoring, low-confidence field handling, processing failures, retries, review logs, and human correction workflows.

Never silently save uncertain OCR output as verified grades.

Provide an OCR quality-assurance plan and realistic test methodology using score-book samples collected with appropriate permission.

## MODULE D — ACADEMIC PERFORMANCE DASHBOARD

Design a modern, student-friendly dashboard.

The dashboard should show:

- Latest academic period
- Average score
- Subject performance
- Changes from previous months
- Stronger subjects
- Subjects needing attention
- Academic progress over time
- Learning activity
- Recommended next actions

### Visualizations

Specify appropriate charts including:

1. Monthly average-score trend
2. Per-subject line charts
3. Subject-comparison bar charts
4. Performance change indicators
5. Optional goal-progress indicators
6. Year-over-year comparisons when valid

For each visualization define:

- Inputs
- Calculation logic
- Labeling
- Empty states
- Mobile presentation
- Accessibility requirements
- Interpretation rules

Avoid misleading comparisons between incompatible grade scales.

Do not interpret one month's score change as proof of improved or declining ability.

Provide desktop and mobile wireframe descriptions.

## MODULE E — STRENGTHS AND WEAKNESSES ANALYSIS

The platform should analyze academic performance using recorded scores and, where available, diagnostic quizzes.

### Score-based analysis

Identify:

- Consistently stronger subjects
- Consistently lower-scoring subjects
- Improving trends
- Declining trends
- Volatile performance
- Missing or insufficient evidence

### Diagnostic quiz integration

Recognize that monthly scores alone cannot reliably identify specific knowledge gaps.

Create a design for short topic-level quizzes that help diagnose learning needs more precisely.

Example:

A student has a relatively low mathematics score.

The system recommends a short mathematics diagnostic quiz.

The results indicate difficulty with algebra but stronger performance in geometry.

The system then recommends relevant learning content.

### Required analysis specifications

Define:

- Statistical methods
- Trend calculations
- Minimum data thresholds
- Treatment of incomplete data
- Grade-scale normalization where defensible
- Reliability indicators
- Confidence levels
- Limitations of cross-school comparisons
- Rules for generating explanations
- Handling of conflicting evidence

Distinguish actual performance observations from inferred causes.

Avoid presenting guesses about intelligence, motivation, personality, or learning disorders as facts.

Include worked examples and pseudocode for the calculation engine.

## MODULE F — PERSONALIZED LEARNING RECOMMENDATIONS

Connect score tracking with learning improvement.

The system should recommend:

- Subjects needing attention
- Topic-level exercises
- Academy lessons
- Learning challenges
- Study routines
- Mock exams, when available
- Relevant educational books in Bitdoin Bookstore

Example:

A student shows repeated difficulties with mathematics.

The system could suggest:

- Take a short diagnostic quiz.
- Practice a specific weak topic.
- Follow a seven-day study plan.
- Complete an Academy lesson.
- Retake a practice quiz.
- Review improvement.

### Recommendation requirements

Define:

- Rules-based recommendations for the MVP
- Potential AI enhancements
- Content metadata and subject tagging
- Learning objectives
- Difficulty levels
- Prerequisites
- Student preference signals
- Recommendation ranking
- Feedback collection
- Progress measurement
- Handling unavailable content
- Avoiding repetitive recommendations

Do not recommend books or courses that do not exist in the Bitdoin catalog.

Design the integration so recommendations reference real catalog items through appropriate internal identifiers or APIs.

## MODULE G — AI ACADEMIC ASSISTANT

Propose a conversational assistant for students.

The assistant should be able to:

- Explain academic trends in simple Lao.
- Describe why a subject was flagged.
- Recommend learning activities.
- Explain quiz mistakes.
- Help create manageable study plans.
- Encourage realistic academic improvement.
- Answer questions about the student's own records.

Example questions:

- Why did my mathematics average fall?
- Which subject should I study this week?
- Am I improving in English?
- What should I practice before the next exam?

### Technical specifications

Define:

- Retrieval of authorized student data
- Context construction
- Prompt templates
- Model selection criteria
- Cost controls
- Response caching
- Lao-language quality assurance
- Hallucination mitigation
- Safety filters
- Auditability
- User feedback
- Fallback behaviors

The assistant must not fabricate academic data or claim certainty where evidence is insufficient.

Design safeguards appropriate for minors.

## MODULE H — STUDY PLANNER AND LEARNING GOALS

Build a personalized study-planning experience.

Students should be able to:

- Set target scores.
- Select priority subjects.
- Set realistic study commitments.
- Receive weekly study suggestions.
- Complete tasks.
- Review progress.
- Modify their plans.

### Example

Goal: Improve Mathematics from 6/10 to 8/10 over an appropriate period.

The system suggests short study sessions and topic-level practice.

This is a goal, not a guaranteed outcome.

Define:

- Study scheduling rules
- Goal feasibility checks
- Task completion tracking
- Progress feedback
- Missed-task handling
- Reminder preferences
- Motivation features
- Integration with existing Bitdoin learning challenges

Avoid coercive notifications, unhealthy competitive pressure, or punitive streak systems.

## MODULE I — PARENT OR GUARDIAN DASHBOARD

Provide an optional family feature for authorized parents or guardians.

### Functional requirements

- Parent account linking
- Child account authorization
- Consent management
- Visibility controls
- Multiple children, where supported
- Weekly or monthly progress reports
- Academic trend charts
- Recommendations for supporting learning
- Notification preferences
- Premium-report access

### Parent report contents

A report could contain:

1. Reporting period
2. Subjects recorded
3. Score changes
4. Stronger subjects
5. Areas needing support
6. Completed learning activities
7. Suggested next steps

Reports should encourage constructive support, not punitive comparisons.

Define how parent and student permissions interact, particularly when a student becomes an adult.

Include procedures for incorrect guardian links, disputes, and account recovery.

## MODULE J — MAJOR AND CAREER GUIDANCE

This is a strategically important premium feature.

The platform should help students explore potential university majors and career pathways.

### Input data

Potential inputs include:

- Academic performance over time
- Diagnostic quiz results
- Stronger subjects
- Student interests
- Preferred activities
- Self-reported goals
- Preferred working environments
- Location preferences
- Financial or study constraints, only when voluntarily supplied and relevant

### Student interest questionnaire

Design a short, age-appropriate questionnaire.

Specify:

- Questions
- Answer formats
- Scoring or interpretation approach
- Validation requirements
- How answers influence recommendations
- Frequency of reassessment

Avoid presenting a brief questionnaire as a validated psychometric instrument unless it actually is one.

### Career guidance outputs

Present several suitable options instead of one definitive career recommendation.

For every suggested major or career, describe:

- Major or career name
- What the work involves
- Why it may be relevant to the student
- Important skills
- Typical educational pathway
- Related university programs
- Potential entrance requirements
- Practical next steps
- Sources and dates of verified information

### Local relevance

Research and document university programs and career information relevant to Lao PDR.

Potential institutions for investigation include:

- National University of Laos
- University of Health Sciences
- Souphanouvong University
- Savannakhet University
- Champasak University
- Other relevant public or private institutions

Do not invent degree programs, admission criteria, cutoff scores, or employment prospects.

Information must be sourced, dated, and periodically reviewed.

Where reliable salary or employment data are unavailable, disclose that limitation.

### Responsible recommendation design

Requirements:

- Never use grades alone to determine career options.
- Never make deterministic statements about student potential.
- Avoid gender, ethnic, geographic, or socioeconomic stereotyping.
- Show multiple alternatives.
- Explain recommendation factors transparently.
- Allow students to express interest in paths outside their strongest subjects.
- Offer information about the effort and preparation required.
- Allow recommendations to change as new evidence becomes available.
- Recommend consultation with parents, teachers, or career counselors when appropriate.

Design both a free career exploration experience and a more detailed premium career report.

## MODULE K — UNIVERSITY AND EDUCATIONAL PATHWAYS DATABASE

Design a structured database of:

- Universities
- Faculties
- Study programs
- Degrees
- Admission requirements
- Entrance examinations
- Tuition information when verified
- Study duration
- Locations
- Official websites
- Application deadlines
- Scholarships
- Related career opportunities

Provide the database schema and the administrative workflow for creating, reviewing, updating, archiving, and sourcing records.

Every time-sensitive field should include:

- Source
- Source URL
- Verification date
- Applicable academic year
- Publication status
- Expiration or review date where applicable

Do not treat outdated information as current.

## MODULE L — MOCK EXAMINATION INTEGRATION

Design a future-ready integration with examination preparation tools.

Potential capabilities:

- Grade 12 mock examinations
- Group A and Group B examination preparation, subject to current official structures
- Timed tests
- Subject scores
- Topic-level analysis
- Weak-topic practice
- Progress tracking
- Relevant Academy lessons

Specify how school score history, quiz outcomes, and mock-exam performance contribute separately to the student's learning profile.

Never combine incompatible scores into a single metric without justified methodology.

Exam preparation content must be original or properly licensed.

## MODULE M — NOTIFICATIONS AND ENGAGEMENT

Design a notification system for:

- Monthly score-entry reminders
- Completed reports
- New study recommendations
- Learning goals
- Optional parent summaries
- Upcoming academic deadlines
- Subscription expiration

Compare possible channels:

- In-app
- Email
- Web push
- SMS
- Messaging platform integrations where supported

Define an MVP channel strategy.

Include consent, quiet hours, notification frequency caps, unsubscribe options, and child-safe messaging.

## MODULE N — ADMINISTRATION AND CONTENT MANAGEMENT

Create an admin module for:

- Subject management
- Grading-scale configuration
- School and academic-year settings
- Student account oversight
- OCR quality monitoring
- Quiz and lesson metadata
- Career taxonomy
- University information
- AI recommendation review
- Reports
- Subscription plans
- Customer support
- Audit logs

Specify roles such as:

- Super Administrator
- Education Content Manager
- Academic Reviewer
- Career Content Reviewer
- Support Agent
- Financial Administrator

Define an explicit permission matrix and approval workflows.

---

# 5. UX/UI DESIGN REQUIREMENTS

Develop a complete user experience specification.

## Design direction

The interface should be:

- Modern
- Friendly
- Encouraging
- Trustworthy
- Easy for teenagers to understand
- Mobile-first
- Consistent with Bitdoin branding
- Visually clear
- Suitable for Lao script
- Accessible

Avoid overly childish designs for older secondary students.

### Required screens

Describe at least:

1. Feature landing page
2. Student onboarding
3. Academic profile
4. Main academic dashboard
5. Manual score entry
6. Score-book photo capture
7. OCR processing
8. OCR confirmation
9. Monthly report
10. Subject analysis
11. Diagnostic quiz
12. Learning recommendations
13. Study planner
14. AI academic assistant
15. Career-interest questionnaire
16. Career recommendation results
17. Major detail page
18. University program detail page
19. Parent dashboard
20. Guardian linking and consent
21. Premium upgrade screen
22. Academic history
23. Account and privacy settings
24. Relevant administration screens

For each screen provide:

- Screen purpose
- User role
- Components
- Field descriptions
- Actions
- Navigation
- Empty states
- Error states
- Loading states
- Mobile responsiveness
- Accessibility
- Acceptance criteria

### Deliverables

Include:

- Sitemap
- Navigation architecture
- Primary user journeys
- Wireframe descriptions
- Text-based low-fidelity wireframes
- Component inventory
- Design-system guidance
- Lao and English localization requirements

Use Mermaid diagrams where appropriate.

---

# 6. COMPLETE USER STORIES AND ACCEPTANCE CRITERIA

Organize requirements by epic.

Use a table with:

| ID | Epic | User story | Priority | Dependencies | Acceptance criteria |
|---|---|---|---|---|---|

Use stable requirement identifiers, such as:

- AUTH-001
- PROFILE-001
- SCORE-001
- OCR-001
- DASH-001
- ANALYSIS-001
- LEARN-001
- AI-001
- PARENT-001
- CAREER-001
- ADMIN-001
- BILLING-001

For each requirement:

1. State the expected behavior.
2. Define its inputs and outputs.
3. Define validation rules.
4. Define edge cases.
5. Describe errors and fallbacks.
6. Provide testable acceptance criteria using Given/When/Then where suitable.

Avoid generic phrases such as "system should be user-friendly" without measurable requirements.

---

# 7. SYSTEM ARCHITECTURE AND BITDOIN INTEGRATION

Design an architecture that adds the new feature without unnecessarily rebuilding the existing platform.

## Evaluate integration approaches

Compare:

1. Integrated module within existing Academy backend
2. Modular monolith
3. Separate service using existing authentication
4. Independently deployed service with API integration

Recommend the simplest maintainable approach compatible with the verified architecture.

### Required architecture analysis

Cover:

- Existing authentication integration
- Role-based access control
- Student and guardian relationships
- Database ownership
- API architecture
- AI service integration
- OCR processing workers
- File and image storage
- Background job processing
- Report generation
- Notifications
- Existing Academy content integration
- Bookstore recommendation integration
- Subscription and payment integration
- Logging and monitoring

Explain when an event-driven approach is justified and when synchronous APIs are sufficient.

Provide Mermaid diagrams for:

- System context
- Component architecture
- Monthly score workflow
- OCR workflow
- Academic analysis pipeline
- Career recommendation pipeline
- Parent authorization flow

Identify architecture decisions that depend on access to Bitdoin's actual codebase.

---

# 8. DATABASE DESIGN

Develop an implementation-oriented relational data model.

Include tables or equivalent entities for:

- User identity references
- Student profiles
- Parent-student relationships
- Schools
- Academic years
- Terms
- Reporting periods
- Grades
- Subjects
- Subject aliases
- Grading scales
- Student subject enrollment
- Monthly score records
- Score revision history
- Score-book uploads
- OCR processing jobs
- OCR extracted fields
- OCR confirmations
- Academic analysis snapshots
- Learning goals
- Study plans
- Study tasks
- Quizzes
- Quiz attempts
- Topic mastery estimates
- Learning recommendations
- Student interests
- Career taxonomy
- Career recommendations
- Universities
- Academic programs
- Admission requirements
- Scholarships
- Parent reports
- Notifications
- Subscription entitlements
- Consent records
- Audit logs

### Database deliverables

For each important table provide:

- Table name
- Purpose
- Fields
- Field data types
- Primary key
- Foreign keys
- Nullable rules
- Indexes
- Unique constraints
- Relationships
- Data retention considerations

Include a Mermaid ER diagram.

Address:

- Historical integrity
- Multiple grading systems
- Score updates
- OCR provenance
- Source verification
- Consent history
- School changes
- Grade promotion
- Multi-tenant isolation, if needed
- Data deletion and export

Avoid creating a second independent user-account database if the existing Bitdoin identity system can be reused safely.

---

# 9. API SPECIFICATION

Create a proposed REST API specification or recommend an alternative consistent with the existing platform.

For key endpoints specify:

- HTTP method
- Route
- Purpose
- Authentication
- Authorization
- Request body
- Response body
- Validation
- Errors
- Rate limits
- Idempotency where relevant

Cover:

- Student profile operations
- Score CRUD
- Academic periods
- OCR uploads and job status
- OCR confirmation
- Performance analytics
- Quiz submissions
- Study plans
- Learning recommendations
- Career questionnaire
- Career reports
- Guardian linking
- Parent reports
- University search
- Subscription entitlements

Include representative JSON request/response examples and error contracts.

Ensure that users cannot access other students' records by manipulating identifiers.

---

# 10. AI/ML FUNCTIONAL SPECIFICATIONS

Treat AI as a supporting capability, not an excuse for undefined logic.

Clearly identify what should be:

- Deterministic software logic
- Statistical analysis
- Rules-based recommendation
- Machine-learning inference
- Generative AI

## Academic analysis engine

Specify formulas or algorithms for:

- Monthly average
- Subject mean
- Change over time
- Rolling average
- Trend interpretation
- Score variability
- Missing data
- Normalization where valid
- Data sufficiency

## Career recommendation engine

Propose an explainable hybrid method using:

- Student interests
- Academic strengths
- Diagnostic evidence
- Program requirements
- Explicit student preferences
- Verified university and career data

Specify how to avoid unvalidated numerical suitability scores.

## AI evaluation

Include:

- Test datasets
- Accuracy metrics
- Lao-language evaluation
- Fairness evaluation
- Hallucination checks
- Human review protocols
- Cost per interaction
- Latency targets
- Model versioning
- Monitoring
- Rollback strategies

Provide example AI prompts and structured outputs for academic feedback and career explanation.

---

# 11. LOCALIZATION AND LAO EDUCATION CONTEXT

The PRD must be appropriate for Lao PDR.

Investigate and document:

- Secondary school grade structure
- School academic calendars
- Subjects
- Monthly grading practices
- Score-book variations
- Local university admission requirements
- Lao-language terminology
- Student internet access constraints
- Common payment options
- Relevant education data sources

Separate verified facts from assumptions and school-specific configurations.

Support:

- Lao Unicode text
- Lao typography
- Consistent numeric formatting
- Lao and English subject labels
- School-specific subject aliases
- Configurable dates and academic periods

Prefer simple Lao language for student-facing explanations.

Include examples of key interface translations in Lao and English.

---

# 12. DATA PRIVACY, CHILD SAFETY, AND SECURITY

The platform may process sensitive educational information about minors.

Treat privacy and child safety as core product requirements.

Research the applicable Lao legal framework, including the Law on Electronic Data Protection and any relevant updated legislation.

Do not invent a statutory age of digital consent. Identify issues requiring qualified Lao legal review.

### Required controls

- Data minimization
- Clear privacy notices
- Appropriate guardian consent and authorization workflows
- Secure account linking
- Encrypted transport
- Secure storage
- Role-based authorization
- Data access logging
- Retention and deletion policies
- Export and correction workflows
- Secure image uploads
- AI-provider data processing controls
- Vendor assessments
- Appropriate cross-border data handling
- Breach response
- Backup and recovery
- Abuse reporting
- AI safety for minors

### Threat modeling

Analyze:

- Unauthorized parent or guardian account linking
- Exposure of academic records
- Student impersonation
- Manipulated score images
- Fraudulent grades
- Mass scraping of student data
- Prompt injection through uploaded content
- AI disclosure of another student's records
- Excessive collection of personal data
- Insecure cloud file storage

Provide a risk matrix and mitigation plan.

---

# 13. MONETIZATION AND SUBSCRIPTIONS

Develop a sustainable freemium strategy.

The source concept recommends keeping basic score tracking free while charging for deeper insights.

Use that as the starting point, but evaluate alternatives.

### Proposed free tier

Potentially:

- Student academic profile
- Manual monthly score tracking
- Basic dashboard
- Historical scores
- Basic trend charts
- Limited learning recommendations

### Potential premium tier

- Detailed academic analysis
- Advanced study plans
- Expanded AI assistance
- Parent progress reports
- Detailed major and career reports
- Premium mock exams
- Expanded OCR allowance

Evaluate whether OCR should have a small free allowance or remain a free convenience feature, taking into account operational cost.

### Commercial requirements

Provide:

- Tier-comparison table
- Candidate LAK prices for testing, not invented market facts
- Monthly and annual options
- Optional one-time career report
- School or family bundles
- Free-trial strategy
- Entitlement logic
- Pricing experiments
- AI unit economics
- Revenue model
- Conversion funnel

Investigate current support for local Lao payment methods, such as BCEL One/QR integrations, before recommending specific payment-provider APIs.

Explain how the new paid services could coexist with existing Bitdoin commerce or billing infrastructure.

---

# 14. ANALYTICS AND SUCCESS METRICS

Develop a product analytics framework.

### Acquisition metrics

- New student profiles
- Onboarding completion
- First score-entry completion
- Sources of acquisition

### Engagement metrics

- Monthly active students
- Monthly score-entry completion
- Returning users
- Dashboard usage
- Quiz completion
- Study-plan activity
- Parent report engagement

### Learning outcome metrics

- Changes in assessment performance
- Topic-level quiz improvements
- Learning task completion
- Student-reported usefulness

Do not claim that correlation proves learning improvement caused by the platform.

### Commercial metrics

- Free-to-paid conversion
- Revenue per paying user
- Subscription retention
- Career report purchases
- OCR processing cost
- AI cost per active student

For each metric specify:

- Definition
- Formula
- Instrumentation event
- Segment
- Reporting cadence
- Baseline requirements
- Proposed target-setting method

Develop an event taxonomy for implementation.

---

# 15. NON-FUNCTIONAL REQUIREMENTS

Specify measurable requirements for:

- Performance
- Accessibility
- Availability
- Scalability
- Reliability
- Security
- Browser compatibility
- Android mobile usability
- Slow-network behavior
- Low-bandwidth image uploads
- Localization
- Maintainability
- Observability
- Data backup
- Recovery
- Cost efficiency

Recommend performance budgets and service-level objectives, distinguishing proposed targets from verified infrastructure capabilities.

Design offline-friendly or draft-saving behavior where feasible.

---

# 16. EDGE CASES AND FAILURE SCENARIOS

Create a detailed edge-case matrix.

Include:

- Student misses a month.
- Student uploads the wrong image.
- OCR cannot read a subject.
- OCR recognizes a wrong score.
- Duplicate monthly records exist.
- A school changes grading scales.
- A student changes schools.
- A student repeats a grade.
- Subject names differ between schools.
- Internet connection fails during entry.
- A parent loses authorization.
- A user requests deletion.
- University admission information expires.
- AI services are unavailable.
- Career recommendations have insufficient data.
- Premium access expires.
- Student records have inconsistent dates.
- Source images contain records for multiple people.

For each case specify expected behavior, user messaging, recovery, and test coverage.

---

# 17. DEVELOPMENT ROADMAP AND MVP DEFINITION

Do not attempt to build every advanced capability in the first release.

Develop a phased roadmap.

### Phase 0 — Research and validation

- Review Bitdoin architecture
- Interview students and parents
- Understand Lao score-book formats
- Confirm grading rules
- Validate perceived value
- Define privacy requirements
- Test sample records

### Phase 1 — Core MVP

Recommended scope:

- Existing account integration
- Student academic profile
- Manual monthly score entry
- Configurable subjects and grading scales
- Academic history
- Basic trend dashboard
- Basic privacy controls
- Essential admin configuration

### Phase 2 — AI-supported score entry and analysis

- Photo uploads
- OCR extraction
- Confirmation workflow
- Academic analysis
- Diagnostic quiz integration
- Personalized recommendations

### Phase 3 — Parent and premium features

- Guardian linking
- Parent dashboard
- Reports
- Premium entitlements
- Notifications

### Phase 4 — Career guidance

- Interest questionnaire
- Verified education pathways database
- Multiple career recommendations
- AI-generated explanations
- Career reports

### Phase 5 — Examination and ecosystem expansion

- Mock examinations
- Deeper Academy integration
- Bookstore recommendations
- School or teacher tools
- Advanced analytics

Review and refine this sequence based on actual implementation dependencies, costs, and research evidence.

For every phase provide:

- Objectives
- Features
- Dependencies
- Deliverables
- Team roles
- Estimated effort as a range
- Risks
- Exit criteria
- What is explicitly out of scope

Do not claim precise dates or costs without enough information.

---

# 18. ENGINEERING IMPLEMENTATION PLAN

Produce a work breakdown structure.

Organize tasks into:

- Product management
- UX/UI
- Frontend
- Backend
- Database
- OCR/AI
- Content and research
- Security
- QA
- DevOps
- Analytics
- Release management

For each task provide:

| Task ID | Task | Description | Priority | Dependencies | Estimate | Acceptance criteria |
|---|---|---|---|---|---|---|

Include an MVP backlog sufficiently detailed to be transferred into Jira, Linear, GitHub Issues, or another project management tool.

Use a consistent estimation scale and clearly state assumptions.

---

# 19. QA AND TESTING PLAN

Create a complete testing strategy covering:

- Unit testing
- API testing
- Integration testing
- User acceptance testing
- Localization testing
- OCR accuracy testing
- AI-output evaluation
- Security testing
- Accessibility testing
- Performance testing
- Regression testing
- Data migration testing

Include detailed test scenarios and acceptance criteria.

Develop specific quality gates for:

1. Score calculation accuracy
2. Data isolation
3. OCR confirmation
4. Parent authorization
5. AI-generated feedback accuracy
6. Career information provenance
7. Subscription entitlement enforcement

Include representative UAT scripts for students, parents, and administrators.

---

# 20. RISKS, DEPENDENCIES, AND OPEN QUESTIONS

Develop a prioritized register containing:

- Risk ID
- Risk description
- Category
- Likelihood
- Impact
- Mitigation
- Owner
- Decision required

Consider:

- Incorrect score extraction
- Variability in school grading
- Insufficient academic data
- Poor AI Lao-language responses
- Misleading career recommendations
- Outdated university information
- Privacy risks involving minors
- Low willingness to pay
- AI operating cost
- Limited content availability
- Difficult integration with the existing codebase

Prepare a separate decision register.

Identify which decisions the owner of Bitdoin must make before development starts.

---

# 21. REQUIRED FINAL PRD STRUCTURE

Produce the final document in the following order:

1. Document Control and Version History
2. Executive Summary
3. Product Vision
4. Business Context and Opportunity
5. Existing Bitdoin Platform Assessment
6. Problem Statement
7. Product Objectives
8. Success Metrics
9. Stakeholder Analysis
10. Target Users and Personas
11. Scope and Non-Scope
12. Product Principles
13. Feature and Epic Overview
14. Detailed Functional Requirements
15. User Stories and Acceptance Criteria
16. End-to-End User Journeys
17. Information Architecture
18. UX/UI Screen Specifications
19. Business Rules and Calculations
20. Academic Analysis Methodology
21. OCR and AI Requirements
22. Career Guidance Methodology
23. Lao Education and Localization Requirements
24. System Architecture
25. Bitdoin Integration Architecture
26. Database Schema and ER Diagram
27. API Requirements
28. Role and Permission Matrix
29. Security, Privacy, and Child Safety
30. Monetization and Entitlements
31. Administration and Content Management
32. Analytics and Reporting
33. Non-Functional Requirements
34. Edge Cases and Failure Handling
35. Testing and Acceptance Strategy
36. MVP Specification
37. Phased Development Roadmap
38. Engineering Work Breakdown Structure
39. Dependencies and Risks
40. Assumptions and Open Decisions
41. Research Sources
42. Appendices: Sample Screens, JSON, Diagrams, and Reports

---

# 22. DOCUMENT QUALITY REQUIREMENTS

The PRD must be:

- Comprehensive and technically actionable.
- Written in professional English.
- Structured for easy review by non-technical stakeholders and developers.
- Specific to Bitdoin and Lao PDR.
- Consistent with the existing Bitdoin ecosystem.
- Clear about confirmed facts versus proposed decisions.
- Detailed enough for software development planning.
- Explicit about child safety and academic fairness.
- Prioritized for staged delivery.

Use requirement IDs and cross-reference them consistently.

For major features, include both user-facing requirements and corresponding backend requirements.

Provide worked examples for calculations and sample data.

Where external research is used, cite authoritative sources with URLs and publication or verification dates.

Where facts cannot be verified, label them **Unverified — requires confirmation**.

Avoid duplicated requirements, vague statements, and unnecessary complexity.

**Length:** Produce a genuinely detailed PRD. Do not impose an arbitrary short page limit. Favor completeness, specificity, and actionable requirements over repetition.

---

# 23. FINAL OUTPUT AND DELIVERABLES

Produce:

**Deliverable A — Full PRD**
A complete professional Product Requirements Document.

**Deliverable B — MVP Requirements Matrix**
Prioritized requirements with acceptance criteria and dependencies.

**Deliverable C — UX/UI Specification**
Detailed screen inventory, wireframe descriptions, and user journeys.

**Deliverable D — Technical Architecture**
System diagrams, integration design, database design, and API specifications.

**Deliverable E — Development Roadmap**
Phases, estimated effort, dependencies, and release criteria.

**Deliverable F — Decisions and Assumptions Register**
Unresolved questions, risks, and items requiring the platform owner's approval.

If artifact creation is supported, make the full PRD available as an editable Word document and optionally a PDF. Provide the MVP backlog in an editable spreadsheet where possible.

If file generation is unavailable, deliver complete structured Markdown without dropping sections.

## EXECUTION INSTRUCTIONS

First, study the supplied concept document, then inspect the public Bitdoin website, and identify confirmed integration constraints and missing technical information.

Next, develop the PRD, explicitly labeling assumptions and recommendations.

Do not stop after providing an outline.

Do not replace the detailed requirements with a generic feature checklist.

If the output exceeds one response, continue logically in numbered parts without omitting sections.

**The final result should be a usable specification for adding Monthly Academic Score Tracking, AI Learning Analysis, and Career Guidance to Bitdoin Academy and connecting it with the wider Bitdoin platform.**