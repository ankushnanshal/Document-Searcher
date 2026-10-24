const ROLES = {
  ADMIN: 'admin',
  DIRECTOR: 'director',
  DEAN: 'dean',
  HOD: 'hod',
  PROFESSOR: 'professor',
  ASSISTANT_PROFESSOR: 'assistant_professor',
  STUDENT: 'student'
};

const DEPARTMENTS = {
  CSE: 'CSE',
  ECE: 'ECE',
  ME: 'ME',
  CE: 'CE',
  EE: 'EE',
  CHE: 'CHE'
};

const CSE_BRANCHES = ['CSE-R', 'CSE-A.I', 'CSE-SF'];

const ALL_BRANCHES = [
  'CSE-R', 'CSE-A.I', 'CSE-SF',
  'ECE', 'EE', 'ME', 'CE', 'CHE',
  'All Branches'
];

const PERMISSIONS = {
  CREATE_DOCUMENT: 'create_document',
  EDIT_DOCUMENT: 'edit_document',
  DELETE_DOCUMENT: 'delete_document',
  VIEW_DOCUMENTS: 'view_documents',
  APPROVE_DOCUMENT: 'approve_document',
  MANAGE_USERS: 'manage_users',
  MANAGE_DEPARTMENT: 'manage_department',
  SUBMIT_DOCUMENT: 'submit_document',
  MANAGE_DRAFTS: 'manage_drafts'
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.DELETE_DOCUMENT,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENT,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_DEPARTMENT,
    PERMISSIONS.SUBMIT_DOCUMENT,
    PERMISSIONS.MANAGE_DRAFTS
  ],
  [ROLES.DIRECTOR]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.DELETE_DOCUMENT,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENT,
    PERMISSIONS.MANAGE_DEPARTMENT,
    PERMISSIONS.SUBMIT_DOCUMENT,
    PERMISSIONS.MANAGE_DRAFTS
  ],
  [ROLES.DEAN]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.DELETE_DOCUMENT,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENT,
    PERMISSIONS.MANAGE_DEPARTMENT,
    PERMISSIONS.SUBMIT_DOCUMENT,
    PERMISSIONS.MANAGE_DRAFTS
  ],
  [ROLES.HOD]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.DELETE_DOCUMENT,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENT,
    PERMISSIONS.MANAGE_DEPARTMENT,
    PERMISSIONS.SUBMIT_DOCUMENT,
    PERMISSIONS.MANAGE_DRAFTS
  ],
  [ROLES.PROFESSOR]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.DELETE_DOCUMENT,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENT,
    PERMISSIONS.MANAGE_DEPARTMENT,
    PERMISSIONS.SUBMIT_DOCUMENT,
    PERMISSIONS.MANAGE_DRAFTS
  ],
  [ROLES.ASSISTANT_PROFESSOR]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.DELETE_DOCUMENT,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.SUBMIT_DOCUMENT,
    PERMISSIONS.MANAGE_DRAFTS
  ],
  [ROLES.STUDENT]: [
    PERMISSIONS.VIEW_DOCUMENTS
  ]
};

const FACULTY_ROLES = [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.DEAN, ROLES.HOD, ROLES.PROFESSOR, ROLES.ASSISTANT_PROFESSOR];
const COLLEGE_WIDE_ROLES = [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.DEAN];
const DIRECT_DELETE_ROLES = [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.DEAN];
const REQUEST_DELETE_ROLES = [ROLES.HOD, ROLES.PROFESSOR, ROLES.ASSISTANT_PROFESSOR];

const APPROVAL_CHAIN = {
  [ROLES.ASSISTANT_PROFESSOR]: [ROLES.PROFESSOR, ROLES.HOD, ROLES.DEAN, ROLES.DIRECTOR],
  [ROLES.PROFESSOR]: [ROLES.HOD, ROLES.DEAN, ROLES.DIRECTOR],
  [ROLES.HOD]: [ROLES.DEAN, ROLES.DIRECTOR],
  [ROLES.DEAN]: [ROLES.DIRECTOR],
  [ROLES.DIRECTOR]: [],
  [ROLES.ADMIN]: []
};

const ROLE_DISPLAY_MAP = {
  admin: 'Admin',
  director: 'Director',
  dean: 'Dean',
  hod: 'HOD',
  professor: 'Professor',
  assistant_professor: 'Assistant Professor',
  student: 'Student'
};

function getRoleDisplay(role) {
  return ROLE_DISPLAY_MAP[role] || role;
}

const DEMO_USERS = [
  { name: 'Admin User', email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, role: ROLES.ADMIN, department: null, branch: null, permissions: ROLE_PERMISSIONS[ROLES.ADMIN] },
  { name: 'Director User', email: process.env.DIRECTOR_EMAIL, password: process.env.DIRECTOR_PASSWORD, role: ROLES.DIRECTOR, department: null, branch: null, permissions: ROLE_PERMISSIONS[ROLES.DIRECTOR] },
  { name: 'Dean User', email: process.env.DEAN_EMAIL, password: process.env.DEAN_PASSWORD, role: ROLES.DEAN, department: null, branch: null, permissions: ROLE_PERMISSIONS[ROLES.DEAN] },
  { name: 'HOD CSE', email: process.env.HOD_CSE_EMAIL, password: process.env.HOD_CSE_PASSWORD, role: ROLES.HOD, department: DEPARTMENTS.CSE, branch: null, permissions: ROLE_PERMISSIONS[ROLES.HOD] },
  { name: 'Professor CSE 1', email: process.env.PROF_CSE1_EMAIL, password: process.env.PROF_CSE1_PASSWORD, role: ROLES.PROFESSOR, department: DEPARTMENTS.CSE, branch: 'CSE-R', permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR] },
  { name: 'Professor CSE 2', email: process.env.PROF_CSE2_EMAIL, password: process.env.PROF_CSE2_PASSWORD, role: ROLES.PROFESSOR, department: DEPARTMENTS.CSE, branch: 'CSE-A.I', permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR] },
  { name: 'Assistant Professor CSE 1', email: process.env.ASST_CSE1_EMAIL, password: process.env.ASST_CSE1_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.CSE, branch: 'CSE-SF', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor CSE 2', email: process.env.ASST_CSE2_EMAIL, password: process.env.ASST_CSE2_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.CSE, branch: 'CSE-R', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor CSE 3', email: process.env.ASST_CSE3_EMAIL, password: process.env.ASST_CSE3_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.CSE, branch: 'CSE-R', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor CSE 4', email: process.env.ASST_CSE4_EMAIL, password: process.env.ASST_CSE4_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.CSE, branch: 'CSE-R', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'HOD ECE', email: process.env.HOD_ECE_EMAIL, password: process.env.HOD_ECE_PASSWORD, role: ROLES.HOD, department: DEPARTMENTS.ECE, branch: null, permissions: ROLE_PERMISSIONS[ROLES.HOD] },
  { name: 'Professor ECE 1', email: process.env.PROF_ECE1_EMAIL, password: process.env.PROF_ECE1_PASSWORD, role: ROLES.PROFESSOR, department: DEPARTMENTS.ECE, branch: 'ECE', permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR] },
  { name: 'Professor ECE 2', email: process.env.PROF_ECE2_EMAIL, password: process.env.PROF_ECE2_PASSWORD, role: ROLES.PROFESSOR, department: DEPARTMENTS.ECE, branch: 'ECE', permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR] },
  { name: 'Assistant Professor ECE 1', email: process.env.ASST_ECE1_EMAIL, password: process.env.ASST_ECE1_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.ECE, branch: 'ECE', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor ECE 2', email: process.env.ASST_ECE2_EMAIL, password: process.env.ASST_ECE2_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.ECE, branch: 'ECE', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor ECE 3', email: process.env.ASST_ECE3_EMAIL, password: process.env.ASST_ECE3_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.ECE, branch: 'ECE', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor ECE 4', email: process.env.ASST_ECE4_EMAIL, password: process.env.ASST_ECE4_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.ECE, branch: 'ECE', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'HOD EE', email: process.env.HOD_EE_EMAIL, password: process.env.HOD_EE_PASSWORD, role: ROLES.HOD, department: DEPARTMENTS.EE, branch: null, permissions: ROLE_PERMISSIONS[ROLES.HOD] },
  { name: 'Professor EE 1', email: process.env.PROF_EE1_EMAIL, password: process.env.PROF_EE1_PASSWORD, role: ROLES.PROFESSOR, department: DEPARTMENTS.EE, branch: 'EE', permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR] },
  { name: 'Professor EE 2', email: process.env.PROF_EE2_EMAIL, password: process.env.PROF_EE2_PASSWORD, role: ROLES.PROFESSOR, department: DEPARTMENTS.EE, branch: 'EE', permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR] },
  { name: 'Assistant Professor EE 1', email: process.env.ASST_EE1_EMAIL, password: process.env.ASST_EE1_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.EE, branch: 'EE', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor EE 2', email: process.env.ASST_EE2_EMAIL, password: process.env.ASST_EE2_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.EE, branch: 'EE', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor EE 3', email: process.env.ASST_EE3_EMAIL, password: process.env.ASST_EE3_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.EE, branch: 'EE', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor EE 4', email: process.env.ASST_EE4_EMAIL, password: process.env.ASST_EE4_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.EE, branch: 'EE', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'HOD ME', email: process.env.HOD_ME_EMAIL, password: process.env.HOD_ME_PASSWORD, role: ROLES.HOD, department: DEPARTMENTS.ME, branch: null, permissions: ROLE_PERMISSIONS[ROLES.HOD] },
  { name: 'Professor ME 1', email: process.env.PROF_ME1_EMAIL, password: process.env.PROF_ME1_PASSWORD, role: ROLES.PROFESSOR, department: DEPARTMENTS.ME, branch: 'ME', permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR] },
  { name: 'Professor ME 2', email: process.env.PROF_ME2_EMAIL, password: process.env.PROF_ME2_PASSWORD, role: ROLES.PROFESSOR, department: DEPARTMENTS.ME, branch: 'ME', permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR] },
  { name: 'Assistant Professor ME 1', email: process.env.ASST_ME1_EMAIL, password: process.env.ASST_ME1_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.ME, branch: 'ME', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor ME 2', email: process.env.ASST_ME2_EMAIL, password: process.env.ASST_ME2_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.ME, branch: 'ME', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor ME 3', email: process.env.ASST_ME3_EMAIL, password: process.env.ASST_ME3_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.ME, branch: 'ME', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor ME 4', email: process.env.ASST_ME4_EMAIL, password: process.env.ASST_ME4_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.ME, branch: 'ME', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'HOD CE', email: process.env.HOD_CE_EMAIL, password: process.env.HOD_CE_PASSWORD, role: ROLES.HOD, department: DEPARTMENTS.CE, branch: null, permissions: ROLE_PERMISSIONS[ROLES.HOD] },
  { name: 'Professor CE 1', email: process.env.PROF_CE1_EMAIL, password: process.env.PROF_CE1_PASSWORD, role: ROLES.PROFESSOR, department: DEPARTMENTS.CE, branch: 'CE', permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR] },
  { name: 'Professor CE 2', email: process.env.PROF_CE2_EMAIL, password: process.env.PROF_CE2_PASSWORD, role: ROLES.PROFESSOR, department: DEPARTMENTS.CE, branch: 'CE', permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR] },
  { name: 'Assistant Professor CE 1', email: process.env.ASST_CE1_EMAIL, password: process.env.ASST_CE1_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.CE, branch: 'CE', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor CE 2', email: process.env.ASST_CE2_EMAIL, password: process.env.ASST_CE2_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.CE, branch: 'CE', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor CE 3', email: process.env.ASST_CE3_EMAIL, password: process.env.ASST_CE3_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.CE, branch: 'CE', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor CE 4', email: process.env.ASST_CE4_EMAIL, password: process.env.ASST_CE4_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.CE, branch: 'CE', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'HOD CHE', email: process.env.HOD_CHE_EMAIL, password: process.env.HOD_CHE_PASSWORD, role: ROLES.HOD, department: DEPARTMENTS.CHE, branch: null, permissions: ROLE_PERMISSIONS[ROLES.HOD] },
  { name: 'Professor CHE 1', email: process.env.PROF_CHE1_EMAIL, password: process.env.PROF_CHE1_PASSWORD, role: ROLES.PROFESSOR, department: DEPARTMENTS.CHE, branch: 'CHE', permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR] },
  { name: 'Professor CHE 2', email: process.env.PROF_CHE2_EMAIL, password: process.env.PROF_CHE2_PASSWORD, role: ROLES.PROFESSOR, department: DEPARTMENTS.CHE, branch: 'CHE', permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR] },
  { name: 'Assistant Professor CHE 1', email: process.env.ASST_CHE1_EMAIL, password: process.env.ASST_CHE1_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.CHE, branch: 'CHE', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor CHE 2', email: process.env.ASST_CHE2_EMAIL, password: process.env.ASST_CHE2_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.CHE, branch: 'CHE', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor CHE 3', email: process.env.ASST_CHE3_EMAIL, password: process.env.ASST_CHE3_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.CHE, branch: 'CHE', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] },
  { name: 'Assistant Professor CHE 4', email: process.env.ASST_CHE4_EMAIL, password: process.env.ASST_CHE4_PASSWORD, role: ROLES.ASSISTANT_PROFESSOR, department: DEPARTMENTS.CHE, branch: 'CHE', permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR] }
].filter(u => u.email && u.password);

const ADMIN_EMAILS = DEMO_USERS.filter(u => u.role === ROLES.ADMIN).map(u => u.email.toLowerCase());
const STAFF_BY_EMAIL = new Map(DEMO_USERS.map(u => [u.email.toLowerCase().trim(), u]));

const synonymMap = {
  'eid': ['eid', 'ईद', 'bakrid', 'eid ul azha', 'bakri eid', 'ईद उल अज़हा', 'बकरीद'],
  'hostel': ['hostel', 'छात्रावास', 'होस्टल', 'dormitory', 'residence hall'],
  'holiday': ['holiday', 'छुट्टी', 'अवकाश', 'vacation', 'break', 'leave'],
  'exam': ['exam', 'examination', 'परीक्षा', 'test', 'assessment'],
  'fee': ['fee', 'fees', 'शुल्क', 'payment', 'tuition'],
  'admission': ['admission', 'admissions', 'प्रवेश', 'enrollment', 'registration'],
  'notice': ['notice', 'सूचना', 'announcement', 'notification', 'circular'],
  'result': ['result', 'परिणाम', 'marks', 'grades', 'scorecard'],
  'placement': ['placement', 'placements', 'campus placement', 'recruitment', 'job placement'],
  'scholarship': ['scholarship', 'छात्रवृत्ति', 'financial aid', 'grant', 'fellowship'],
  'internship': ['internship', 'internships', 'training', 'apprenticeship', 'intern'],
  'seminar': ['seminar', 'संगोष्ठी', 'workshop', 'presentation', 'guest lecture'],
  'syllabus': ['syllabus', 'पाठ्यक्रम', 'curriculum', 'course', 'study material'],
  'library': ['library', 'पुस्तकालय', 'reading room', 'study center'],
  'sports': ['sports', 'खेल', 'athletics', 'games', 'physical education'],
  'canteen': ['canteen', 'कैंटीन', 'cafeteria', 'mess', 'food court'],
  'rules': ['rules', 'नियम', 'regulations', 'guidelines', 'policy'],
  'timetable': ['timetable', 'time table', 'schedule', 'routine', 'class schedule'],
  'ramadan': ['ramadan', 'रमज़ान', 'ramzan', 'roza', 'iftaar'],
  'diwali': ['diwali', 'दीपावली', 'deepawali', 'festival of lights'],
  'holi': ['holi', 'होली', 'festival of colors'],
  'bakrid': ['bakrid', 'बकरीद', 'eid ul adha', 'eid ul azha', 'qurbani'],
  'christmas': ['christmas', 'क्रिसमस', 'xmas', 'christmas day'],
  'new year': ['new year', 'नया साल', 'new years', 'new year day'],
  'republic day': ['republic day', 'गणतंत्र दिवस', '26 january'],
  'independence day': ['independence day', 'स्वतंत्रता दिवस', '15 august'],
  'gandhi jayanti': ['gandhi jayanti', 'गांधी जयंती', '2 october']
};

const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','of','to','in','on','at','for','with',
  'about','me','my','mine','i','you','your','yours','we','us','our','ours','he','she','it','its',
  'they','them','their','this','that','these','those','and','or','but','if','then','than','so',
  'give','giving','gave','show','showing','find','finding','want','wanting','need','needing',
  'please','tell','telling','get','getting','can','could','would','should','do','does','did',
  'from','by','as','all','any','some','have','has','had','will','shall','not','no','yes',
  'there','here','what','which','who','whom','how','when','where','why'
]);

module.exports = {
  ROLES,
  DEPARTMENTS,
  CSE_BRANCHES,
  ALL_BRANCHES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  FACULTY_ROLES,
  COLLEGE_WIDE_ROLES,
  DIRECT_DELETE_ROLES,
  REQUEST_DELETE_ROLES,
  APPROVAL_CHAIN,
  ROLE_DISPLAY_MAP,
  getRoleDisplay,
  DEMO_USERS,
  ADMIN_EMAILS,
  STAFF_BY_EMAIL,
  synonymMap,
  STOP_WORDS
};