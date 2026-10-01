const ROLES = {
  ADMIN: 'admin',
  DIRECTOR: 'director',
  DEAN: 'dean',
  HOD: 'hod',
  PROFESSOR: 'professor',
  ASSISTANT_PROFESSOR: 'assistant_professor'
};

const DEPARTMENTS = {
  CSE: 'CSE',
  CSE_AI: 'CSE-AI',
  CSE_SF: 'CSE-SF',
  ECE: 'ECE',
  EE: 'EE',
  ME: 'ME',
  CE: 'CE',
  CHE: 'CHE'
};

const PERMISSIONS = {
  CREATE_DOCUMENT: 'create_document',
  EDIT_DOCUMENT: 'edit_document',
  DELETE_DOCUMENT: 'delete_document',
  APPROVE_DOCUMENT: 'approve_document',
  SUBMIT_DOCUMENT: 'submit_document',
  MANAGE_USERS: 'manage_users',
  VIEW_ALL_DEPARTMENTS: 'view_all_departments',
  PUBLISH_DOCUMENT: 'publish_document'
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.DELETE_DOCUMENT,
    PERMISSIONS.APPROVE_DOCUMENT,
    PERMISSIONS.SUBMIT_DOCUMENT,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_ALL_DEPARTMENTS,
    PERMISSIONS.PUBLISH_DOCUMENT
  ],
  [ROLES.DIRECTOR]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.APPROVE_DOCUMENT,
    PERMISSIONS.SUBMIT_DOCUMENT,
    PERMISSIONS.VIEW_ALL_DEPARTMENTS,
    PERMISSIONS.PUBLISH_DOCUMENT
  ],
  [ROLES.DEAN]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.APPROVE_DOCUMENT,
    PERMISSIONS.SUBMIT_DOCUMENT,
    PERMISSIONS.VIEW_ALL_DEPARTMENTS,
    PERMISSIONS.PUBLISH_DOCUMENT
  ],
  [ROLES.HOD]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.APPROVE_DOCUMENT,
    PERMISSIONS.SUBMIT_DOCUMENT,
    PERMISSIONS.PUBLISH_DOCUMENT
  ],
  [ROLES.PROFESSOR]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.SUBMIT_DOCUMENT
  ],
  [ROLES.ASSISTANT_PROFESSOR]: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.SUBMIT_DOCUMENT
  ]
};

const COLLEGE_WIDE_ROLES = [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.DEAN];

const DEMO_USERS = [
  {
    name: 'System Admin',
    email: 'ankushadmin@gmail.com',
    password: 'admin123',
    role: ROLES.ADMIN,
    department: null,
    permissions: ROLE_PERMISSIONS[ROLES.ADMIN]
  },
  {
    name: 'College Director',
    email: 'director@college.edu',
    password: 'director123',
    role: ROLES.DIRECTOR,
    department: null,
    permissions: ROLE_PERMISSIONS[ROLES.DIRECTOR]
  },
  {
    name: 'Dean Academics',
    email: 'dean@college.edu',
    password: 'dean123',
    role: ROLES.DEAN,
    department: null,
    permissions: ROLE_PERMISSIONS[ROLES.DEAN]
  },
  {
    name: 'HOD CSE',
    email: 'hod.cse@college.edu',
    password: 'hod123',
    role: ROLES.HOD,
    department: DEPARTMENTS.CSE,
    permissions: ROLE_PERMISSIONS[ROLES.HOD]
  },
  {
    name: 'Professor CSE',
    email: 'prof.cse@college.edu',
    password: 'prof123',
    role: ROLES.PROFESSOR,
    department: DEPARTMENTS.CSE,
    permissions: ROLE_PERMISSIONS[ROLES.PROFESSOR]
  },
  {
    name: 'Assistant Professor CSE',
    email: 'ap.cse@college.edu',
    password: 'ap123',
    role: ROLES.ASSISTANT_PROFESSOR,
    department: DEPARTMENTS.CSE,
    permissions: ROLE_PERMISSIONS[ROLES.ASSISTANT_PROFESSOR]
  }
];

module.exports = {
  ROLES,
  DEPARTMENTS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  COLLEGE_WIDE_ROLES,
  DEMO_USERS
};